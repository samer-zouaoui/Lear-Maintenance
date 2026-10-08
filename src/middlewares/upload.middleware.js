import multer from 'multer';
import path from 'path';
import fs from 'fs';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'pannes');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const nomUnique = `panne-${req.params.id}-${Date.now()}${ext}`;
        cb(null, nomUnique);
    },
});

const FORMATS_AUTORISES = ['.jpg', '.jpeg', '.png', '.webp'];

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!FORMATS_AUTORISES.includes(ext)) {
        return cb(new Error('Format de fichier non autorisé'));
    }
    cb(null, true);
};

export const uploadPannePhoto = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 Mo max
        files: 1,
    },
});