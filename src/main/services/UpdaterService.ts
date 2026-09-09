import { app, BrowserWindow, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'

export type UpdateStatus =
  | { state: 'checking' }
  | { state: 'not-available'; version: string }
  | { state: 'available'; version: string; notes: Array<{ version: string; note: string }> }
  | { state: 'downloading'; percent: number }
  | { state: 'ready'; version: string }
  | { state: 'error'; message: string }
  | { state: 'dev' }

/** GitHub 的更新说明是 HTML（来自 releases.atom），转成纯文本再交给渲染层，避免 v-html */
function htmlToText(html: string): string {
  return html
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/(li|p|h\d|div|ul|ol)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function normalizeNotes(
  notes: string | Array<{ version: string; note: string | null }> | null | undefined,
  version: string
): Array<{ version: string; note: string }> {
  if (!notes) return []
  if (typeof notes === 'string') return [{ version, note: htmlToText(notes) }]
  return notes
    .map((n) => ({ version: n.version, note: htmlToText(n.note ?? '') }))
    .filter((n) => n.note.length > 0)
}

/**
 * 自动更新：启动时检查 GitHub Release，用户确认后再下载，下载完成后可重启安装。
 * 更新日志取自 release 正文（workflow 里由 generate_release_notes 自动生成）。
 */
export function setupUpdater(): void {
  autoUpdater.autoDownload = false
  autoUpdater.fullChangelog = true

  const send = (status: UpdateStatus): void => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('updater:status', status)
    }
  }

  autoUpdater.on('checking-for-update', () => send({ state: 'checking' }))
  autoUpdater.on('update-available', (info) =>
    send({
      state: 'available',
      version: info.version,
      notes: normalizeNotes(info.releaseNotes, info.version)
    })
  )
  autoUpdater.on('update-not-available', (info) =>
    send({ state: 'not-available', version: info.version })
  )
  autoUpdater.on('download-progress', (p) =>
    send({ state: 'downloading', percent: Math.round(p.percent) })
  )
  autoUpdater.on('update-downloaded', (info) => send({ state: 'ready', version: info.version }))
  autoUpdater.on('error', (err) => send({ state: 'error', message: err.message }))

  ipcMain.handle('updater:get-version', () => app.getVersion())

  ipcMain.handle('updater:check', async () => {
    // 开发环境没有 app-update.yml，electron-updater 会直接抛错
    if (!app.isPackaged) {
      send({ state: 'dev' })
      return { ok: false, message: '开发模式不检查更新' }
    }
    try {
      await autoUpdater.checkForUpdates()
      return { ok: true }
    } catch (err: any) {
      send({ state: 'error', message: err.message })
      return { ok: false, message: err.message }
    }
  })

  ipcMain.handle('updater:download', async () => {
    try {
      await autoUpdater.downloadUpdate()
      return { ok: true }
    } catch (err: any) {
      send({ state: 'error', message: err.message })
      return { ok: false, message: err.message }
    }
  })

  ipcMain.handle('updater:install', () => autoUpdater.quitAndInstall())

  // 等首个窗口加载完成再检查，否则事件会先于渲染层的监听发出
  if (app.isPackaged) {
    BrowserWindow.getAllWindows()[0]?.webContents.once('did-finish-load', () => {
      autoUpdater.checkForUpdates().catch((err) => {
        send({ state: 'error', message: err.message })
      })
    })
  }
}
