const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  // Extract the token from the Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    // Verify the JWT using JWT_SECRET
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('JWT verified successfully:', decoded);

    // Set req.user with the decoded payload (contains { uid })
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification error:', error.message);
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = verifyToken;