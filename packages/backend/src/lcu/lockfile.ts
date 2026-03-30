import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export interface LockfileData {
  port: string;
  password: string;
  protocol: string;
}

// 常见的 League of Legends 安装路径，包括 WeGame 在国服的常见路径
const LOCKFILE_CANDIDATES = [
  'C:/Riot Games/League of Legends/lockfile',
  'D:/Riot Games/League of Legends/lockfile',
  'E:/Riot Games/League of Legends/lockfile',
  ...['C', 'D', 'E', 'F'].map((drive) => `${drive}:/WeGameApps/英雄联盟/LeagueClient/lockfile`),
  process.env.LEAGUE_PATH ? path.join(process.env.LEAGUE_PATH, 'lockfile') : '',
].filter(Boolean);

function findLockfile(): string | null {
  for (const candidate of LOCKFILE_CANDIDATES) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function parseLockfile(filePath: string): LockfileData {
  const content = fs.readFileSync(filePath, 'utf-8').trim();
  const [name, pid, port, password, protocol] = content.split(':');

  if (!name || !pid || !port || !password || !protocol) {
    throw new Error(`Lockfile 格式无效: ${content}`);
  }

  return { port, password, protocol };
}

export async function getLockfileData(): Promise<LockfileData> {
  // 1. 首选方案：尝试通过 WMI 获取正在运行进程的命令行参数（准确，应对多开）
  try {
    const result = await execAsync(
      'wmic process where "name=\'LeagueClientUx.exe\'" get commandline'
    );
    const stdout = result.stdout;

    const portMatch = stdout.match(/--app-port=([0-9]+)/);
    const passwordMatch = stdout.match(/--remoting-auth-token=([\w-_]+)/);

    // 能成功匹配，说明有权限读取
    if (portMatch && passwordMatch) {
      return { port: portMatch[1], password: passwordMatch[1], protocol: 'https' };
    }
  } catch (err) {
    // 忽略 WMI 错误，可能未安装 wmic 或出错
  }

  // 2. 降级方案：由于游戏可能是由 WeGame 等以管理员权限启动，
  // 导致普通权限下的 WMI 只返回空 CommandLine 或 null。我们降级到读文件。
  const lockfilePath = findLockfile();
  if (lockfilePath) {
    return parseLockfile(lockfilePath);
  }

  throw new Error(
    '找不到英雄联盟客户端进程连接信息：\n' +
    '1. 游戏由于由 WeGame 等以管理员权限启动，无权获取进程参数；并且\n' +
    '2. 在默认安装目录中找不到 lockfile。\n' +
    '请尝试以管理员身份运行此项目，或设置 LEAGUE_PATH 环境变量指向英雄联盟安装路径。'
  );
}
