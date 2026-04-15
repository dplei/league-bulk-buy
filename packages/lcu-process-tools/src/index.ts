/**
 * @league-bulk-buy/lcu-process-tools
 *
 * Windows-only native process utilities for discovering running League of Legends
 * client processes and reading their full command-line arguments via
 * NtQueryInformationProcess(ProcessCommandLineInformation).
 *
 * Key advantage over the PEB memory-reading approach:
 *  - Only requires PROCESS_QUERY_LIMITED_INFORMATION (0x1000)
 *  - Does NOT require PROCESS_VM_READ or elevated privileges
 *  - Works even when the target process is started by WeGame with admin rights
 *
 * This is the same technique used by LeagueAkari's native C++ addon (getCommandLine1).
 * Only works on Windows x64, Windows 8.1+.
 */

import koffi from 'koffi';

// ---------------------------------------------------------------------------
// Win32 type aliases
// ---------------------------------------------------------------------------
koffi.alias('HANDLE', 'void *');
koffi.alias('PVOID', 'void *');
koffi.alias('DWORD', 'uint32_t');
koffi.alias('ULONG', 'uint32_t');
koffi.alias('NTSTATUS', 'int32_t');

// ---------------------------------------------------------------------------
// kernel32.dll imports
// ---------------------------------------------------------------------------
const kernel32 = koffi.load('kernel32.dll');

const OpenProcess = kernel32.func(
  'HANDLE __stdcall OpenProcess(DWORD dwDesiredAccess, int bInheritHandle, DWORD dwProcessId)'
);
const CloseHandle = kernel32.func('int __stdcall CloseHandle(HANDLE hObject)');
const CreateToolhelp32Snapshot = kernel32.func(
  'HANDLE __stdcall CreateToolhelp32Snapshot(DWORD dwFlags, DWORD th32ProcessID)'
);
const Process32First = kernel32.func(
  'int __stdcall Process32First(HANDLE hSnapshot, void *lppe)'
);
const Process32Next = kernel32.func(
  'int __stdcall Process32Next(HANDLE hSnapshot, void *lppe)'
);
const QueryFullProcessImageNameW = kernel32.func(
  'int __stdcall QueryFullProcessImageNameW(HANDLE hProcess, DWORD dwFlags, _Out_ void *lpExeName, _Inout_ DWORD *lpdwSize)'
);

// ---------------------------------------------------------------------------
// ntdll.dll imports
// ---------------------------------------------------------------------------
const ntdll = koffi.load('ntdll.dll');

const NtQueryInformationProcess = ntdll.func(
  'NTSTATUS __stdcall NtQueryInformationProcess(HANDLE ProcessHandle, ULONG ProcessInformationClass, PVOID ProcessInformation, ULONG ProcessInformationLength, ULONG *ReturnLength)'
);

// ---------------------------------------------------------------------------
// Structs
// ---------------------------------------------------------------------------

/**
 * PROCESSENTRY32 — ANSI variant (Process32First/Process32Next), 64-bit safe.
 */
const PROCESSENTRY32 = koffi.struct('PROCESSENTRY32', {
  dwSize: 'DWORD',
  cntUsage: 'DWORD',
  th32ProcessID: 'DWORD',
  th32DefaultHeapID: 'PVOID',
  th32ModuleID: 'DWORD',
  cntThreads: 'DWORD',
  th32ParentProcessID: 'DWORD',
  pcPriClassBase: 'int32_t',
  dwFlags: 'DWORD',
  szExeFile: 'char[260]',
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TH32CS_SNAPPROCESS = 0x00000002;

/**
 * Only needs PROCESS_QUERY_LIMITED_INFORMATION — no admin required!
 * Works even against processes running at higher integrity levels.
 */
const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;

/**
 * ProcessCommandLineInformation (class 60 / 0x3C):
 * Retrieves the command-line string of a process without needing to read
 * the target process's memory directly (no PROCESS_VM_READ required).
 * Available since Windows 8.1 / Server 2012 R2.
 *
 * Reference:
 *   https://learn.microsoft.com/en-us/windows/win32/api/winternl/nf-winternl-ntqueryinformationprocess
 */
const ProcessCommandLineInformation = 60;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns an array of PIDs for all processes matching the given executable name
 * (case-insensitive, e.g. "LeagueClientUx.exe").
 *
 * Uses CreateToolhelp32Snapshot which requires no elevated privileges.
 */
export function getPidsByName(exeName: string): number[] {
  const hSnapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
  if (!hSnapshot) return [];

  const pids: number[] = [];
  const targetLower = exeName.toLowerCase();

  const size = koffi.sizeof(PROCESSENTRY32);
  const buf = Buffer.alloc(size);
  buf.writeUInt32LE(size, 0); // dwSize must be set before first call

  let ok = Process32First(hSnapshot, buf);
  while (ok !== 0) {
    const entry = koffi.decode(buf, PROCESSENTRY32);
    const rawBytes = Buffer.from(entry.szExeFile as unknown as Uint8Array);
    const nullIdx = rawBytes.indexOf(0);
    const name = rawBytes.toString('utf8', 0, nullIdx !== -1 ? nullIdx : rawBytes.length);

    if (name.toLowerCase() === targetLower) {
      pids.push(entry.th32ProcessID);
    }

    ok = Process32Next(hSnapshot, buf);
  }

  CloseHandle(hSnapshot);
  return pids;
}

/**
 * Reads the full command-line string of a process by its PID using
 * NtQueryInformationProcess(ProcessCommandLineInformation = 60).
 *
 * This approach only requires PROCESS_QUERY_LIMITED_INFORMATION (0x1000),
 * so it works even when the target process runs at a higher integrity level
 * (e.g. launched by WeGame as Administrator) — **no admin mode needed**.
 *
 * This is the same technique as LeagueAkari's native addon `getCommandLine1`.
 *
 * Returns `null` if the process cannot be opened or queried.
 */
export function getCommandLine(pid: number): string | null {
  const hProcess = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
  if (!hProcess) return null;

  try {
    const returnLengthBuf = Buffer.alloc(4);

    // Step 1: Call with zero-length buffer to discover the required buffer size.
    //         The call returns a non-zero status (STATUS_INFO_LENGTH_MISMATCH)
    //         but still fills returnLengthBuf with the required byte count.
    NtQueryInformationProcess(
      hProcess,
      ProcessCommandLineInformation,
      null,
      0,
      returnLengthBuf
    );

    const requiredLen = returnLengthBuf.readUInt32LE(0);
    if (requiredLen === 0) return null;

    // Step 2: Second call with a properly sized buffer.
    const infoBuf = Buffer.alloc(requiredLen);
    const status: number = NtQueryInformationProcess(
      hProcess,
      ProcessCommandLineInformation,
      infoBuf,
      requiredLen,
      returnLengthBuf
    );

    if (status !== 0) return null;

    // The returned buffer contains a UNICODE_STRING structure:
    //   USHORT Length        [0..1]  — string byte length (UTF-16LE)
    //   USHORT MaximumLength [2..3]
    //   ULONG  Padding       [4..7]  — alignment padding on x64
    //   PVOID  Buffer        [8..15] — pointer (into our infoBuf at offset 16)
    // Immediately followed by the actual string data starting at byte offset 16.
    const strByteLen = infoBuf.readUInt16LE(0);
    if (strByteLen === 0) return null;

    return infoBuf.toString('utf16le', 16, 16 + strByteLen);
  } catch {
    return null;
  } finally {
    CloseHandle(hProcess);
  }
}

/**
 * Gets the full executable path for the given process PID using
 * QueryFullProcessImageNameW. Only requires PROCESS_QUERY_LIMITED_INFORMATION.
 *
 * Returns `null` if the process cannot be opened or queried.
 */
export function getProcessImagePath(pid: number): string | null {
  const hProcess = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
  if (!hProcess) return null;

  try {
    const buf = Buffer.alloc(1024);
    const sizeBuf = Buffer.alloc(4);
    sizeBuf.writeUInt32LE(512, 0); // max 512 wide chars = 1024 bytes

    if (QueryFullProcessImageNameW(hProcess, 0, buf, sizeBuf)) {
      const charCount = sizeBuf.readUInt32LE(0);
      return buf.toString('utf16le', 0, charCount * 2);
    }
    return null;
  } catch {
    return null;
  } finally {
    CloseHandle(hProcess);
  }
}
