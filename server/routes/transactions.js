const express = require('express');
const {
  addTransaction,
  getIncome,
  getExpenses,
  getSplitExpenses,
  editTransaction,
  deleteTransaction,
} = require('../controllers/transactions');
const verifyToken = require('../middleware/auth');
const router = express.Router();

// Existing routes
router.post('/add', verifyToken, addTransaction);
router.get('/income', verifyToken, getIncome);
router.get('/expenses', verifyToken, getExpenses);
router.get('/split-expenses', verifyToken, getSplitExpenses);

// New routes for editing and deleting transactions
router.put('/:id', verifyToken, editTransaction);
router.delete('/:id', verifyToken, deleteTransaction);

module.exports = router;