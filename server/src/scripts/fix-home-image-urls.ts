/**
 * Repair broken home image URLs and orphaned uploads saved to bucket root.
 * Run on server: node server/dist/scripts/fix-home-image-urls.js
 */
import { connectDatabase } from '../config/database.js';
import { Home, HomePhoto } from '../models/Core.js';
import { env } from '../config/env.js';
import fs from 'fs';
import path from 'path';

const BROKEN_PREFIX = 'https:/.msctrustcrm.com/api/uploads/home-photos/';
const FIXED_PREFIX = `${env.publicUploadUrl}/home-photos/`;

function urlToDiskPath(imageUrl: string): string | null {
  const marker = '/home-photos/';
  const idx = imageUrl.indexOf(marker);
  if (idx === -1) return null;
  return path.join(env.uploadDir, 'home-photos', imageUrl.slice(idx + marker.length));
}

function moveToHomeFolder(homeId: string, fileName: string): string {
  const rootDir = path.join(env.uploadDir, 'home-photos');
  const src = path.join(rootDir, fileName);
  const destDir = path.join(rootDir, homeId);
  const dest = path.join(destDir, fileName);
  fs.mkdirSync(destDir, { recursive: true });
  if (fs.existsSync(src)) fs.renameSync(src, dest);
  return `${homeId}/${fileName}`;
}

async function repairBrokenUrls() {
  const homes = await Home.find({
    image_url: { $regex: /^https:\/\.msctrustcrm\.com\/api\/uploads\/home-photos\// },
  }).lean();

  for (const home of homes) {
    const brokenUrl = home.image_url!;
    const relativePath = brokenUrl.replace(BROKEN_PREFIX, '');
    let nextUrl = brokenUrl.replace(BROKEN_PREFIX, FIXED_PREFIX);
    const diskPath = path.join(env.uploadDir, 'home-photos', relativePath);
    if (!fs.existsSync(diskPath)) {
      const homeDir = path.join(env.uploadDir, 'home-photos', home._id);
      if (fs.existsSync(homeDir)) {
        const files = fs
          .readdirSync(homeDir)
          .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
          .map((name) => ({ name, mtime: fs.statSync(path.join(homeDir, name)).mtimeMs }))
          .sort((a, b) => b.mtime - a.mtime);
        if (files[0]) {
          nextUrl = `${env.publicUploadUrl}/home-photos/${home._id}/${files[0].name}`;
        }
      }
    }
    await Home.updateOne({ _id: home._id }, { $set: { image_url: nextUrl } });
    console.log(`${home.name}: ${brokenUrl} -> ${nextUrl}`);
  }
}

async function repairMissingFilesFromOrphans() {
  const rootDir = path.join(env.uploadDir, 'home-photos');
  if (!fs.existsSync(rootDir)) return;

  const orphanFiles = fs
    .readdirSync(rootDir, { withFileTypes: true })
    .filter((e) => e.isFile() && /\.(jpg|jpeg|png|webp)$/i.test(e.name))
    .map((e) => {
      const full = path.join(rootDir, e.name);
      return { name: e.name, mtime: fs.statSync(full).mtimeMs, full };
    });

  if (orphanFiles.length === 0) return;

  const homes = await Home.find({}).lean();

  for (const home of homes) {
    const diskPath = home.image_url ? urlToDiskPath(home.image_url) : null;
    const hasValidImage = diskPath ? fs.existsSync(diskPath) : false;
    const existingPhotos = await HomePhoto.countDocuments({ home_id: home._id });
    if (hasValidImage && existingPhotos > 0) continue;

    const anchor = new Date(home.updated_at || home.created_at).getTime();
    const windowMs = 15 * 60 * 1000;
    const matches = orphanFiles
      .filter((f) => Math.abs(f.mtime - anchor) <= windowMs)
      .sort((a, b) => a.mtime - b.mtime);

    if (matches.length === 0) continue;

    console.log(`Repairing ${home.name} with ${matches.length} orphan file(s)`);

    const [main, ...gallery] = matches;
    const mainRel = moveToHomeFolder(home._id, main.name);
    const mainUrl = `${env.publicUploadUrl}/home-photos/${mainRel}`;
    await Home.updateOne({ _id: home._id }, { $set: { image_url: mainUrl } });
    orphanFiles.splice(
      orphanFiles.findIndex((f) => f.name === main.name),
      1,
    );

    if (!hasValidImage) {
      console.log(`  main -> ${mainUrl}`);
    }

    let order = existingPhotos;
    for (const file of gallery) {
      const rel = moveToHomeFolder(home._id, file.name);
      const url = `${env.publicUploadUrl}/home-photos/${rel}`;
      const exists = await HomePhoto.findOne({ home_id: home._id, image_url: url });
      if (!exists) {
        await HomePhoto.create({
          home_id: home._id,
          image_url: url,
          sort_order: order,
          is_primary: order === 0,
          caption: null,
        });
        order++;
        console.log(`  gallery -> ${url}`);
      }
      const idx = orphanFiles.findIndex((f) => f.name === file.name);
      if (idx >= 0) orphanFiles.splice(idx, 1);
    }
  }
}

async function main() {
  await connectDatabase();
  await repairBrokenUrls();
  await repairMissingFilesFromOrphans();
  console.log('Home image repair complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
