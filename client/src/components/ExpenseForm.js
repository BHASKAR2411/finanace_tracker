import React, { useState } from 'react';
import axios from 'axios';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '../firebase/config';

const ExpenseForm = ({ onTransactionAdded }) => {
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [splitEmails, setSplitEmails] = useState([]);
  const [currentSplitEmail, setCurrentSplitEmail] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleAddSplitEmail = () => {
    if (currentSplitEmail && !splitEmails.includes(currentSplitEmail)) {
      setSplitEmails([...splitEmails, currentSplitEmail]);
      setCurrentSplitEmail('');
    }
  };

  const handleRemoveSplitEmail = (email) => {
    setSplitEmails(splitEmails.filter((e) => e !== email));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const user_id = localStorage.getItem('user_id') || 1;

      if (!token) {
        alert('You must be logged in to add an expense.');
        return;
      }
      if (!auth.currentUser) {
        alert('User not authenticated. Please log in again.');
        return;
      }

      const firebaseUid = auth.currentUser.uid;

      let receipt_url = null;
      if (receipt) {
        const storageRef = ref(storage, `receipts/${firebaseUid}/${Date.now()}_${receipt.name}`);
        await uploadBytes(storageRef, receipt);
        receipt_url = await getDownloadURL(storageRef);
      }

      await axios.post(
        'https://finanace-tracker-backend.onrender.com/transactions/add',
        {
          user_id,
          type: 'expense',
          category,
          amount,
          date: date || new Date().toISOString().split('T')[0],
          description,
          receipt_url,
          split_with: splitEmails,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Expense added successfully');
      onTransactionAdded();
      setCategory('');
      setAmount('');
      setDate('');
      setDescription('');
      setReceipt(null);
      setSplitEmails([]);
      setCurrentSplitEmail('');
    } catch (error) {
      console.error('Error adding expense:', error);
      alert('Failed to add expense: ' + (error.response?.data?.error || error.message));
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h3>Add Expense</h3>
      <input
        type="text"
        placeholder="Category (e.g., Rent)"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        style={styles.input}
        required
      />
      <input
        type="number"
        placeholder="Amount (e.g., 1200)"
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
      <label style={styles.label}>Upload Receipt (optional):</label>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setReceipt(e.target.files[0])}
        style={styles.input}
      />
      <label style={styles.label}>Split With (optional):</label>
      <div style={styles.splitContainer}>
        <input
          type="email"
          placeholder="Email to split with"
          value={currentSplitEmail}
          onChange={(e) => setCurrentSplitEmail(e.target.value)}
          style={styles.input}
        />
        <button
          type="button"
          onClick={handleAddSplitEmail}
          style={styles.addButton}
        >
          Add
        </button>
      </div>
      {splitEmails.length > 0 && (
        <div style={styles.splitList}>
          {splitEmails.map((email) => (
            <div key={email} style={styles.splitItem}>
              <span>{email}</span>
              <button
                type="button"
                onClick={() => handleRemoveSplitEmail(email)}
                style={styles.removeButton}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
      <button type="submit" style={styles.button} disabled={uploading}>
        {uploading ? 'Uploading...' : 'Add Expense'}
      </button>
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
  label: {
    marginTop: '10px',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  splitContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  splitList: {
    margin: '10px 0',
  },
  splitItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '5px',
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '5px',
    marginBottom: '5px',
  },
  addButton: {
    padding: '8px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
  removeButton: {
    padding: '5px 10px',
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
  button: {
    padding: '10px',
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '16px',
  },
};

export default ExpenseForm;
