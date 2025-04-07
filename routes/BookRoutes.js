const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Book = require('../models/Book');
const Comment = require('../models/Comment');  // Adjust the path if needed




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
  router.post('/:id/rate', async (req, res) => {
    const { rating, review } = req.body;
    const book = await Book.findById(req.params.id);
  
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
  
    const user = await User.findById(req.user.id); // Assuming user is authenticated
    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
  
    const existingRating = book.ratings.find(r => r.userId.toString() === user.id.toString());
  
    if (existingRating) {
      existingRating.rating = rating;
      existingRating.review = review;
    } else {
      book.ratings.push({ userId: user.id, rating, review });
    }
  
    // Recalculate average rating
    const totalRatings = book.ratings.length;
    const averageRating = book.ratings.reduce((acc, curr) => acc + curr.rating, 0) / totalRatings;
    
    book.rating.averageRating = averageRating;
    book.rating.totalRatings = totalRatings;
  
    await book.save();
  
    res.status(200).json({ message: 'Rating and review added successfully' });
  });
  router.post('/:id/comment', async (req, res) => {
    const { content } = req.body;
    const book = await Book.findById(req.params.id);
  
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
  
    const comment = new Comment({
      userId: req.user.id, // Assuming user is authenticated
      bookId: book.id,
      content
    });
  
    await comment.save();
  
    // Optionally, you can send a notification here
    const notification = new Notification({
      userId: book.author, // Send notification to the author
      message: `${req.user.username} commented on your book "${book.title}"`
    });
  
    await notification.save();
  
    res.status(201).json({ message: 'Comment added successfully' });
  });
  
  router.post('/:id/like', authenticateToken, async (req, res) => {  // Add authenticateToken here
    try {
      const book = await Book.findById(req.params.id);
      const user = await User.findById(req.user.id); // Assuming user is authenticated
  
      if (!book) {
        return res.status(404).json({ message: 'Book not found' });
      }
  
      if (!user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
  
      // Add user to likes array if not already liked
      if (!book.likes.includes(user.id)) {
        book.likes.push(user.id);
      }
  
      await book.save();
  
      res.status(200).json({ message: 'Book liked successfully' });
    } catch (error) {
      console.error('Error processing like request:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  router.post('/:id/favorite', authenticateToken, async (req, res) => {
    try {
      // Find the book by ID
      const book = await Book.findById(req.params.id);
  
      // Check if the book exists
      if (!book) {
        return res.status(404).json({ message: 'Book not found' });
      }
  
      // Check if the user is authenticated
      const user = await User.findById(req.user.id); // Assuming user is authenticated
      if (!user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
  
      // Add the user to the favorites array if not already in the array
      if (!book.favorites.includes(user.id)) {
        book.favorites.push(user.id);
      }
  
      // Save the updated book
      await book.save();
  
      res.status(200).json({ message: 'Book added to favorites successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error updating book favorites', error: error.message });
    }
  });
  
   
// Fetch books route
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const books = await Book.find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });  // Or any other sorting criteria

    const totalBooks = await Book.countDocuments();

    res.json({
      books,
      totalBooks,
      currentPage: page,
      totalPages: Math.ceil(totalBooks / limit),
    });
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ message: 'Error fetching books', error: error.message });
  }
});


router.get('/:id', async (req, res) => {
  const bookId = req.params.id;  // No need to clean up if it's already a valid ID
  console.log('Fetching book with ID:', bookId);
  
  try {
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    res.json(book);
  } catch (error) {
    console.error('Error fetching book:', error);  // Log full error for debugging
    res.status(500).json({ message: 'Error fetching book', error: error.message });
  }
});




module.exports = router;
