const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const https = require('https');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

function verifyGoogleIdToken(idToken) {
  return new Promise((resolve, reject) => {
    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
    https.get(url, res => {
      let raw = '';
      res.on('data', chunk => {
        raw += chunk;
      });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error('Invalid Google token'));
          return;
        }
        try {
          const payload = JSON.parse(raw);
          resolve(payload);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function formatUser(row) {
  return { id: row.id, email: row.email, name: row.name, distanceUnit: row.distance_unit };
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'email, password, and name are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows[0]) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      'INSERT INTO users (id, email, password_hash, name, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, distance_unit',
      [id, email.toLowerCase(), passwordHash, name, new Date().toISOString()]
    );

    res.status(201).json({ token: signToken(id), user: formatUser(rows[0]) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = rows[0];
    const validPassword = user?.password_hash && (await bcrypt.compare(password, user.password_hash));
    if (!user || !validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({ token: signToken(user.id), user: formatUser(user) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/google
router.post('/google', async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'idToken is required' });
    }

    const payload = await verifyGoogleIdToken(idToken);
    const audience = payload.aud || payload.audience;
    const email = payload.email?.toLowerCase();
    const googleId = payload.sub;
    const name = payload.name || '';
    const emailVerified = payload.email_verified === 'true' || payload.email_verified === true;

    if (!email || !googleId || !emailVerified || audience !== process.env.GOOGLE_CLIENT_ID) {
      return res.status(401).json({ error: 'Invalid Google token' });
    }

    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    let user = rows[0];

    if (user) {
      if (user.google_id && user.google_id !== googleId) {
        return res.status(401).json({ error: 'Google account mismatch' });
      }

      if (!user.google_id) {
        await pool.query('UPDATE users SET google_id = $1 WHERE id = $2', [googleId, user.id]);
        user.google_id = googleId;
      }
    } else {
      const id = uuidv4();
      const { rows: inserted } = await pool.query(
        'INSERT INTO users (id, email, google_id, name, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, distance_unit',
        [id, email, googleId, name || email, new Date().toISOString()]
      );
      user = inserted[0];
    }

    res.json({ token: signToken(user.id), user: formatUser(user) });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => {
  res.json({ user: formatUser(req.user) });
});

// PATCH /api/auth/me  — update name or distance unit preference
router.patch('/me', auth, async (req, res, next) => {
  try {
    const { name, distanceUnit } = req.body;
    const fields = [];
    const params = [];
    let i = 1;

    if (name) { fields.push(`name = $${i++}`); params.push(name); }
    if (distanceUnit && ['km', 'miles'].includes(distanceUnit)) {
      fields.push(`distance_unit = $${i++}`);
      params.push(distanceUnit);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    params.push(req.user.id);
    const { rows } = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${i} RETURNING id, email, name, distance_unit`,
      params
    );
    res.json({ user: formatUser(rows[0]) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
