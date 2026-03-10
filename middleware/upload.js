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
      // Allow images and common file types
      const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);

      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Only images and documents are allowed'));
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
