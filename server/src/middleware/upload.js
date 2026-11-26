
import multer from 'multer';
import path from 'node:path';
import { AppError } from '../utils/errors.js';

const DATA_EXT = ['.csv', '.xlsx', '.pdf', '.txt'];

/**
 * Team / question imports.
 * Files are processed in memory.
 * No disk storage required.
 */
export const dataUpload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },

  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (!DATA_EXT.includes(ext)) {
      return cb(
        new AppError(
          'Only .csv, .xlsx or .pdf files are allowed.',
          415
        )
      );
    }

    cb(null, true);
  },
});
