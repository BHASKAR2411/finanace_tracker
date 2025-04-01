import React, { useState } from 'react';
import axios from 'axios';

const IncomeForm = ({ onTransactionAdded }) => {
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const user_id = localStorage.getItem('user_id') || 1;

      if (!token) {
        alert('You must be logged in to add income.');
        return;
      }

      await axios.post(
        'http://localhost:5000/transactions/add',
        {
          user_id,
          type: 'income',
          source,
          amount,
          date: date || new Date().toISOString().split('T')[0],
          description,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Income added successfully');
      onTransactionAdded();
      setSource('');
      setAmount('');
      setDate('');
      setDescription('');
    } catch (error) {
      console.error('Error adding income:', error);
      alert('Failed to add income: ' + (error.response?.data?.error || error.message));
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h3>Add Income</h3>
      <input
        type="text"
        placeholder="Source (e.g., Salary)"
        value={source}
        onChange={(e) => setSource(e.target.value)}
        style={styles.input}
        required
      />
      <input
        type="number"
        placeholder="Amount (e.g., 5000)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        style={styles.input}
        required
      />
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        style={styles.input}
      />
      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        style={styles.textarea}
      />
      <button type="submit" style={styles.button}>Add Income</button>
    </form>
  );
};

const styles = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '300px',
    margin: '10px auto',
    padding: '20px',
    border: '1px solid #ccc',
    borderRadius: '5px',
    backgroundColor: '#2c9ec3',
  },
  input: {
    margin: '10px 0',
    padding: '8px',
    fontSize: '16px',
    border: '1px solid #ccc',
    borderRadius: '5px',
  },
  textarea: {
    margin: '10px 0',
    padding: '8px',
    fontSize: '16px',
    border: '1px solid #ccc',
    borderRadius: '5px',
    minHeight: '80px',
  },
  button: {
    padding: '10px',
    backgroundColor: '#063970',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '16px',
  },
};

export default IncomeForm;