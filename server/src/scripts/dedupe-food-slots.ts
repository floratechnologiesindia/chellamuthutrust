import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { dedupeAllFoodSlots } from '../services/foodSlot.service.js';

async function main() {
  await connectDatabase();
  const result = await dedupeAllFoodSlots();
  console.log(`Deduped ${result.cells} cells, removed ${result.removed} orphan slot records`);
  await disconnectDatabase();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
