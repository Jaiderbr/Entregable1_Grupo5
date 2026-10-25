import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const IMG_ROOT = path.join(__dirname, '../../public/img');


const ALLOWED = ['image/jpg', 'image/jpeg', 'image/png', 'image/webp'];

const fileFilter = (req, file, cb) => {
    if(ALLOWED.includes(file.mimetype)) return cb(null, true);
    const error = new Error('Formato de archivo no permitido');
    error.status = 400;
    cb(error);
};

const createUploader = ({folder, prefix}) => {
    const destination = path.join(IMG_ROOT, folder);

    fs.mkdirSync(destination, {recursive: true});

    return multer({
        storage: multer.diskStorage({
            destination: (req, file, cb) => cb(null, destination),
            filename: (req, file, cb) => {
                const ext = path.extname(file.originalname).toLowerCase();
                cb(null, `${prefix}-${randomUUID()}${ext}`);
            }
        }),
        limits: {
            fileSize: 5 * 1024 * 1024 // 5MB
        },
        fileFilter
    });
};

export const uploadUserAvatar = createUploader({folder: 'users', prefix: 'avatar'});
export const uploadPetImage = createUploader({folder: 'pets', prefix: 'pet'});