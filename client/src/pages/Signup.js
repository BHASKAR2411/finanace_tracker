import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import axios from 'axios';

const Signup = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();

      const response = await axios.post('http://localhost:5000/auth/signup', {
        idToken,
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user_id', response.data.user.id);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    navigate('/');
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoContainer}>
          <div style={styles.logo}>👤</div>
        </div>
        <h1 style={styles.title}>Create Account</h1>
        <p style={styles.subtitle}>Sign up to get started</p>
        
        {error && <div style={styles.errorContainer}>
          <p style={styles.error}>{error}</p>
        </div>}
        
        <form onSubmit={handleSignup} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />
          </div>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
            />
          </div>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>Confirm Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={styles.input}
              required
            />
          </div>
          
          <button 
            type="submit" 
            style={isLoading ? {...styles.button, ...styles.buttonDisabled} : styles.button}
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        
        <div style={styles.divider}>
          <span style={styles.dividerText}>or sign up with</span>
        </div>
        
        <button 
          style={isLoading ? {...styles.googleButton, ...styles.buttonDisabled} : styles.googleButton} 
          onClick={handleGoogleSignup}
          disabled={isLoading}
        >
          <span style={styles.googleIcon}>G</span>
          <span>Google</span>
        </button>
        
        <p style={styles.link}>
          Already have an account? <a href="/" style={styles.linkText}>Log In</a>
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '20px',
    backgroundColor: '#f7f9fc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    padding: '40px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    transition: 'transform 0.2s ease',
  },
  logoContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '24px',
  },
  logo: {
    fontSize: '40px',
    width: '70px',
    height: '70px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    backgroundColor: '#f0f7ff',
    color: '#4285f4',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#333',
    margin: '0 0 8px 0',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '32px',
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  inputGroup: {
    marginBottom: '20px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#444',
    marginBottom: '8px',
    display: 'block',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    backgroundColor: '#fafafa',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
    outline: 'none',
  },
  button: {
    padding: '14px 20px',
    fontSize: '16px',
    fontWeight: '600',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s, transform 0.1s',
    marginTop: '10px',
  },
  buttonDisabled: {
    backgroundColor: '#a5d6a7',
    cursor: 'not-allowed',
  },
  googleButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '14px 20px',
    fontSize: '16px',
    fontWeight: '600',
    backgroundColor: 'white',
    color: '#444',
    border: '1px solid #ddd',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s, transform 0.1s',
    marginTop: '10px',
  },
  googleIcon: {
    fontWeight: 'bold',
    color: '#4285f4',
    fontSize: '18px',
  },
  divider: {
    position: 'relative',
    margin: '30px 0',
    textAlign: 'center',
  },
  dividerText: {
    backgroundColor: 'white',
    padding: '0 10px',
    color: '#777',
    fontSize: '14px',
    position: 'relative',
    zIndex: '1',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '20px',
    borderLeft: '4px solid #f44336',
  },
  error: {
    color: '#d32f2f',
    margin: 0,
    fontSize: '14px',
  },
  link: {
    marginTop: '30px',
    fontSize: '15px',
    textAlign: 'center',
    color: '#666',
  },
  linkText: {
    color: '#4285F4',
    textDecoration: 'none',
    fontWeight: '600',
  },
};

export default Signup;