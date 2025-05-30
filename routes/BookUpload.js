const express = require('express');
const jwt = require('jsonwebtoken');
const Book = require('../models/Book');
const User = require('../models/User');
const multer = require('multer');
const upload = multer();
const router = express.Router();

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



// Updated route without multer middleware since we're expecting a URL
router.post('/', authenticateToken, upload.none(), async (req, res) => {
  console.log('Request reached route handler');
  console.log('User in request:', req.user);
  
  try {
    // Log the incoming data for debugging
    console.log('Received form data:', {
      title: req.body.title,
      author: req.body.author,
      chaptersRaw: req.body.chapters
    });

    // Safely parse chapters
    let chapters;
    try {
      chapters = JSON.parse(req.body.chapters);
    } catch (parseError) {
      console.error('Chapters parsing error:', parseError);
      return res.status(400).json({ 
        message: 'Invalid chapters data',
        error: parseError.message 
      });
    }

    if (!chapters || !Array.isArray(chapters) || chapters.length === 0) {
      return res.status(400).json({ message: 'No valid chapters provided' });
    }

    const book = new Book({
      title: req.body.title,
      author: req.body.author,
      description: req.body.description,
      isbn: req.body.isbn,
      category: req.body.category,
      publicationYear: parseInt(req.body.publicationYear),
      publisher: req.body.publisher,
      language: req.body.language,
      chapters: chapters.map(chapter => ({
        title: chapter.title,
        content: chapter.content,
        chapterNumber: chapter.chapterNumber
      })),
      coverImage: req.body.coverImage,
      uploadedBy: req.user.id
    });

    await book.save();

    res.status(201).json({
      message: 'Book created successfully',
      book: {
        id: book._id,
        title: book.title,
        coverImage: book.coverImage
      }
    });

  } catch (error) {
    console.error('Book creation error:', error);
    res.status(500).json({ 
      message: 'Error creating book', 
      error: error.message 
    });
  }
});

// PUT route to update an existing book
router.put('/:id', authenticateToken, upload.none(), async (req, res) => {
  console.log('PUT request reached route handler');
  console.log('User in request:', req.user);

  try {
    const { id } = req.params;

    // Log the incoming data for debugging
    console.log('Received form data for update:', {
      title: req.body.title,
      author: req.body.author,
      chaptersRaw: req.body.chapters
    });

    // Safely parse chapters
    let chapters;
    try {
      chapters = JSON.parse(req.body.chapters);
    } catch (parseError) {
      console.error('Chapters parsing error:', parseError);
      return res.status(400).json({ 
        message: 'Invalid chapters data',
        error: parseError.message 
      });
    }

    if (!chapters || !Array.isArray(chapters) || chapters.length === 0) {
      return res.status(400).json({ message: 'No valid chapters provided' });
    }

    // Prepare the update data
    const updateData = {
      title: req.body.title,
      author: req.body.author,
      description: req.body.description,
      isbn: req.body.isbn,
      category: req.body.category,
      publicationYear: parseInt(req.body.publicationYear),
      publisher: req.body.publisher,
      language: req.body.language,
      chapters: chapters.map(chapter => ({
        title: chapter.title,
        content: chapter.content,
        chapterNumber: chapter.chapterNumber
      })),
      coverImage: req.body.coverImage,
      uploadedBy: req.user.id,
      updatedAt: new Date() // Track when the book was last updated
    };

    // Find and update the book
    const updatedBook = await Book.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true } // Return the updated document, run schema validators
    );

    if (!updatedBook) {
      return res.status(404).json({ message: 'Book not found' });
    }

    res.status(200).json({
      message: 'Book updated successfully',
      book: {
        id: updatedBook._id,
        title: updatedBook.title,
        coverImage: updatedBook.coverImage,
        // Include other fields as needed
        ...updatedBook.toObject()
      }
    });
  } catch (error) {
    console.error('Book update error:', error);
    res.status(500).json({ 
      message: 'Error updating book', 
      error: error.message 
    });
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