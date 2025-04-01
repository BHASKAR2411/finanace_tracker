const express = require('express');
const { addBudget } = require('../controllers/budgets');
const verifyToken = require('../middleware/auth');
const pool = require('../config/db');
const router = express.Router();

router.post('/add', verifyToken, async (req, res) => {
  const { user_id, category, amount } = req.body;
  const firebaseUid = req.user.uid;

  try {
    const user = await pool.query(
      'SELECT id FROM users WHERE firebase_uid = $1',
      [firebaseUid]
    );
    const actualUserId = user.rows[0]?.id;

    if (!actualUserId || parseInt(user_id) !== actualUserId) {
      return res.status(403).json({ error: 'Unauthorized: Invalid user ID' });
    }

    const result = await pool.query(
      'INSERT INTO budgets (user_id, category, amount) VALUES ($1, $2, $3) RETURNING *',
      [user_id, category, amount]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;