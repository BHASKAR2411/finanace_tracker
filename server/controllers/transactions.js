const pool = require('../config/db');
const sendEmail = require('../utils/sendEmail');

const largeTransactionThreshold = 1000.00;

exports.addTransaction = async (req, res) => {
  const { user_id, type, source, category, amount, date, description, receipt_url, split_with } = req.body;
  const table = type === 'income' ? 'income' : 'expenses';

  try {
    // Insert the transaction
    const result = await pool.query(
      `INSERT INTO ${table} (user_id, ${type === 'income' ? 'source' : 'category'}, amount, date, description, receipt_url)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [user_id, source || category, amount, date, description, type === 'expense' ? receipt_url : null]
    );
    const transaction = result.rows[0];

    // Get user email
    const user = await pool.query('SELECT email FROM users WHERE id = $1', [user_id]);
    const userEmail = user.rows[0]?.email;

    if (!userEmail) {
      return res.status(400).json({ error: 'User email not found' });
    }

    // Handle expense splitting (only for expenses)
    if (type === 'expense' && split_with && split_with.length > 0) {
      const splitCount = split_with.length + 1; // Include the user
      const amountPerPerson = parseFloat(amount) / splitCount;

      for (const splitEmail of split_with) {
        await pool.query(
          'INSERT INTO split_expenses (expense_id, user_id, split_with_email, amount_owed) VALUES ($1, $2, $3, $4)',
          [transaction.id, user_id, splitEmail, amountPerPerson]
        );

        // Notify the person via email
        await sendEmail(
          splitEmail,
          'Expense Split Notification',
          `You owe $${amountPerPerson.toFixed(2)} to ${userEmail} for an expense: ${description} ($${amount}) on ${date}.`
        );
      }
    }

    // Check for large transaction
    if (parseFloat(amount) > largeTransactionThreshold) {
      await sendEmail(
        userEmail,
        'Large Transaction Alert',
        `You made a large ${type} of $${amount} on ${date}. Description: ${description}`
      );
    }

    // Check budget threshold (for expenses only)
    if (type === 'expense') {
      const budget = await pool.query(
        'SELECT amount FROM budgets WHERE user_id = $1 AND category = $2',
        [user_id, category]
      );
      const budgetLimit = budget.rows[0]?.amount;

      if (budgetLimit) {
        const totalExpenses = await pool.query(
          'SELECT SUM(amount) as total FROM expenses WHERE user_id = $1 AND category = $2',
          [user_id, category]
        );
        const total = parseFloat(totalExpenses.rows[0].total);

        if (total > budgetLimit) {
          await sendEmail(
            userEmail,
            'Budget Threshold Exceeded',
            `You have exceeded your budget for ${category}. Budget: $${budgetLimit}, Total Spent: $${total}`
          );
        }
      }
    }

    res.json(transaction);
  } catch (error) {
    console.error('Error adding transaction:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getIncome = async (req, res) => {
  const userId = req.user.uid;
  try {
    const result = await pool.query(
      'SELECT * FROM income WHERE user_id = (SELECT id FROM users WHERE firebase_uid = $1)',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching income:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getExpenses = async (req, res) => {
  const userId = req.user.uid;
  try {
    const result = await pool.query(
      'SELECT * FROM expenses WHERE user_id = (SELECT id FROM users WHERE firebase_uid = $1)',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getSplitExpenses = async (req, res) => {
  const userId = req.user.uid;
  try {
    const result = await pool.query(
      `SELECT se.*, e.category, e.amount as total_amount, e.date, e.description
       FROM split_expenses se
       JOIN expenses e ON se.expense_id = e.id
       WHERE se.user_id = (SELECT id FROM users WHERE firebase_uid = $1)`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching split expenses:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.editTransaction = async (req, res) => {
  const { id } = req.params;
  const { type, source, category, amount, date, description, receipt_url, split_with } = req.body;
  const userId = req.user.uid;
  const table = type === 'income' ? 'income' : 'expenses';

  try {
    // Fetch the user_id from the users table using firebase_uid
    const userResult = await pool.query('SELECT id, email FROM users WHERE firebase_uid = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const dbUserId = userResult.rows[0].id;
    const userEmail = userResult.rows[0].email;

    // Fetch the existing transaction to get the old amount (for budget recalculation)
    const existingTransaction = await pool.query(
      `SELECT * FROM ${table} WHERE id = $1 AND user_id = $2`,
      [id, dbUserId]
    );
    if (existingTransaction.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found or not authorized' });
    }
    const oldAmount = parseFloat(existingTransaction.rows[0].amount);
    const oldCategory = type === 'income' ? existingTransaction.rows[0].source : existingTransaction.rows[0].category;

    // Update the transaction
    const result = await pool.query(
      `UPDATE ${table} 
       SET ${type === 'income' ? 'source' : 'category'} = $1, amount = $2, date = $3, description = $4, receipt_url = $5 
       WHERE id = $6 AND user_id = $7 RETURNING *`,
      [source || category, amount, date, description, type === 'expense' ? receipt_url : null, id, dbUserId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found or not authorized' });
    }
    const updatedTransaction = result.rows[0];

    // Handle expense splitting (only for expenses)
    if (type === 'expense') {
      // Delete existing split expenses
      await pool.query('DELETE FROM split_expenses WHERE expense_id = $1', [id]);

      // Add new split expenses if split_with is provided
      if (split_with && split_with.length > 0) {
        const splitCount = split_with.length + 1; // Include the user
        const amountPerPerson = parseFloat(amount) / splitCount;

        for (const splitEmail of split_with) {
          await pool.query(
            'INSERT INTO split_expenses (expense_id, user_id, split_with_email, amount_owed) VALUES ($1, $2, $3, $4)',
            [id, dbUserId, splitEmail, amountPerPerson]
          );

          // Notify the person via email
          await sendEmail(
            splitEmail,
            'Expense Split Notification (Updated)',
            `You now owe $${amountPerPerson.toFixed(2)} to ${userEmail} for an updated expense: ${description} ($${amount}) on ${date}.`
          );
        }
      }
    }

    // Check for large transaction
    if (parseFloat(amount) > largeTransactionThreshold) {
      await sendEmail(
        userEmail,
        'Large Transaction Alert',
        `You updated a large ${type} to $${amount} on ${date}. Description: ${description}`
      );
    }

    // Check budget threshold (for expenses only)
    if (type === 'expense') {
      const budget = await pool.query(
        'SELECT amount FROM budgets WHERE user_id = $1 AND category = $2',
        [dbUserId, category]
      );
      const budgetLimit = budget.rows[0]?.amount;

      if (budgetLimit) {
        const totalExpenses = await pool.query(
          'SELECT SUM(amount) as total FROM expenses WHERE user_id = $1 AND category = $2',
          [dbUserId, category]
        );
        const total = parseFloat(totalExpenses.rows[0].total);

        if (total > budgetLimit) {
          await sendEmail(
            userEmail,
            'Budget Threshold Exceeded',
            `You have exceeded your budget for ${category}. Budget: $${budgetLimit}, Total Spent: $${total}`
          );
        } else if (oldCategory === category) {
          // If the category hasn't changed, check if the old total exceeded the budget but the new total doesn't
          const oldTotalExpenses = total - parseFloat(amount) + oldAmount;
          if (oldTotalExpenses > budgetLimit && total <= budgetLimit) {
            await sendEmail(
              userEmail,
              'Budget Threshold Restored',
              `Your spending for ${category} is now within budget. Budget: $${budgetLimit}, Total Spent: $${total}`
            );
          }
        }
      }

      // If the category changed, check the old category as well
      if (oldCategory !== category) {
        const oldBudget = await pool.query(
          'SELECT amount FROM budgets WHERE user_id = $1 AND category = $2',
          [dbUserId, oldCategory]
        );
        const oldBudgetLimit = oldBudget.rows[0]?.amount;

        if (oldBudgetLimit) {
          const oldTotalExpenses = await pool.query(
            'SELECT SUM(amount) as total FROM expenses WHERE user_id = $1 AND category = $2',
            [dbUserId, oldCategory]
          );
          const oldTotal = parseFloat(oldTotalExpenses.rows[0].total);

          if (oldTotal <= oldBudgetLimit) {
            await sendEmail(
              userEmail,
              'Budget Threshold Restored',
              `Your spending for ${oldCategory} is now within budget after updating an expense. Budget: $${oldBudgetLimit}, Total Spent: $${oldTotal}`
            );
          }
        }
      }
    }

    res.json(updatedTransaction);
  } catch (error) {
    console.error('Error editing transaction:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.deleteTransaction = async (req, res) => {
  const { id } = req.params;
  const { type } = req.body;
  const userId = req.user.uid;
  const table = type === 'income' ? 'income' : 'expenses';

  try {
    // Fetch the user_id from the users table using firebase_uid
    const userResult = await pool.query('SELECT id, email FROM users WHERE firebase_uid = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const dbUserId = userResult.rows[0].id;
    const userEmail = userResult.rows[0].email;

    // Fetch the existing transaction to get the category and amount (for budget recalculation)
    const existingTransaction = await pool.query(
      `SELECT * FROM ${table} WHERE id = $1 AND user_id = $2`,
      [id, dbUserId]
    );
    if (existingTransaction.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found or not authorized' });
    }
    const oldAmount = parseFloat(existingTransaction.rows[0].amount);
    const oldCategory = type === 'income' ? existingTransaction.rows[0].source : existingTransaction.rows[0].category;

    // Delete associated split expenses (if expense)
    if (type === 'expense') {
      await pool.query('DELETE FROM split_expenses WHERE expense_id = $1', [id]);
    }

    // Delete the transaction
    const result = await pool.query(
      `DELETE FROM ${table} WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, dbUserId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found or not authorized' });
    }

    // Check budget threshold (for expenses only)
    if (type === 'expense') {
      const budget = await pool.query(
        'SELECT amount FROM budgets WHERE user_id = $1 AND category = $2',
        [dbUserId, oldCategory]
      );
      const budgetLimit = budget.rows[0]?.amount;

      if (budgetLimit) {
        const totalExpenses = await pool.query(
          'SELECT SUM(amount) as total FROM expenses WHERE user_id = $1 AND category = $2',
          [dbUserId, oldCategory]
        );
        const total = parseFloat(totalExpenses.rows[0].total) || 0;

        const oldTotalExpenses = total + oldAmount;
        if (oldTotalExpenses > budgetLimit && total <= budgetLimit) {
          await sendEmail(
            userEmail,
            'Budget Threshold Restored',
            `Your spending for ${oldCategory} is now within budget after deleting an expense. Budget: $${budgetLimit}, Total Spent: $${total}`
          );
        }
      }
    }

    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: error.message });
  }
};