const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No Bearer token found');
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    console.log('Token received:', token);

    const decoded = jwt.verify(token, 'a8d9b5f4f7@J9#6l3o1Yw$Tp9Z!7kX2Lm6C^uE8v3ZgM7h5K4Xz0hD9aM1P');
    console.log('Decoded token:', decoded);

    const user = await User.findById(decoded.id);
    if (!user) {
      console.log('User not found in database');
      return res.status(401).json({ message: 'User not found' });
    }

    // Attach user details to req.user
    req.user = {
      id: user._id,
      _id: user._id,
      role: user.role
    };
    console.log('User authenticated, details set in request:', req.user);

    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    console.error('Token verification error:', error);
    // Handle specific JWT errors (e.g., token expired, invalid token)
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }

    // Generic error response
    return res.status(500).json({ message: 'Authentication failed', error: error.message });
  }
};

module.exports = authenticateToken;
