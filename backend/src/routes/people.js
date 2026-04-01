import express from 'express';
import Person from '../models/Person.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authRequired, async (req, res) => {
  try {
    const people = await Person.find().sort({ name: 1 });
    res.json(people);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: 'Failed to load people' });
  }
});

router.post('/', authRequired, async (req, res) => {
  try {
    const { name, notes, photos } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!Array.isArray(photos) || photos.length !== 5) {
      return res.status(400).json({ error: 'Exactly 5 photos are required for identification' });
    }
    const validPhotos = photos.filter((p) => typeof p === 'string' && p.startsWith('data:'));
    if (validPhotos.length !== 5) {
      return res.status(400).json({ error: 'All 5 photos must be valid base64 data URLs' });
    }

    const person = await Person.create({
      name: name.trim(),
      notes: (notes || '').trim(),
      photos: validPhotos,
    });
    res.status(201).json(person);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to create person' });
  }
});

router.get('/:id', authRequired, async (req, res) => {
  try {
    const person = await Person.findById(req.params.id);
    if (!person) return res.status(404).json({ error: 'Person not found' });
    res.json(person);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: 'Failed to load person' });
  }
});

router.patch('/:id', authRequired, async (req, res) => {
  try {
    const { name, notes, photos } = req.body;
    const person = await Person.findById(req.params.id);
    if (!person) return res.status(404).json({ error: 'Person not found' });

    if (name !== undefined) person.name = String(name).trim();
    if (notes !== undefined) person.notes = String(notes).trim();
    if (Array.isArray(photos)) {
      if (photos.length !== 5) {
        return res.status(400).json({ error: 'Exactly 5 photos are required' });
      }
      const validPhotos = photos.filter((p) => typeof p === 'string' && p.startsWith('data:'));
      if (validPhotos.length !== 5) {
        return res.status(400).json({ error: 'All 5 photos must be valid base64 data URLs' });
      }
      person.photos = validPhotos;
    }

    await person.save();
    res.json(person);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to update person' });
  }
});

router.delete('/:id', authRequired, async (req, res) => {
  try {
    const person = await Person.findByIdAndDelete(req.params.id);
    if (!person) return res.status(404).json({ error: 'Person not found' });
    res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: 'Failed to delete person' });
  }
});

export default router;
