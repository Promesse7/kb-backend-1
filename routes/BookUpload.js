const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Book = require('../models/Book');
const user = require('../models/User');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/covers';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

const requireAdmin = (req, res, next) => {
  if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
  }

  if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
  }

  next();
};



// 2. Backend middleware/auth.js - Add debugging
const authenticateToken = async (req, res, next) => {
  try {
    console.log('Headers received:', req.headers); // Debug log

    const authHeader = req.headers.authorization;
    console.log('Auth header:', authHeader); // Debug log

    if (!authHeader?.startsWith('Bearer ')) {
      console.log('No Bearer token found'); // Debug log
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    console.log('Token extracted:', token); // Debug log

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'a8d9b5f4f7@J9#6l3o1Yw$Tp9Z!7kX2Lm6C^uE8v3ZgM7h5K4Xz0hD9aM1P'
    );
    console.log('Decoded token:', decoded); // Debug log

    // Fetch user from database to ensure they still exist and have admin rights
    const user = await User.findById(decoded.id);
    if (!user) {
      console.log('User not found in database'); // Debug log
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = {
      id: user._id,
      role: user.role
    };
    console.log('User set in request:', req.user); // Debug log

    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ message: 'Invalid token' });
  }
};




const router = express.Router();
router.post('/', requireAdmin, authenticateToken, upload.single('coverImage'), async (req, res) => {
  console.log('Request reached route handler'); // Debug log
    console.log('User in request:', req.user); // Debug log
  try {
    const chapters = JSON.parse(req.body.chapters);
    if (!chapters || !chapters.length) {
      return res.status(400).json({ message: 'No chapters provided' });
    }

    let coverImageUrl = null;
    if (req.file) {
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;
      const uploadResponse = await cloudinary.uploader.upload(dataURI, {
        folder: 'book-covers'
      });
      coverImageUrl = uploadResponse.secure_url;
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
      coverImage: coverImageUrl,
      uploadedBy: req.userId
    });

    await book.save();

    res.status(201).json({
      message: 'Book created successfully',
      book: {
        id: book._id,
        title: book.title,
        coverImage: coverImageUrl
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

// Update these routes to be relative to the mounted path
router.get('/list', async (req, res) => {
  try {
    const books = await Book.find()
      .select('-chapters.content')
      .sort({ createdAt: -1 });
    res.json(books);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching books', error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    res.json(book);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching book', error: error.message });
  }
});

module.exports = router;