import { LcuClient } from './src/lcu/client.js';

async function main() {
  const client = await LcuClient.create();
  try {
    const all = await client.get<any[]>('/lol-catalog/v1/items/CHAMPION');
    if (all.length > 0) {
      console.log('Champion:', all[0].name);
      console.log('Prices:', JSON.stringify(all[0].prices, null, 2));
      console.log('Sale:', JSON.stringify(all[0].sale, null, 2));
    }
  } catch (err: any) {
    console.error(err.message);
  }
}

main().catch(console.error);
