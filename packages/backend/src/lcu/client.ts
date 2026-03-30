import https from 'https'
import { getLockfileData, LockfileData } from './lockfile.js'

// 忽略 LCU 的自签名证书
const httpsAgent = new https.Agent({ rejectUnauthorized: false })

export class LcuClient {
  private lockdata: LockfileData
  private baseUrl: string
  private authHeader: string

  constructor() {
    this.lockdata = getLockfileData()
    this.baseUrl = `https://127.0.0.1:${this.lockdata.port}`
    this.authHeader =
      'Basic ' + Buffer.from(`riot:${this.lockdata.password}`).toString('base64')
  }

  static create(): LcuClient {
    return new LcuClient()
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
      // @ts-expect-error - Node.js fetch支持agent
      agent: httpsAgent,
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
