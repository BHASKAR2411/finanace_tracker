require('dotenv').config();

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const budgetRoutes = require('./routes/budgets');
const pool = require('./config/db');

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use('/auth', authRoutes);
app.use('/transactions', transactionRoutes);
app.use('/budgets', budgetRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

app.use((err, req, res, next) => {
  console.error('Global error:', err);
  const isProduction = process.env.NODE_ENV === 'production';
  res.status(500).json({
    error: 'Internal server error',
    details: isProduction ? 'An unexpected error occurred' : err.message,
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await pool.connect();
    console.log('Connected to Neon Postgres');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
};

startServer();