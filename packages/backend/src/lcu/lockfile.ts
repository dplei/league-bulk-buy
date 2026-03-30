import fs from 'fs'
import path from 'path'

export interface LockfileData {
  name: string
  pid: string
  port: string
  password: string
  protocol: string
}

// 常见的 League of Legends 安装路径
const LOCKFILE_CANDIDATES = [
  'C:/Riot Games/League of Legends/lockfile',
  'D:/Riot Games/League of Legends/lockfile',
  'E:/Riot Games/League of Legends/lockfile',
  process.env.LEAGUE_PATH ? path.join(process.env.LEAGUE_PATH, 'lockfile') : '',
].filter(Boolean)

export function findLockfile(): string | null {
  for (const candidate of LOCKFILE_CANDIDATES) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }
  return null
}

export function parseLockfile(filePath: string): LockfileData {
  const content = fs.readFileSync(filePath, 'utf-8').trim()
  const [name, pid, port, password, protocol] = content.split(':')

  if (!name || !pid || !port || !password || !protocol) {
    throw new Error(`Lockfile 格式无效: ${content}`)
  }

  return { name, pid, port, password, protocol }
}

export function getLockfileData(): LockfileData {
  const lockfilePath = findLockfile()
  if (!lockfilePath) {
    throw new Error(
      '找不到 League of Legends 的 lockfile，请确保客户端已启动。\n' +
      '如果安装在非默认路径，请设置环境变量 LEAGUE_PATH'
    )
  }
  return parseLockfile(lockfilePath)
}
