const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Book = require('../models/Book');



const authenticateToken = async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
  
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('Authentication failed: No Bearer token found');
        return res.status(401).json({ message: 'No token provided' });
      }
  
      const token = authHeader.split(' ')[1];
      console.log('Token received:', token);
  
      // Verify token
      const decoded = jwt.verify(token, 'a8d9b5f4f7@J9#6l3o1Yw$Tp9Z!7kX2Lm6C^uE8v3ZgM7h5K4Xz0hD9aM1P');
      console.log('Decoded token:', decoded);
  
      // Check if the user exists
      const user = await User.findById(decoded.id);
      if (!user) {
        console.log('User not found in database');
        return res.status(401).json({ message: 'User not found' });
      }
  
      // Attach user info to the request object
      req.user = {
        id: user._id,
        _id: user._id,
        role: user.role
      };
      console.log('User authenticated:', req.user);
  
      next();
    } catch (error) {
      console.error('Token verification error:', error);
  
      if (error.name === 'TokenExpiredError') {
        return res.status(403).json({ message: 'Token expired', error: error.message });
      }
  
      return res.status(403).json({ message: 'Invalid token', error: error.message });
    }
  };
  
// Fetch books route
router.get('/', authenticateToken, async (req, res) => {
  try {
    const books = await Book.find(); // Fetches all fields
    res.json(books);
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ message: 'Error fetching books', error: error.message });
  }
});

module.exports = router;
