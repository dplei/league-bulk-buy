# @league-bulk-buy/lcu-process-tools

Windows native process utilities for discovering the **League of Legends Client (LCU)** and reading its full command-line arguments — **no C++ addon, no admin rights required**.

## How it works

Uses `NtQueryInformationProcess(ProcessCommandLineInformation = 60)` via [koffi](https://koffi.dev/) (a pure-JS FFI library).

**Key advantage over PEB memory-reading approaches:**

| Requirement | PEB approach | This package |
|-------------|-------------|--------------|
| `PROCESS_VM_READ` | ✅ Required | ❌ Not needed |
| Admin / elevated | Sometimes | ❌ Never |
| Works vs WeGame-elevated process | ❌ Often fails | ✅ Always works |
| Native addon (.node) | Often | ❌ Pure JS FFI |

> **Platform:** Windows x64 only (Windows 8.1 / Server 2012 R2+).

## Installation

```bash
npm install @league-bulk-buy/lcu-process-tools
```

> Requires Node.js ≥ 18 on Windows.

## Usage

```ts
import { getPidsByName, getCommandLine, getProcessImagePath } from '@league-bulk-buy/lcu-process-tools';

// 1. Find all PIDs for a process name
const pids = getPidsByName('LeagueClientUx.exe');
console.log('PIDs:', pids);

// 2. Get the full command-line string (contains --remoting-auth-token, --app-port, etc.)
for (const pid of pids) {
  const cmdline = getCommandLine(pid);
  console.log(`PID ${pid} cmdline:`, cmdline);
}

// 3. Get the executable path
for (const pid of pids) {
  const imagePath = getProcessImagePath(pid);
  console.log(`PID ${pid} path:`, imagePath);
}
```

### Parsing LCU auth info

```ts
import { getPidsByName, getCommandLine } from '@league-bulk-buy/lcu-process-tools';

function getLcuCredentials() {
  const pids = getPidsByName('LeagueClientUx.exe');
  for (const pid of pids) {
    const cmdline = getCommandLine(pid);
    if (!cmdline) continue;

    const port  = cmdline.match(/--app-port=(\d+)/)?.[1];
    const token = cmdline.match(/--remoting-auth-token=([\w-]+)/)?.[1];
    if (port && token) return { pid, port: Number(port), token };
  }
  return null;
}
```

## API

### `getPidsByName(exeName: string): number[]`

Returns all PIDs whose process image name matches `exeName` (case-insensitive).  
Uses `CreateToolhelp32Snapshot` — no privileges required.

### `getCommandLine(pid: number): string | null`

Returns the full command-line string for the given PID.  
Uses `NtQueryInformationProcess(ProcessCommandLineInformation)` — only needs `PROCESS_QUERY_LIMITED_INFORMATION (0x1000)`.  
Returns `null` on failure.

### `getProcessImagePath(pid: number): string | null`

Returns the full executable path for the given PID.  
Uses `QueryFullProcessImageNameW` — only needs `PROCESS_QUERY_LIMITED_INFORMATION`.  
Returns `null` on failure.

## Credits

The `NtQueryInformationProcess` technique (class 60) is the same used by [LeagueAkari](https://github.com/Hanxven/LeagueAkari)'s native C++ addon `getCommandLine1`. This package reimplements it in pure JavaScript via koffi.

## License

MIT
