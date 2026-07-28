import { User } from '../models/User.js';

/** Allow multiple phone-only donors without email (sparse unique index). */
export async function ensureSparseEmailIndex(): Promise<void> {
  const collection = User.collection;
  let indexes: Awaited<ReturnType<typeof collection.indexes>>;
  try {
    indexes = await collection.indexes();
  } catch (err: unknown) {
    const code = (err as { code?: number }).code;
    if (code === 26) {
      await collection.createIndex({ email: 1 }, { unique: true, sparse: true });
      return;
    }
    throw err;
  }
  const emailIndex = indexes.find((idx) => idx.key?.email === 1);
  if (emailIndex && !emailIndex.sparse) {
    await collection.dropIndex(emailIndex.name || 'email_1');
  }
  await collection.createIndex({ email: 1 }, { unique: true, sparse: true });
}
