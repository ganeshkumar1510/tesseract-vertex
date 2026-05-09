import express from 'express';
import { json } from 'body-parser';
import { verifyToken } from './middleware/auth.js';
import { db } from './db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const app = express();
app.use(json());

// Registration
app.post('/register', async (req, res) => {
  try {
    const { name, email, password, profession, domain, tools, sentinelTone, preLoadDemo } = req.body;
    
    // Check if user exists
    const existing = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (existing) return res.status(400).json({ error: 'User already exists' });

    const hash = await bcrypt.hash(password, 10);
    const result = await db.run(
      `INSERT INTO users (name, email, hash, profession, domain, tools, sentinelTone) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, email, hash, profession, domain, tools, sentinelTone]
    );
    
    const token = jwt.sign({ id: result.lastID || result.insertId }, process.env.JWT_SECRET || 'vertex-secret-key');
    res.json({ token, user: { name, email, profession } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const row = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    
    if (!row || !(await bcrypt.compare(password, row.hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ id: row.id }, process.env.JWT_SECRET || 'vertex-secret-key');
    res.json({ token, user: { id: row.id, name: row.name, email: row.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Profile
app.get('/user', verifyToken, async (req, res) => {
  try {
    const row = await db.get('SELECT id, name, email, profession, domain, tools, sentinelTone FROM users WHERE id = ?', [req.userId]);
    if (!row) return res.status(404).json({ error: 'User not found' });
    res.json({ user: row });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Purge User Data (Master Reset)
app.delete('/user', verifyToken, async (req, res) => {
  try {
    await db.run('DELETE FROM users WHERE id = ?', [req.userId]);
    // In a real app, you'd also delete their projects, clients, etc. here
    res.json({ success: true, message: 'Identity and data purged from core.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default app;
