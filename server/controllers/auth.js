const admin = require('../config/firebase');
const pool = require('../config/db');
const jwt = require('jsonwebtoken');

// Helper function to ensure JWT_SECRET is defined
const ensureJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
};

exports.googleLogin = async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) {
    return res.status(400).json({ error: 'No idToken provided' });
  }

  try {
    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { email, uid } = decodedToken;

    // Insert or update the user in the database
    const user = await pool.query(
      'INSERT INTO users (email, firebase_uid) VALUES ($1, $2) ON CONFLICT (firebase_uid) DO UPDATE SET email = $1 RETURNING *',
      [email, uid]
    );

    // Generate a JWT
    ensureJwtSecret();
    const token = jwt.sign({ uid }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ user: user.rows[0], token });
  } catch (error) {
    console.error('Google Login error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

exports.signup = async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) {
    return res.status(400).json({ error: 'No idToken provided' });
  }

  try {
    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { email, uid } = decodedToken;

    // Insert or update the user in the database
    const user = await pool.query(
      'INSERT INTO users (email, firebase_uid) VALUES ($1, $2) ON CONFLICT (firebase_uid) DO UPDATE SET email = $1 RETURNING *',
      [email, uid]
    );

    // Generate a JWT
    ensureJwtSecret();
    const token = jwt.sign({ uid }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ user: user.rows[0], token });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) {
    return res.status(400).json({ error: 'No idToken provided' });
  }

  try {
    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { email, uid } = decodedToken;

    // Check if the user exists in the database
    const user = await pool.query('SELECT * FROM users WHERE firebase_uid = $1', [uid]);
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate a JWT
    ensureJwtSecret();
    const token = jwt.sign({ uid }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ user: user.rows[0], token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getUser = async (req, res) => {
  const userId = req.user.uid;
  try {
    const result = await pool.query('SELECT * FROM users WHERE firebase_uid = $1', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get User error:', error);
    res.status(500).json({ error: error.message });
  }
};