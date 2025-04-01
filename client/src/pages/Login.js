import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/config';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import axios from 'axios';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      console.log('Token found in localStorage, redirecting to dashboard...');
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      console.log('Attempting to sign in with email:', email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Firebase sign-in successful:', userCredential.user.email);
      const idToken = await userCredential.user.getIdToken();
      console.log('Firebase ID token obtained:', idToken);

      console.log('Sending request to backend /auth/login...');
      const response = await axios.post('http://localhost:5000/auth/login', {
        idToken,
      });
      console.log('Backend response:', response.data);

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user_id', response.data.user.id);
      console.log('Stored token and user_id in localStorage');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      console.log('Attempting Google Sign-In...');
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      console.log('Google Sign-In successful:', result.user.email);
      const idToken = await result.user.getIdToken();
      console.log('Firebase ID token obtained:', idToken);

      console.log('Sending request to backend /auth/google...');
      const res = await axios.post('http://localhost:5000/auth/google-login', { idToken });
      console.log('Backend response:', res.data);

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user_id', res.data.user.id);
      console.log('Stored token and user_id in localStorage');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Google Login error:', error);
      setError(error.response?.data?.error || 'Google Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoContainer}>
          <div style={styles.logo}>🔐</div>
        </div>
        <h1 style={styles.title}>Personal Finance Tracker</h1>
        <p style={styles.subtitle}>Sign in to continue to your account</p>
        
        {error && <div style={styles.errorContainer}>
          <p style={styles.error}>{error}</p>
        </div>}
        
        <form onSubmit={handleLogin} style={styles.form}>
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
            <div style={styles.labelContainer}>
              <label style={styles.label}>Password</label>
              <a href="#forgot" style={styles.forgotPassword}>Forgot password?</a>
            </div>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
            />
          </div>
          
          <button 
            type="submit" 
            style={isLoading ? {...styles.button, ...styles.buttonDisabled} : styles.button}
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <div style={styles.divider}>
          <span style={styles.dividerText}>or continue with</span>
        </div>
        
        <button 
          style={isLoading ? {...styles.googleButton, ...styles.buttonDisabled} : styles.googleButton} 
          onClick={handleGoogleLogin}
          disabled={isLoading}
        >
          <span style={styles.googleIcon}>G</span>
          <span>Google</span>
        </button>
        
        <p style={styles.link}>
          Don't have an account? <a href="/signup" style={styles.linkText}>Sign Up</a>
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
  labelContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#444',
    marginBottom: '8px',
    display: 'block',
  },
  forgotPassword: {
    fontSize: '13px',
    color: '#4285f4',
    textDecoration: 'none',
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
    padding: '30px 20px',
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

export default Login;