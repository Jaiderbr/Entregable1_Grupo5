import express from 'express';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import usersRouter from './routes/users.router.js';
import petsRouter from './routes/pets.router.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express()
const port = process.env.PORT ?? 3030

app.use(express.urlencoded ({extended: true}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/users', usersRouter)
app.use('/api/pets', petsRouter)

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' })
})

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message })
  }
  if (err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ error: err.message })
  }

  console.error(err)
  res.status(500).json({ error: 'Error interno del servidor' })
})

app.listen(port, (error) => {
  if (error) throw error
  console.log(`app running on http://localhost:${port}/`)
})
