import {Router} from 'express';
import {uploadUserAvatar} from '../middlewares/multer.middleware.js';
import {hashPassword} from '../utils/crypto.js';
import {readJSON, writeJSON, nextId, removePublicFile, removeUploadedFiles} from '../utils/storage.js';

const router = Router();
const FILE = 'users.json';
const FIELDS = ['firstname', 'lastname', 'username', 'password'];

const isBlank = (value) => typeof value !== 'string' || !value.trim();
const withoutPassword = ({password, ...user}) => user;
const avatarUrl = (file) => `/img/users/${file.filename}`;

router.get('/', async (req, res) => {
    const users = await readJSON(FILE);
    res.status(200).json(users.map(withoutPassword));
});

router.get('/:id', async (req, res) => {
    const users = await readJSON(FILE);
    const user = users.find(u => u.id === Number(req.params.id));
    if (!user) return res.status(404).json({error: 'Usuario no encontrado'});

    res.status(200).json(withoutPassword(user));
});

router.post('/', uploadUserAvatar.single('avatar'), async (req, res) => {
    const body = req.body ?? {};

    const missing = FIELDS.filter(field => isBlank(body[field]));
    if (missing.length) {
        await removeUploadedFiles([req.file]);
        return res.status(400).json({error: `Campos obligatorios faltantes: ${missing.join(', ')}`});
    }

    const users = await readJSON(FILE);
    if (users.some(u => u.username === body.username.trim())) {
        await removeUploadedFiles([req.file]);
        return res.status(400).json({error: 'El username ya esta registrado'});
    }

    const user = {
        id: nextId(users),
        firstname: body.firstname.trim(),
        lastname: body.lastname.trim(),
        username: body.username.trim(),
        password: await hashPassword(body.password),
        avatar: req.file ? avatarUrl(req.file) : null
    };

    users.push(user);
    await writeJSON(FILE, users);

    res.status(201).json(withoutPassword(user));
});

router.put('/:id', uploadUserAvatar.single('avatar'), async (req, res) => {
    const body = req.body ?? {};
    const users = await readJSON(FILE);
    const user = users.find(u => u.id === Number(req.params.id));

    if (!user) {
        await removeUploadedFiles([req.file]);
        return res.status(404).json({error: 'Usuario no encontrado'});
    }

    const fields = FIELDS.filter(field => body[field] !== undefined);
    if (!fields.length && !req.file) {
        return res.status(400).json({error: 'No se enviaron datos para actualizar'});
    }

    const invalid = fields.filter(field => isBlank(body[field]));
    if (invalid.length) {
        await removeUploadedFiles([req.file]);
        return res.status(400).json({error: `Campos vacios o invalidos: ${invalid.join(', ')}`});
    }

    if (body.username !== undefined && users.some(u => u.id !== user.id && u.username === body.username.trim())) {
        await removeUploadedFiles([req.file]);
        return res.status(400).json({error: 'El username ya esta registrado'});
    }

    for (const field of ['firstname', 'lastname', 'username']) {
        if (body[field] !== undefined) user[field] = body[field].trim();
    }
    if (body.password !== undefined) user.password = await hashPassword(body.password);

    const oldAvatar = user.avatar;
    if (req.file) user.avatar = avatarUrl(req.file);

    await writeJSON(FILE, users);
    if (req.file) await removePublicFile(oldAvatar);

    res.status(200).json(withoutPassword(user));
});

router.delete('/:id', async (req, res) => {
    const users = await readJSON(FILE);
    const index = users.findIndex(u => u.id === Number(req.params.id));
    if (index === -1) return res.status(404).json({error: 'Usuario no encontrado'});

    const [deleted] = users.splice(index, 1);
    await writeJSON(FILE, users);
    await removePublicFile(deleted.avatar);

    res.status(200).json({message: 'Usuario eliminado', user: withoutPassword(deleted)});
});

export default router;
