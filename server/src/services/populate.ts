import { Trust } from '../models/Core.js';
import { Home } from '../models/Core.js';
import { User } from '../models/User.js';
import { Category, Subcategory, SubSubcategory, Need, Donation } from '../models/Operations.js';

type Doc = Record<string, unknown>;

export async function populateTrusts(docs: Doc[], field = 'trust_id', as = 'trusts') {
  const ids = [...new Set(docs.map((d) => d[field] as string).filter(Boolean))];
  const items = await Trust.find({ _id: { $in: ids } }).lean();
  const map = Object.fromEntries(items.map((t) => [t._id, { id: t._id, name: t.name, contact_email: t.contact_email, contact_phone: t.contact_phone, description: t.description, registration_number: t.registration_number }]));
  docs.forEach((d) => { if (d[field]) d[as] = map[d[field] as string] || null; });
}

export async function populateHomes(docs: Doc[], field = 'home_id', as = 'homes', fields?: string[]) {
  const ids = [...new Set(docs.map((d) => d[field] as string).filter(Boolean))];
  const items = await Home.find({ _id: { $in: ids } }).lean();
  const map = Object.fromEntries(items.map((h) => {
    const base: Record<string, unknown> = { id: h._id, name: h.name, city: h.city, state: h.state, image_url: h.image_url, description: h.description, trust_id: h.trust_id };
    if (fields) return [h._id, Object.fromEntries(fields.map((f) => [f, (h as Record<string, unknown>)[f]]))];
    return [h._id, base];
  }));
  docs.forEach((d) => { if (d[field]) d[as] = map[d[field] as string] || null; });
}

export async function populateProfiles(docs: Doc[], field = 'donor_id', as = 'profiles') {
  const ids = [...new Set(docs.map((d) => d[field] as string).filter(Boolean))];
  const items = await User.find({ _id: { $in: ids } }).select('-passwordHash').lean();
  const map = Object.fromEntries(items.map((p) => [p._id, { id: p._id, name: p.name, email: p.email, phone: p.phone, avatar_url: p.avatar_url }]));
  docs.forEach((d) => { if (d[field]) d[as] = map[d[field] as string] || null; });
}

export async function populatePrimarySocialWorkers(docs: Doc[], field = 'primary_warden_id', as = 'primary_social_worker') {
  const ids = [...new Set(docs.map((d) => d[field] as string).filter(Boolean))];
  if (ids.length === 0) return;
  const items = await User.find({ _id: { $in: ids } }).select('-passwordHash').lean();
  const map = Object.fromEntries(
    items.map((p) => [p._id, { id: p._id, name: p.name, email: p.email, phone: p.phone }]),
  );
  docs.forEach((d) => {
    if (d[field]) d[as] = map[d[field] as string] || null;
  });
}

export async function populateCategories(docs: Doc[], field = 'category_id', as = 'categories') {
  const ids = [...new Set(docs.map((d) => d[field] as string).filter(Boolean))];
  const items = await Category.find({ _id: { $in: ids } }).lean();
  const map = Object.fromEntries(items.map((c) => [c._id, { id: c._id, key: c.key, label: c.label, icon: c.icon }]));
  docs.forEach((d) => { if (d[field]) d[as] = map[d[field] as string] || null; });
}

export async function populateSubcategories(docs: Doc[], field = 'subcategory_id', as = 'subcategories') {
  const ids = [...new Set(docs.map((d) => d[field] as string).filter(Boolean))];
  const items = await Subcategory.find({ _id: { $in: ids } }).lean();
  const map = Object.fromEntries(items.map((s) => [s._id, { id: s._id, label: s.label }]));
  docs.forEach((d) => { if (d[field]) d[as] = map[d[field] as string] || null; });
}

export async function populateNeeds(docs: Doc[], field = 'need_id', as = 'needs', withCategory = false) {
  const ids = [...new Set(docs.map((d) => d[field] as string).filter(Boolean))];
  const items = await Need.find({ _id: { $in: ids } }).lean();
  const needDocs = items.map((n) => ({ ...n, id: n._id } as Doc));
  if (withCategory) await populateCategories(needDocs);
  const map = Object.fromEntries(needDocs.map((n) => [n.id, n]));
  docs.forEach((d) => { if (d[field]) d[as] = map[d[field] as string] || null; });
}

export async function applyIncludes(docs: Doc[], includes: string[]) {
  if (!includes.length) return;
  const tasks: Promise<void>[] = [];
  if (includes.includes('trusts')) tasks.push(populateTrusts(docs));
  if (includes.includes('homes')) tasks.push(populateHomes(docs));
  if (includes.includes('profiles')) tasks.push(populateProfiles(docs));
  if (includes.includes('primary_warden') || includes.includes('primary_social_worker')) {
    tasks.push(populatePrimarySocialWorkers(docs));
  }
  if (includes.includes('categories')) tasks.push(populateCategories(docs));
  if (includes.includes('subcategories')) tasks.push(populateSubcategories(docs));
  if (includes.includes('needs')) tasks.push(populateNeeds(docs, 'need_id', 'needs', includes.includes('categories')));
  await Promise.all(tasks);
}

export function parseIncludes(include?: string): string[] {
  if (!include) return [];
  return include.split(',').map((s) => s.trim()).filter(Boolean);
}

export function buildFilter(query: Record<string, unknown>, allowed: string[]): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  for (const key of allowed) {
    if (query[key] !== undefined && query[key] !== '') {
      const val = query[key] as string;
      if (val === 'true' || val === 'false') {
        filter[key] = val === 'true';
      } else if (val.includes(',')) filter[key] = { $in: val.split(',') };
      else filter[key] = val;
    }
  }
  for (const [key, value] of Object.entries(query)) {
    if (key.startsWith('gte_') && value) {
      filter[key.slice(4)] = { ...(filter[key.slice(4)] as object || {}), $gte: value };
    }
    if (key.startsWith('lte_') && value) {
      filter[key.slice(4)] = { ...(filter[key.slice(4)] as object || {}), $lte: value };
    }
    if (key.startsWith('lt_') && value) {
      filter[key.slice(3)] = { ...(filter[key.slice(3)] as object || {}), $lt: value };
    }
  }
  return filter;
}
