const multer = require('multer');
const path = require('path');
const fs = require('fs');

class UploadMiddleware {
  constructor() {
    this.uploadDir = 'uploads';
    this.ensureUploadDir();
    
    this.storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
      }
    });

    this.fileFilter = (req, file, cb) => {
      // Allowed file extensions
      const allowedExtensions = /\.(jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|xlsx|xls|ppt|pptx|rar|7z|mp3|mp4|mov|avi)$/i;
      const extname = allowedExtensions.test(file.originalname);

      // Allowed MIME types - more comprehensive
      const allowedMimetypes = [
        // Images
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        // Documents
        'application/pdf',
        'application/msword', // .doc
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
        'application/vnd.ms-powerpoint', // .ppt
        'text/plain',
        'text/csv',
        // Archives
        'application/zip',
        'application/x-rar-compressed', // .rar
        'application/x-7z-compressed', // .7z
        // Audio/Video
        'audio/mpeg', // .mp3
        'video/mp4',
        'video/quicktime', // .mov
        'video/x-msvideo', // .avi
        // Fallback for unknown types with allowed extensions
        'application/octet-stream'
      ];

      const isMimetypeAllowed = allowedMimetypes.includes(file.mimetype);

      // Allow file if extension is valid AND (mimetype is allowed OR it's octet-stream with valid extension)
      if (extname && (isMimetypeAllowed || file.mimetype === 'application/octet-stream')) {
        return cb(null, true);
      } else {
        cb(new Error('File type not allowed. Allowed: images, documents (PDF, Word, Excel, PowerPoint), text, archives, audio, video'));
      }
    };

    this.upload = multer({
      storage: this.storage,
      limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
      },
      fileFilter: this.fileFilter
    });
  }

  ensureUploadDir() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  single(fieldName) {
    return this.upload.single(fieldName);
  }

  multiple(fieldName, maxCount) {
    return this.upload.array(fieldName, maxCount);
  }
}

const uploadMiddleware = new UploadMiddleware();

module.exports = uploadMiddleware;
