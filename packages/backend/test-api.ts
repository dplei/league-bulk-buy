import { LcuClient } from './src/lcu/client.js';

async function main() {
  const client = await LcuClient.create();
  
  const endpoints = [
    '/lol-inventory/v1/inventory?inventoryTypes=CHAMPION',
    '/lol-store/v1/catalog?inventoryType=CHAMPION',
    '/lol-catalog/v1/items/CHAMPION'
  ];

  for (const ep of endpoints) {
    try {
      console.log(`Trying GET ${ep}...`);
      const res = await client.get(ep) as any;
      console.log(`Success GET ${ep}: ${Array.isArray(res) ? res.length + ' items' : typeof res}`);
    } catch (err: any) {
      console.log(`Error GET ${ep}:`, err.message);
    }
  }
}

main().catch(console.error);
