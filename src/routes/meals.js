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

// ─── Meal Schedules (Routines) ───────────────────────────────────────────────

// GET /api/meals/schedules?petId=
router.get('/schedules', auth, async (req, res, next) => {
  try {
    const { petId } = req.query;
    if (!petId) return res.status(400).json({ error: 'petId query param required' });
    if (!await ownsPet(petId, req.user.id)) return res.status(404).json({ error: 'Pet not found' });

    const { rows } = await pool.query(
      'SELECT * FROM meal_schedules WHERE pet_id = $1 ORDER BY start_date ASC',
      [petId]
    );
    res.json(rows.map(r => ({
      id: r.id, petId: r.pet_id, name: r.name, recurrence: r.recurrence,
      customDays: r.custom_days ? JSON.parse(r.custom_days) : undefined,
      meals: JSON.parse(r.meals), startDate: r.start_date,
      endDate: r.end_date || undefined, enabled: r.enabled,
    })));
  } catch (err) { next(err); }
});

// POST /api/meals/schedules
router.post('/schedules', auth, async (req, res, next) => {
  try {
    const { petId, name, recurrence, customDays, meals, startDate, endDate, enabled } = req.body;
    if (!petId || !name || !recurrence || !Array.isArray(meals) || !startDate) {
      return res.status(400).json({ error: 'petId, name, recurrence, meals, and startDate are required' });
    }
    if (!await ownsPet(petId, req.user.id)) return res.status(404).json({ error: 'Pet not found' });

    const id = uuidv4();
    await pool.query(
      `INSERT INTO meal_schedules (id, pet_id, user_id, name, recurrence, custom_days, meals, start_date, end_date, enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, petId, req.user.id, name, recurrence,
       customDays ? JSON.stringify(customDays) : null,
       JSON.stringify(meals), startDate, endDate || null, enabled !== false]
    );

    res.status(201).json({
      id, petId, name, recurrence, customDays, meals, startDate,
      endDate: endDate || undefined, enabled: enabled !== false,
    });
  } catch (err) { next(err); }
});

// PUT /api/meals/schedules/:id
router.put('/schedules/:id', auth, async (req, res, next) => {
  try {
    const existing = await pool.query(
      'SELECT * FROM meal_schedules WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    const row = existing.rows[0];
    if (!row) return res.status(404).json({ error: 'Schedule not found' });

    const { name, recurrence, customDays, meals, startDate, endDate, enabled } = req.body;
    const { rows } = await pool.query(
      `UPDATE meal_schedules SET name = $1, recurrence = $2, custom_days = $3, meals = $4,
       start_date = $5, end_date = $6, enabled = $7 WHERE id = $8 RETURNING *`,
      [
        name ?? row.name, recurrence ?? row.recurrence,
        customDays !== undefined ? (customDays ? JSON.stringify(customDays) : null) : row.custom_days,
        meals ? JSON.stringify(meals) : row.meals,
        startDate ?? row.start_date, endDate !== undefined ? (endDate || null) : row.end_date,
        enabled !== undefined ? enabled : row.enabled, row.id,
      ]
    );

    const u = rows[0];
    res.json({
      id: u.id, petId: u.pet_id, name: u.name, recurrence: u.recurrence,
      customDays: u.custom_days ? JSON.parse(u.custom_days) : undefined,
      meals: JSON.parse(u.meals), startDate: u.start_date,
      endDate: u.end_date || undefined, enabled: u.enabled,
    });
  } catch (err) { next(err); }
});

// DELETE /api/meals/schedules/:id
router.delete('/schedules/:id', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id FROM meal_schedules WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Schedule not found' });
    await pool.query('DELETE FROM meal_schedules WHERE id = $1', [rows[0].id]);
    res.status(204).end();
  } catch (err) { next(err); }
});

// ─── Daily Meal Plans ────────────────────────────────────────────────────────

// GET /api/meals/plans?petId=
router.get('/plans', auth, async (req, res, next) => {
  try {
    const { petId } = req.query;
    if (!petId) return res.status(400).json({ error: 'petId query param required' });
    if (!await ownsPet(petId, req.user.id)) return res.status(404).json({ error: 'Pet not found' });

    const { rows } = await pool.query(
      'SELECT * FROM daily_meal_plans WHERE pet_id = $1 ORDER BY date DESC',
      [petId]
    );
    res.json(rows.map(r => ({
      id: r.id, petId: r.pet_id, date: r.date, meals: JSON.parse(r.meals),
    })));
  } catch (err) { next(err); }
});

// POST /api/meals/plans
router.post('/plans', auth, async (req, res, next) => {
  try {
    const { petId, date, meals } = req.body;
    if (!petId || !date || !Array.isArray(meals)) {
      return res.status(400).json({ error: 'petId, date, and meals (array) are required' });
    }
    if (!await ownsPet(petId, req.user.id)) return res.status(404).json({ error: 'Pet not found' });

    const id = uuidv4();
    await pool.query(
      `INSERT INTO daily_meal_plans (id, pet_id, user_id, date, meals) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (pet_id, date) DO UPDATE SET meals = $5`,
      [id, petId, req.user.id, date, JSON.stringify(meals)]
    );

    res.status(201).json({ id, petId, date, meals });
  } catch (err) { next(err); }
});

// PUT /api/meals/plans/:id
router.put('/plans/:id', auth, async (req, res, next) => {
  try {
    const existing = await pool.query(
      'SELECT * FROM daily_meal_plans WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    const row = existing.rows[0];
    if (!row) return res.status(404).json({ error: 'Meal plan not found' });

    const { date, meals } = req.body;
    const { rows } = await pool.query(
      'UPDATE daily_meal_plans SET date = $1, meals = $2 WHERE id = $3 RETURNING *',
      [date ?? row.date, meals ? JSON.stringify(meals) : row.meals, row.id]
    );

    const updated = rows[0];
    res.json({
      id: updated.id, petId: updated.pet_id, date: updated.date,
      meals: JSON.parse(updated.meals),
    });
  } catch (err) { next(err); }
});

// DELETE /api/meals/plans/:id
router.delete('/plans/:id', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id FROM daily_meal_plans WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Meal plan not found' });
    await pool.query('DELETE FROM daily_meal_plans WHERE id = $1', [rows[0].id]);
    res.status(204).end();
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
