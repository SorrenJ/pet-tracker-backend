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

// ─── Reminders (must be declared before /:id to avoid shadowing) ────────────

// GET /api/meals/reminders?petId=
router.get('/reminders', auth, async (req, res, next) => {
  try {
    const { petId } = req.query;
    if (!petId) return res.status(400).json({ error: 'petId query param required' });
    if (!await ownsPet(petId, req.user.id)) return res.status(404).json({ error: 'Pet not found' });

    const { rows } = await pool.query(
      'SELECT * FROM meal_reminders WHERE pet_id = $1 ORDER BY time ASC',
      [petId]
    );
    res.json(rows.map(r => ({
      id: r.id, petId: r.pet_id, time: r.time,
      days: JSON.parse(r.days), enabled: r.enabled, label: r.label,
    })));
  } catch (err) { next(err); }
});

// POST /api/meals/reminders
router.post('/reminders', auth, async (req, res, next) => {
  try {
    const { petId, time, days, enabled, label } = req.body;
    if (!petId || !time || !Array.isArray(days)) {
      return res.status(400).json({ error: 'petId, time, and days (array) are required' });
    }
    if (!await ownsPet(petId, req.user.id)) return res.status(404).json({ error: 'Pet not found' });

    const id = uuidv4();
    await pool.query(
      'INSERT INTO meal_reminders (id, pet_id, user_id, time, days, enabled, label) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, petId, req.user.id, time, JSON.stringify(days), enabled !== false, label || null]
    );

    res.status(201).json({ id, petId, time, days, enabled: enabled !== false, label: label || null });
  } catch (err) { next(err); }
});

// PUT /api/meals/reminders/:id
router.put('/reminders/:id', auth, async (req, res, next) => {
  try {
    const existing = await pool.query(
      'SELECT * FROM meal_reminders WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    const row = existing.rows[0];
    if (!row) return res.status(404).json({ error: 'Reminder not found' });

    const { time, days, enabled, label } = req.body;
    const { rows } = await pool.query(
      'UPDATE meal_reminders SET time = $1, days = $2, enabled = $3, label = $4 WHERE id = $5 RETURNING *',
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

// DELETE /api/meals/reminders/:id
router.delete('/reminders/:id', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id FROM meal_reminders WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Reminder not found' });
    await pool.query('DELETE FROM meal_reminders WHERE id = $1', [rows[0].id]);
    res.status(204).end();
  } catch (err) { next(err); }
});

// ─── Budget ──────────────────────────────────────────────────────────────────

// GET /api/meals/budget?petId=
router.get('/budget', auth, async (req, res, next) => {
  try {
    const { petId } = req.query;
    if (!petId) return res.status(400).json({ error: 'petId query param required' });
    if (!await ownsPet(petId, req.user.id)) return res.status(404).json({ error: 'Pet not found' });

    const { rows } = await pool.query('SELECT * FROM meal_budgets WHERE pet_id = $1', [petId]);
    if (!rows[0]) return res.json(null);
    const row = rows[0];
    res.json({ petId: row.pet_id, monthlyBudget: row.monthly_budget, currency: row.currency });
  } catch (err) { next(err); }
});

// PUT /api/meals/budget  — upsert
router.put('/budget', auth, async (req, res, next) => {
  try {
    const { petId, monthlyBudget, currency } = req.body;
    if (!petId || monthlyBudget == null) {
      return res.status(400).json({ error: 'petId and monthlyBudget are required' });
    }
    if (!await ownsPet(petId, req.user.id)) return res.status(404).json({ error: 'Pet not found' });

    const cur = currency || '$';
    await pool.query(
      `INSERT INTO meal_budgets (id, pet_id, user_id, monthly_budget, currency) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (pet_id) DO UPDATE SET monthly_budget = $4, currency = $5`,
      [uuidv4(), petId, req.user.id, monthlyBudget, cur]
    );

    res.json({ petId, monthlyBudget, currency: cur });
  } catch (err) { next(err); }
});

// ─── Meal Logs ───────────────────────────────────────────────────────────────

// GET /api/meals?petId=
router.get('/', auth, async (req, res, next) => {
  try {
    const { petId } = req.query;
    if (!petId) return res.status(400).json({ error: 'petId query param required' });
    if (!await ownsPet(petId, req.user.id)) return res.status(404).json({ error: 'Pet not found' });

    const { rows } = await pool.query(
      'SELECT * FROM meal_logs WHERE pet_id = $1 ORDER BY timestamp DESC',
      [petId]
    );
    res.json(rows.map(r => ({
      id: r.id, petId: r.pet_id, foodType: r.food_type,
      amount: r.amount, unit: r.unit, timestamp: r.timestamp,
      cost: r.cost, notes: r.notes,
    })));
  } catch (err) { next(err); }
});

// POST /api/meals
router.post('/', auth, async (req, res, next) => {
  try {
    const { petId, foodType, amount, unit, timestamp, cost, notes } = req.body;
    if (!petId || !foodType || amount == null || !unit) {
      return res.status(400).json({ error: 'petId, foodType, amount, and unit are required' });
    }
    if (!await ownsPet(petId, req.user.id)) return res.status(404).json({ error: 'Pet not found' });

    const id = uuidv4();
    const ts = timestamp || new Date().toISOString();
    await pool.query(
      'INSERT INTO meal_logs (id, pet_id, user_id, food_type, amount, unit, timestamp, cost, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [id, petId, req.user.id, foodType, amount, unit, ts, cost ?? null, notes || null]
    );

    res.status(201).json({ id, petId, foodType, amount, unit, timestamp: ts, cost: cost ?? null, notes: notes || null });
  } catch (err) { next(err); }
});

// DELETE /api/meals/:id
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id FROM meal_logs WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Meal log not found' });
    await pool.query('DELETE FROM meal_logs WHERE id = $1', [rows[0].id]);
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
