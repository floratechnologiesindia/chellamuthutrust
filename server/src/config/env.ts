import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Project root .env (when running `npm run dev:api` from repo root)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
// server/.env fallback
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const razorpayConfigured = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

export const env = {
  nodeEnv,
  port: parseInt(process.env.PORT || '3001', 10),
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/chellamuthu',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:8080',
  uploadDir: process.env.UPLOAD_DIR || path.resolve(__dirname, '../../uploads'),
  publicUploadUrl: process.env.PUBLIC_UPLOAD_URL || 'http://localhost:3001/uploads',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  razorpayConfigured,
  gmailUser: process.env.GMAIL_USER || '',
  gmailAppPassword: process.env.GMAIL_APP_PASSWORD || '',
  watiApiEndpoint: process.env.WATI_API_ENDPOINT || '',
  watiAccessToken: process.env.WATI_ACCESS_TOKEN || '',
  showDevOtp: nodeEnv === 'development' || process.env.SHOW_DEV_OTP === 'true',
  /** Enabled in dev, when MANUAL_PAYMENTS=true, or until Razorpay keys are configured */
  manualPaymentsEnabled:
    process.env.MANUAL_PAYMENTS === 'true' ||
    (process.env.MANUAL_PAYMENTS !== 'false' && (nodeEnv === 'development' || !razorpayConfigured)),
};
