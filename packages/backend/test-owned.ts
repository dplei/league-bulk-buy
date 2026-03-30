import { LcuClient } from './src/lcu/client.js';

async function main() {
  const client = await LcuClient.create();
  
  const endpoints = [
    '/lol-champions/v1/owned-champions-minimal',
    '/lol-inventory/v1/inventory?inventoryTypes=["CHAMPION"]'
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
