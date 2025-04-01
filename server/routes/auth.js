const express = require('express');
const router = express.Router();
const { googleLogin, signup, login, getUser } = require('../controllers/auth');
const verifyToken = require('../middleware/auth');
const sendEmail = require('../utils/sendEmail');

router.post('/google-login', googleLogin);
router.post('/signup', signup);
router.post('/login', login);

router.get('/user', verifyToken, getUser);

router.get('/test-email', async (req, res) => {
  try {
    await sendEmail('brai05430@gmail.com', 'Test Email', 'This is a test email from SendGrid.');
    res.json({ message: 'Test email sent' });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ error: 'Failed to send test email', details: error.message });
  }
});

module.exports = router;