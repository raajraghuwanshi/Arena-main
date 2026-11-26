import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import crypto from 'node:crypto';
import { AppError } from '../utils/errors.js';

const DATA_EXT = ['.csv', '.xlsx', '.pdf', '.txt'];
const AUDIO_EXT = ['.mp3', '.wav', '.ogg', '.m4a', '.webm'];
const VIDEO_EXT = ['.mp4', '.webm', '.mov', '.m4v'];
const stagingDir = path.join(os.tmpdir(), 'arena-upload-staging');
fs.mkdirSync(stagingDir, { recursive: true });

const stagingStorage = multer.diskStorage({
  destination: stagingDir,
  filename: (_req, file, cb) => cb(null, `${crypto.randomBytes(16).toString('hex')}${path.extname(file.originalname).toLowerCase()}`),
});

export async function removeStagedUpload(file) {
  try {
    await fsp.unlink(file.path);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

/** Team / question import: kept in memory, parsed, never written to disk. */
export const dataUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const e = path.extname(file.originalname).toLowerCase();
    if (!DATA_EXT.includes(e)) return cb(new AppError('Only .csv, .xlsx or .pdf files are allowed.', 415));
    cb(null, true);
  },
});

export const soundUpload = multer({
  storage: stagingStorage,
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const e = path.extname(file.originalname).toLowerCase();
    if (!AUDIO_EXT.includes(e) || !/^audio\/|^video\/webm/.test(file.mimetype)) {
      return cb(new AppError('Only audio files (.mp3, .wav, .ogg, .m4a, .webm) are allowed.', 415));
    }
    cb(null, true);
  },
});

/** Grand Final solution videos are staged temporarily before being sent to ImageKit. */
export const videoUpload = multer({
  storage: stagingStorage,
  limits: { fileSize: 1024 * 1024 * 1024, files: 1 }, // 1 GB
  fileFilter: (_req, file, cb) => {
    const e = path.extname(file.originalname).toLowerCase();
    if (!VIDEO_EXT.includes(e) || !/^video\//.test(file.mimetype)) return cb(new AppError('Only video files (.mp4, .webm, .mov, .m4v) are allowed.', 415));
    cb(null, true);
  },
});

export { AUDIO_EXT };
