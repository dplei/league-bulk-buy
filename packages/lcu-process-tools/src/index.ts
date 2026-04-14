/**
 * @league-bulk-buy/lcu-process-tools
 *
 * Windows-only native process utilities for discovering running League of Legends
 * client processes and reading their full command-line arguments directly from the
 * PEB (Process Environment Block) via NtQueryInformationProcess.
 *
 * This replaces the need for any precompiled C++ Node.js addon. It uses `koffi`
 * (a pure-JS FFI library) to call kernel32.dll / ntdll.dll directly, bypassing:
 *  - WMI CommandLine truncation at 8192 chars (common with WeGame installs)
 *  - WMI access denial when the process was started with elevated privileges
 *
 * Only works on Windows x64.
 */

import koffi from 'koffi';

// ---------------------------------------------------------------------------
// Win32 type aliases
// ---------------------------------------------------------------------------
koffi.alias('HANDLE', 'void *');
koffi.alias('PVOID', 'void *');
koffi.alias('DWORD', 'uint32_t');
koffi.alias('ULONG', 'uint32_t');
koffi.alias('USHORT', 'uint16_t');
koffi.alias('NTSTATUS', 'int32_t');

// ---------------------------------------------------------------------------
// kernel32.dll imports
// ---------------------------------------------------------------------------
const kernel32 = koffi.load('kernel32.dll');

const OpenProcess = kernel32.func(
  'HANDLE __stdcall OpenProcess(DWORD dwDesiredAccess, int bInheritHandle, DWORD dwProcessId)'
);
const CloseHandle = kernel32.func('int __stdcall CloseHandle(HANDLE hObject)');
const ReadProcessMemory = kernel32.func(
  'int __stdcall ReadProcessMemory(HANDLE hProcess, PVOID lpBaseAddress, void *lpBuffer, size_t nSize, size_t *lpNumberOfBytesRead)'
);
const CreateToolhelp32Snapshot = kernel32.func(
  'HANDLE __stdcall CreateToolhelp32Snapshot(DWORD dwFlags, DWORD th32ProcessID)'
);
const Process32First = kernel32.func(
  'int __stdcall Process32First(HANDLE hSnapshot, void *lppe)'
);
const Process32Next = kernel32.func(
  'int __stdcall Process32Next(HANDLE hSnapshot, void *lppe)'
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
 * PROCESS_BASIC_INFORMATION (64-bit layout)
 * https://learn.microsoft.com/en-us/windows/win32/api/winternl/nf-winternl-ntqueryinformationprocess
 */
const PROCESS_BASIC_INFORMATION = koffi.struct('PROCESS_BASIC_INFORMATION', {
  Reserved1: 'PVOID',
  PebBaseAddress: 'PVOID',
  Reserved2: 'PVOID[2]',
  UniqueProcessId: 'ULONG',
  Reserved3: 'PVOID',
});

/**
 * PROCESSENTRY32W — 64-bit safe (szExeFile is always char[260] in ANSI variant)
 * We use the ANSI variant (Process32First/Process32Next) for simplicity.
 */
const PROCESSENTRY32_SIZE = 4 + 4 + 4 + 8 + 4 + 4 + 4 + 4 + 4 + 260; // 304 bytes
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
const PROCESS_QUERY_INFORMATION = 0x0400;
const PROCESS_VM_READ = 0x0010;
const ProcessBasicInformation = 0;

// PEB offsets (x64 Windows 10/11)
const PEB_OFFSET_RTL_PARAMS = 0x20n; // RTL_USER_PROCESS_PARAMETERS* pointer
const RTL_PARAMS_OFFSET_CMDLINE = 0x70n; // UNICODE_STRING CommandLine

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
    // szExeFile is a C string (null-terminated) decoded as Buffer/array
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
 * Reads the full command-line string of a process by its PID directly from
 * the PEB, bypassing WMI. This handles:
 *  - WeGame command lines > 8192 characters (not truncated)
 *  - Processes started with elevated privileges (as long as we also have
 *    appropriate read access — run as admin if needed)
 *
 * Returns `null` if the process cannot be opened or read.
 */
export function getCommandLine(pid: number): string | null {
  const hProcess = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, 0, pid);
  if (!hProcess) return null;

  try {
    // Step 1: NtQueryInformationProcess → get PEB base address
    const pbiSize = koffi.sizeof(PROCESS_BASIC_INFORMATION);
    const pbiBuffer = Buffer.alloc(pbiSize);
    const returnLength = [0];

    const status: number = NtQueryInformationProcess(
      hProcess,
      ProcessBasicInformation,
      pbiBuffer,
      pbiSize,
      returnLength
    );

    if (status !== 0) return null;

    const pbi = koffi.decode(pbiBuffer, PROCESS_BASIC_INFORMATION);
    if (!pbi?.PebBaseAddress) return null;

    const pebBase: bigint = koffi.address(pbi.PebBaseAddress);

    // Step 2: Read PEB → RTL_USER_PROCESS_PARAMETERS pointer
    const rtlParamsPtrBuf = Buffer.alloc(8);
    if (!ReadProcessMemory(hProcess, pebBase + PEB_OFFSET_RTL_PARAMS, rtlParamsPtrBuf, 8, null)) {
      return null;
    }
    const pRtlParams = rtlParamsPtrBuf.readBigUInt64LE(0);

    // Step 3: Read RTL_USER_PROCESS_PARAMETERS → CommandLine (UNICODE_STRING)
    // UNICODE_STRING layout: Length (USHORT, 2), MaximumLength (USHORT, 2), [4 bytes pad], Buffer (PVOID/8)
    const unicodeStringBuf = Buffer.alloc(16);
    if (
      !ReadProcessMemory(hProcess, pRtlParams + RTL_PARAMS_OFFSET_CMDLINE, unicodeStringBuf, 16, null)
    ) {
      return null;
    }

    const cmdLineLength = unicodeStringBuf.readUInt16LE(0); // in bytes (UTF-16LE)
    const cmdLinePtr = unicodeStringBuf.readBigUInt64LE(8);

    if (cmdLineLength === 0 || cmdLinePtr === 0n) return null;

    // Step 4: Read the actual command line string
    const cmdBuf = Buffer.alloc(cmdLineLength);
    if (!ReadProcessMemory(hProcess, cmdLinePtr, cmdBuf, cmdLineLength, null)) {
      return null;
    }

    return cmdBuf.toString('utf16le');
  } catch {
    return null;
  } finally {
    CloseHandle(hProcess);
  }
}
