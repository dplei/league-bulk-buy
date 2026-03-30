import { LcuClient } from './src/lcu/client.js';

async function main() {
  const client = await LcuClient.create();
  
  const endpoints = [
    '/lol-inventory/v1/wallet',
    '/lol-inventory/v1/wallet/IP',
    '/lol-inventory/v1/wallet/BE',
    '/lol-inventory/v1/wallet/RP',
    '/lol-inventory/v1/signedWallet',
    '/lol-inventory/v1/signedWallet/IP',
    '/lol-login/v1/wallet',
    '/lol-store/v1/wallet'
  ];

  for (const ep of endpoints) {
    try {
      console.log(`Trying ${ep}...`);
      const res = await client.get(ep);
      console.log(`Success ${ep}:`, res);
    } catch (err: any) {
      console.log(`Error ${ep}:`, err.message);
    }
  }
}

main().catch(console.error);
