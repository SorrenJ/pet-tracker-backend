const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

function formatPet(row) {
  return {
    id: row.id,
    name: row.name,
    species: row.species,
    breed: row.breed,
    weight: row.weight,
    weightUnit: row.weight_unit,
    birthDate: row.birth_date,
    photo: row.photo,
    createdAt: row.created_at,
  };
}

// GET /api/pets
router.get('/', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM pets WHERE user_id = $1 ORDER BY created_at ASC',
      [req.user.id]
    );
    res.json(rows.map(formatPet));
  } catch (err) {
    next(err);
  }
});

// GET /api/pets/:petId
router.get('/:petId', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM pets WHERE id = $1 AND user_id = $2',
      [req.params.petId, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Pet not found' });
    res.json(formatPet(rows[0]));
  } catch (err) {
    next(err);
  }
});

// POST /api/pets
router.post('/', auth, async (req, res, next) => {
  try {
    const { name, species, breed, weight, weightUnit, birthDate, photo } = req.body;
    if (!name || !species) {
      return res.status(400).json({ error: 'name and species are required' });
    }
    if (!['dog', 'cat', 'other'].includes(species)) {
      return res.status(400).json({ error: 'species must be dog, cat, or other' });
    }

    const { rows } = await pool.query(
      'INSERT INTO pets (id, user_id, name, species, breed, weight, weight_unit, birth_date, photo, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [uuidv4(), req.user.id, name, species, breed || null, weight ?? null, weightUnit || 'kg', birthDate || null, photo || null, new Date().toISOString()]
    );

    res.status(201).json(formatPet(rows[0]));
  } catch (err) {
    next(err);
  }
});

// PUT /api/pets/:petId
router.put('/:petId', auth, async (req, res, next) => {
  try {
    const existing = await pool.query(
      'SELECT * FROM pets WHERE id = $1 AND user_id = $2',
      [req.params.petId, req.user.id]
    );
    const pet = existing.rows[0];
    if (!pet) return res.status(404).json({ error: 'Pet not found' });

    const { name, species, breed, weight, weightUnit, birthDate, photo } = req.body;

    if (species && !['dog', 'cat', 'other'].includes(species)) {
      return res.status(400).json({ error: 'species must be dog, cat, or other' });
    }

    const { rows } = await pool.query(
      'UPDATE pets SET name = $1, species = $2, breed = $3, weight = $4, weight_unit = $5, birth_date = $6, photo = $7 WHERE id = $8 RETURNING *',
      [
        name ?? pet.name,
        species ?? pet.species,
        breed !== undefined ? breed : pet.breed,
        weight !== undefined ? weight : pet.weight,
        weightUnit ?? pet.weight_unit,
        birthDate !== undefined ? birthDate : pet.birth_date,
        photo !== undefined ? photo : pet.photo,
        pet.id,
      ]
    );

    res.json(formatPet(rows[0]));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/pets/:petId
router.delete('/:petId', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id FROM pets WHERE id = $1 AND user_id = $2',
      [req.params.petId, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Pet not found' });
    await pool.query('DELETE FROM pets WHERE id = $1', [rows[0].id]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
