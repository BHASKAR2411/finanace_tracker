// // const pool = require('../config/db');

// // exports.addBudget = async (req, res) => {
//   const { user_id, category, amount } = req.body;
//   try {
//     const result = await pool.query(
//       'INSERT INTO budgets (user_id, category, amount) VALUES ($1, $2, $3) RETURNING *',
//       [user_id, category, amount]
//     );
//     res.json(result.rows[0]);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };