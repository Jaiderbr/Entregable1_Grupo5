import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

// Devuelve "salt:hash" en hexadecimal para guardar en users.json
export const hashPassword = async (password) => {
    const salt = randomBytes(16).toString('hex');
    const hash = await scryptAsync(password, salt, KEY_LENGTH);
    return `${salt}:${hash.toString('hex')}`;
};
