import multer, { diskStorage } from "multer";
import path, { extname } from "path";

const storage = diskStorage({
  destination: (_, __, cb) => {
    cb(null, "src/upload");
  },
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`);
  },
});

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 5,
  },
});
