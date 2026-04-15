import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { BulkBuyService } from './services/BulkBuyService'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    title: 'League Bulk Buy',
    frame: false,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// --- 业务服务实例 (与 IPC 解耦) ---
const bulkBuyService = new BulkBuyService()

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.leaguebulkbuy.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // --- bulk-buy: IPC Handlers (命名空间化) ---

  ipcMain.handle('bulk-buy:get-status', async () => {
    try {
      return await bulkBuyService.getStatus()
    } catch (err: any) {
      return { connected: false, error: err.message }
    }
  })

  ipcMain.handle('bulk-buy:get-champions', async () => {
    try {
      return await bulkBuyService.getChampions()
    } catch (err: any) {
      throw new Error(err.message)
    }
  })

  ipcMain.handle(
    'bulk-buy:purchase',
    async (_, items: Array<{ itemId: number; currency: 'IP' | 'RP'; cost: number }>) => {
      try {
        return await bulkBuyService.purchase(items)
      } catch (err: any) {
        throw new Error(err.message)
      }
    }
  )

  // --- Window frame controls (与 poro-auth 完全一致) ---
  ipcMain.on('window-minimize', () => {
    BrowserWindow.getFocusedWindow()?.minimize()
  })

  ipcMain.on('window-close', () => {
    BrowserWindow.getFocusedWindow()?.close()
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
