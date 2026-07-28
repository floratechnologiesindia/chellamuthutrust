import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';

const BUCKETS = ['home-photos', 'completion-reports', 'need-attachments', 'home-content', 'resident-photos'] as const;
export type BucketName = typeof BUCKETS[number];

export function ensureUploadDirs() {
  for (const bucket of BUCKETS) {
    const dir = path.join(env.uploadDir, bucket);
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function getPublicUrl(bucket: BucketName, filePath: string): string {
  return `${env.publicUploadUrl}/${bucket}/${filePath}`;
}

export function resolveFilePath(bucket: BucketName, url: string): string | null {
  const marker = `/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

export async function deleteFile(bucket: BucketName, url: string): Promise<boolean> {
  const filePath = resolveFilePath(bucket, url);
  if (!filePath) return false;
  const fullPath = path.join(env.uploadDir, bucket, filePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    return true;
  }
  return false;
}

export { BUCKETS };
