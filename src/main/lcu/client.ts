import https from 'https'
import { getLockfileData, LockfileData } from './lockfile.js'

// 忽略 LCU 的自签名证书 (Node 原生 fetch 不支持 https.Agent，设置环境变量忽略全局 TLS)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

export class LcuClient {
  private lockdata: LockfileData
  private baseUrl: string
  private authHeader: string

  private constructor(lockdata: LockfileData) {
    this.lockdata = lockdata
    this.baseUrl = `https://127.0.0.1:${this.lockdata.port}`
    this.authHeader =
      'Basic ' + Buffer.from(`riot:${this.lockdata.password}`).toString('base64')
  }

  static async create(): Promise<LcuClient> {
    const lockdata = await getLockfileData()
    return new LcuClient(lockdata)
  }

  async request<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const options: RequestInit = {
      method,
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }

    if (body !== undefined) {
      options.body = JSON.stringify(body)
    }

    const res = await fetch(url, options)

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`LCU 请求失败 [${res.status}] ${endpoint}: ${text}`)
    }

    return res.json() as Promise<T>
  }

  get<T>(endpoint: string) {
    return this.request<T>('GET', endpoint)
  }

  post<T>(endpoint: string, body: unknown) {
    return this.request<T>('POST', endpoint, body)
  }
}
