import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface LockfileData {
  port: string;
  password: string;
  protocol: string;
}

export async function getLockfileData(): Promise<LockfileData> {
  let stdout: string;
  try {
    const result = await execAsync(
      'wmic process where "name=\'LeagueClientUx.exe\'" get commandline'
    );
    stdout = result.stdout;
  } catch (err) {
    throw new Error('无法执行 wmic 命令，请确保在 Windows 环境下运行该程序。');
  }

  const portMatch = stdout.match(/--app-port=([0-9]+)/);
  const passwordMatch = stdout.match(/--remoting-auth-token=([\w-_]+)/);

  if (!portMatch || !passwordMatch) {
    throw new Error(
      '找不到英雄联盟客户端进程 (LeagueClientUx.exe)，请确保客户端已启动并登录。'
    );
  }

  return { port: portMatch[1], password: passwordMatch[1], protocol: 'https' };
}
