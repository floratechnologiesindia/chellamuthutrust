import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { env } from '../config/env.js';
import { BUCKETS, BucketName, getPublicUrl, deleteFile } from '../services/storage.service.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const bucket = (req.params.bucket || 'need-attachments') as BucketName;
    if (!BUCKETS.includes(bucket)) return cb(new AppError('Invalid bucket') as never, '');
    cb(null, path.join(env.uploadDir, bucket));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${Date.now()}-${uuidv4()}${ext}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

function finalizeUpload(bucket: BucketName, tempPath: string, targetPath: string): string {
  const dest = path.join(env.uploadDir, bucket, targetPath);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.renameSync(tempPath, dest);
  return targetPath;
}

router.post('/:bucket', authenticate, upload.single('file'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const bucket = req.params.bucket as BucketName;
  if (!req.file) throw new AppError('No file uploaded');
  const filePath = req.body.path
    ? finalizeUpload(bucket, req.file.path, String(req.body.path))
    : req.file.filename;
  const publicUrl = getPublicUrl(bucket, filePath);
  res.json({ path: filePath, publicUrl, public_url: publicUrl });
}));

router.post('/:bucket/upload', authenticate, upload.single('file'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const bucket = req.params.bucket as BucketName;
  if (!req.file) throw new AppError('No file uploaded');

  let filePath: string;
  if (req.body.path) {
    filePath = finalizeUpload(bucket, req.file.path, String(req.body.path));
  } else {
    const folder = req.body.folder || '';
    filePath = folder ? `${folder}/${req.file.filename}` : req.file.filename;
    if (folder) {
      finalizeUpload(bucket, req.file.path, filePath);
    }
  }

  const publicUrl = getPublicUrl(bucket, filePath);
  res.json({ path: filePath, publicUrl, public_url: publicUrl });
}));

router.delete('/:bucket', authenticate, asyncHandler(async (req, res: Response) => {
  const bucket = req.params.bucket as BucketName;
  const { url, paths } = req.body;
  if (url) {
    await deleteFile(bucket, url);
  }
  if (paths?.length) {
    for (const p of paths) await deleteFile(bucket, `${env.publicUploadUrl}/${bucket}/${p}`);
  }
  res.json({ success: true });
}));

export default router;
