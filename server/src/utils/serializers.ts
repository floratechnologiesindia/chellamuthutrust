export function toApiDoc<T = any>(doc: T | null): Record<string, unknown> | null {
  if (!doc) return null;
  const obj = typeof (doc as any).toObject === 'function' ? (doc as any).toObject({ virtuals: true }) : { ...(doc as any) };
  const { _id, __v, passwordHash, resetToken, resetTokenExpiry, ...rest } = obj as Record<string, unknown>;
  if (rest.notes && !rest.note) rest.note = rest.notes;
  return { id: String(_id), ...rest };
}

export function toApiDocs(docs: any[]): Record<string, unknown>[] {
  return docs.map((d) => toApiDoc(d)!).filter(Boolean);
}

export function pickFields(obj: Record<string, unknown>, fields?: string): Record<string, unknown> {
  if (!fields || fields === '*') return obj;
  const keys = fields.split(',').map((k) => k.trim());
  const result: Record<string, unknown> = { id: obj.id };
  for (const key of keys) {
    if (key in obj) result[key] = obj[key];
  }
  return result;
}
