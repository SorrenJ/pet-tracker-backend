const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

async function ownsPet(petId, userId) {
  const { rows } = await pool.query(
    'SELECT id FROM pets WHERE id = $1 AND user_id = $2',
    [petId, userId]
  );
  return rows[0];
}

// ─── Reminders (declared before /:id) ───────────────────────────────────────

// GET /api/exercise/reminders?petId=
router.get('/reminders', auth, async (req, res, next) => {
  try {
    const { petId } = req.query;
    if (!petId) return res.status(400).json({ error: 'petId query param required' });
    if (!await ownsPet(petId, req.user.id)) return res.status(404).json({ error: 'Pet not found' });

    const { rows } = await pool.query(
      'SELECT * FROM exercise_reminders WHERE pet_id = $1 ORDER BY time ASC',
      [petId]
    );
    res.json(rows.map(r => ({
      id: r.id, petId: r.pet_id, time: r.time,
      days: JSON.parse(r.days), enabled: r.enabled, label: r.label,
    })));
  } catch (err) { next(err); }
});

// POST /api/exercise/reminders
router.post('/reminders', auth, async (req, res, next) => {
  try {
    const { petId, time, days, enabled, label } = req.body;
    if (!petId || !time || !Array.isArray(days)) {
      return res.status(400).json({ error: 'petId, time, and days (array) are required' });
    }
    if (!await ownsPet(petId, req.user.id)) return res.status(404).json({ error: 'Pet not found' });

    const id = uuidv4();
    await pool.query(
      'INSERT INTO exercise_reminders (id, pet_id, user_id, time, days, enabled, label) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, petId, req.user.id, time, JSON.stringify(days), enabled !== false, label || null]
    );

    res.status(201).json({ id, petId, time, days, enabled: enabled !== false, label: label || null });
  } catch (err) { next(err); }
});

// PUT /api/exercise/reminders/:id
router.put('/reminders/:id', auth, async (req, res, next) => {
  try {
    const existing = await pool.query(
      'SELECT * FROM exercise_reminders WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    const row = existing.rows[0];
    if (!row) return res.status(404).json({ error: 'Reminder not found' });

    const { time, days, enabled, label } = req.body;
    const { rows } = await pool.query(
      'UPDATE exercise_reminders SET time = $1, days = $2, enabled = $3, label = $4 WHERE id = $5 RETURNING *',
      [
        time ?? row.time,
        days !== undefined ? JSON.stringify(days) : row.days,
        enabled !== undefined ? enabled : row.enabled,
        label !== undefined ? label : row.label,
        row.id,
      ]
    );

    const updated = rows[0];
    res.json({
      id: updated.id, petId: updated.pet_id, time: updated.time,
      days: JSON.parse(updated.days), enabled: updated.enabled, label: updated.label,
    });
  } catch (err) { next(err); }
});

// DELETE /api/exercise/reminders/:id
router.delete('/reminders/:id', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id FROM exercise_reminders WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Reminder not found' });
    await pool.query('DELETE FROM exercise_reminders WHERE id = $1', [rows[0].id]);
    res.status(204).end();
  } catch (err) { next(err); }
});

// ─── Exercise Sessions ────────────────────────────────────────────────────────

// GET /api/exercise?petId=
router.get('/', auth, async (req, res, next) => {
  try {
    const { petId } = req.query;
    if (!petId) return res.status(400).json({ error: 'petId query param required' });
    if (!await ownsPet(petId, req.user.id)) return res.status(404).json({ error: 'Pet not found' });

    const { rows } = await pool.query(
      'SELECT * FROM exercise_sessions WHERE pet_id = $1 ORDER BY date DESC',
      [petId]
    );
    res.json(rows.map(r => ({
      id: r.id, petId: r.pet_id, date: r.date,
      steps: r.steps, distanceKm: r.distance_km,
      durationMinutes: r.duration_minutes, notes: r.notes,
    })));
  } catch (err) { next(err); }
});

// POST /api/exercise
router.post('/', auth, async (req, res, next) => {
  try {
    const { petId, date, steps, distanceKm, durationMinutes, notes } = req.body;
    if (!petId || !date) {
      return res.status(400).json({ error: 'petId and date are required' });
    }
    if (!await ownsPet(petId, req.user.id)) return res.status(404).json({ error: 'Pet not found' });

    const id = uuidv4();
    await pool.query(
      'INSERT INTO exercise_sessions (id, pet_id, user_id, date, steps, distance_km, duration_minutes, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id, petId, req.user.id, date, steps ?? null, distanceKm ?? null, durationMinutes ?? null, notes || null]
    );

    res.status(201).json({ id, petId, date, steps: steps ?? null, distanceKm: distanceKm ?? null, durationMinutes: durationMinutes ?? null, notes: notes || null });
  } catch (err) { next(err); }
});

// DELETE /api/exercise/:id
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id FROM exercise_sessions WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Exercise session not found' });
    await pool.query('DELETE FROM exercise_sessions WHERE id = $1', [rows[0].id]);
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
