import {Router} from 'express';
import {uploadPetImage} from '../middlewares/multer.middleware.js';
import {readJSON, writeJSON, nextId, removePublicFile, removeUploadedFiles} from '../utils/storage.js';

const router = Router();
const FILE = 'pets.json';
const FIELDS = ['especie', 'color', 'edad', 'sexo'];
const SEXOS = ['macho', 'hembra'];
const MAX_IMAGES = 5;

const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';
const imgUrl = (file) => `/img/pets/${file.filename}`;

const parseEdad = (value) => {
    const edad = Number(value);
    return Number.isInteger(edad) && edad >= 0 ? edad : null;
};

const validate = (body) => {
    const errors = [];
    if (body.especie !== undefined && isBlank(body.especie)) errors.push('especie no puede estar vacia');
    if (body.color !== undefined && isBlank(body.color)) errors.push('color no puede estar vacio');
    if (body.edad !== undefined && (isBlank(body.edad) || parseEdad(body.edad) === null)) {
        errors.push('edad debe ser un entero mayor o igual a 0');
    }
    if (body.sexo !== undefined && !SEXOS.includes(String(body.sexo).trim().toLowerCase())) {
        errors.push(`sexo debe ser: ${SEXOS.join(' o ')}`);
    }
    return errors;
};

router.get('/', async (req, res) => {
    const pets = await readJSON(FILE);
    res.status(200).json(pets);
});

router.get('/:id', async (req, res) => {
    const pets = await readJSON(FILE);
    const pet = pets.find(p => p.id === Number(req.params.id));
    if (!pet) return res.status(404).json({error: 'Mascota no encontrada'});

    res.status(200).json(pet);
});

router.post('/', uploadPetImage.array('img', MAX_IMAGES), async (req, res) => {
    const body = req.body ?? {};
    const files = req.files ?? [];

    const missing = FIELDS.filter(field => isBlank(body[field]));
    if (missing.length) {
        await removeUploadedFiles(files);
        return res.status(400).json({error: `Campos obligatorios faltantes: ${missing.join(', ')}`});
    }

    const errors = validate(body);
    if (errors.length) {
        await removeUploadedFiles(files);
        return res.status(400).json({error: errors.join('; ')});
    }

    const pets = await readJSON(FILE);
    const pet = {
        id: nextId(pets),
        especie: String(body.especie).trim(),
        color: String(body.color).trim(),
        edad: parseEdad(body.edad),
        sexo: String(body.sexo).trim().toLowerCase(),
        img: files.map(imgUrl)
    };

    pets.push(pet);
    await writeJSON(FILE, pets);

    res.status(201).json(pet);
});

router.put('/:id', uploadPetImage.array('img', MAX_IMAGES), async (req, res) => {
    const body = req.body ?? {};
    const files = req.files ?? [];
    const pets = await readJSON(FILE);
    const pet = pets.find(p => p.id === Number(req.params.id));

    if (!pet) {
        await removeUploadedFiles(files);
        return res.status(404).json({error: 'Mascota no encontrada'});
    }

    const fields = FIELDS.filter(field => body[field] !== undefined);
    if (!fields.length && !files.length) {
        return res.status(400).json({error: 'No se enviaron datos para actualizar'});
    }

    const errors = validate(body);
    if (errors.length) {
        await removeUploadedFiles(files);
        return res.status(400).json({error: errors.join('; ')});
    }

    const replace = String(body.reemplazarImg).toLowerCase() === 'true';
    const oldImages = pet.img;
    const newImages = files.map(imgUrl);

    if (!replace && oldImages.length + newImages.length > MAX_IMAGES) {
        await removeUploadedFiles(files);
        return res.status(400).json({error: `Una mascota puede tener maximo ${MAX_IMAGES} imagenes`});
    }

    if (body.especie !== undefined) pet.especie = String(body.especie).trim();
    if (body.color !== undefined) pet.color = String(body.color).trim();
    if (body.edad !== undefined) pet.edad = parseEdad(body.edad);
    if (body.sexo !== undefined) pet.sexo = String(body.sexo).trim().toLowerCase();
    if (newImages.length) pet.img = replace ? newImages : [...oldImages, ...newImages];

    await writeJSON(FILE, pets);
    if (replace && newImages.length) {
        for (const url of oldImages) await removePublicFile(url);
    }

    res.status(200).json(pet);
});

router.delete('/:id', async (req, res) => {
    const pets = await readJSON(FILE);
    const index = pets.findIndex(p => p.id === Number(req.params.id));
    if (index === -1) return res.status(404).json({error: 'Mascota no encontrada'});

    const [deleted] = pets.splice(index, 1);
    await writeJSON(FILE, pets);
    for (const url of deleted.img) await removePublicFile(url);

    res.status(200).json({message: 'Mascota eliminada', pet: deleted});
});

export default router;
