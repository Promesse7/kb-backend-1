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
    console.log('Book upload - Token received:', token);

    const decoded = jwt.verify(token, 'a8d9b5f4f7@J9#6l3o1Yw$Tp9Z!7kX2Lm6C^uE8v3ZgM7h5K4Xz0hD9aM1P');
    console.log('Book upload - Decoded token:', decoded);

    const user = await User.findById(decoded.id);
    if (!user) {
      console.log('Book upload - User not found in database');
      return res.status(401).json({ message: 'User not found' });
    }

    // Set both id and _id to ensure compatibility
    req.user = {
      id: user._id,
      _id: user._id,
      role: user.role
    };
    console.log('Book upload - User set in request:', req.user);

    next();
  } catch (error) {
    console.error('Book upload - Token verification error:', error);
    return res.status(403).json({ message: 'Invalid token', error: error.message });
  }
};