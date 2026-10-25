import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');
const PUBLIC_DIR = path.join(__dirname, '../../public');

export const readJSON = async (fileName) => {
    const content = await fs.readFile(path.join(DATA_DIR, fileName), 'utf-8');
    return content.trim() ? JSON.parse(content) : [];
};

export const writeJSON = async (fileName, data) => {
    await fs.writeFile(path.join(DATA_DIR, fileName), JSON.stringify(data, null, 2));
};

export const nextId = (items) => items.reduce((max, item) => Math.max(max, item.id), 0) + 1;

// Borra una imagen a partir de la URL guardada en el JSON (ej: /img/users/avatar-x.png)
export const removePublicFile = async (url) => {
    if (!url) return;
    try {
        await fs.unlink(path.join(PUBLIC_DIR, url));
    } catch (err) {
        if (err.code !== 'ENOENT') console.error(`No se pudo borrar ${url}:`, err.message);
    }
};

// Borra archivos recien subidos por multer cuando la peticion no es valida
export const removeUploadedFiles = async (files = []) => {
    for (const file of files) {
        if (!file) continue;
        try {
            await fs.unlink(file.path);
        } catch (err) {
            if (err.code !== 'ENOENT') console.error(`No se pudo borrar ${file.path}:`, err.message);
        }
    }
};
