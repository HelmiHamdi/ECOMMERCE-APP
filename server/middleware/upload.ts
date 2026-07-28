import multer from 'multer';

const storage = multer.memoryStorage();

const ALLOWED_PREFIXES = ["image/", "video/", "audio/"];


const ALLOWED_EXACT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/octet-stream",
]);

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024,
    files: 10,
  },
  fileFilter: (req, file, cb) => {
    const isAllowedPrefix = ALLOWED_PREFIXES.some((prefix) =>
      file.mimetype.startsWith(prefix)
    );
    if (isAllowedPrefix || ALLOWED_EXACT_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Type de fichier non autorisé: ${file.mimetype}`));
    }
  },
});

export default upload;