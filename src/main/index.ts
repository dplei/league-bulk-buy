import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { LcuApi } from './lcu/api';
import { LcuClient } from './lcu/client';

let mainWindow: BrowserWindow | null = null;
let lcuApi: LcuApi | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      enableRemoteModule: false
    }
  });

  const isDev = process.env.VITE_DEV_SERVER_URL !== undefined;
  const url = isDev
    ? 'http://localhost:5173'
    : join(__dirname, '../renderer/index.html');

  if (isDev) {
    mainWindow.loadURL(url);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(url);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function getLcuApi(): LcuApi {
  if (!lcuApi) {
    throw new Error('LCU 未初始化');
  }
  return lcuApi;
}

function registerIpcHandlers(): void {
  // 获取游戏状态（玩家信息、钱包）
  ipcMain.handle('lcu:status', async () => {
    try {
      const api = getLcuApi();
      const summoner = await api.getSummoner();
      const wallet = await api.getWallet();
      return {
        connected: true,
        summoner,
        wallet
      };
    } catch (error) {
      console.error('Failed to get status:', error);
      throw error;
    }
  });

  // 获取英雄列表
  ipcMain.handle('lcu:champions', async () => {
    try {
      const api = getLcuApi();
      const catalog = await api.getChampionCatalog();
      const ownedIds = await api.getOwnedChampionIds();

      // 转换为前端格式
      return catalog.map((item) => {
        const owned = ownedIds.includes(item.itemId);
        const ipPrice =
          item.prices?.find((p) => p.currency === 'IP')?.cost ?? null;
        const rpPrice =
          item.prices?.find((p) => p.currency === 'RP')?.cost ?? null;

        return {
          itemId: item.itemId,
          name: item.name,
          description: item.description,
          ipPrice,
          rpPrice,
          saleIpPrice: item.sale?.purchasePrice?.ip ?? null,
          saleRpPrice: item.sale?.purchasePrice?.rp ?? null,
          onSale: !!item.sale?.active,
          owned,
          purchasable: !owned,
          tags: item.tags ?? []
        };
      });
    } catch (error) {
      console.error('Failed to get champions:', error);
      throw error;
    }
  });

  // 购买英雄
  ipcMain.handle('lcu:purchase', async (event, payload) => {
    try {
      const api = getLcuApi();
      const purchaseItems = payload.items.map((item: any) => ({
        itemKey: {
          inventoryType: 'CHAMPION',
          itemId: item.itemId
        },
        purchaseCurrencyInfo: {
          currencyType: item.currency,
          price: item.cost,
          purchasable: true
        },
        quantity: 1
      }));

      await api.purchaseItems(purchaseItems);
      console.log(`Successfully purchased ${payload.items.length} champions`);
    } catch (error) {
      console.error('Failed to purchase champions:', error);
      throw error;
    }
  });
}

async function initializeLcu(): Promise<void> {
  try {
    console.log('正在初始化 LCU 客户端...');
    const lcuClient = await LcuClient.create();
    lcuApi = new LcuApi(lcuClient);
    console.log('LCU 客户端初始化成功');

    // 注册 IPC handlers
    registerIpcHandlers();
  } catch (error) {
    console.error('LCU 初始化失败:', error);
    // 暂时不退出，允许应用继续运行（UI 会显示错误）
  }
}

app.on('ready', async () => {
  await initializeLcu();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
