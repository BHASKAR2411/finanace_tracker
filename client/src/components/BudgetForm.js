import React, { useState } from 'react';
import axios from 'axios';

const BudgetForm = () => {
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const user_id = localStorage.getItem('user_id');
      await axios.post(
        'http://localhost:5000/budgets/add',
        { user_id, category, amount }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Budget added successfully');
      setCategory('');
      setAmount('');
    } catch (error) {
      console.error('Error adding budget:', error);
      alert('Failed to add budget');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h3>Set Budget</h3>
      <input
        type="text"
        placeholder="Category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        style={styles.input}
      />
      <input
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        style={styles.input}
      />
      <button type="submit" style={styles.button}>Add Budget</button>
    </form>
  );
};

const styles = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '300px',
    margin: '20px auto',
  },
  input: {
    margin: '10px 0',
    padding: '8px',
    fontSize: '16px',
  },
  button: {
    padding: '10px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
};

export default BudgetForm;