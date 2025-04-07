const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Chapter title is required'],
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Chapter content is required']
  }
});

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Book title is required'],
    trim: true
  },
  author: {
    type: String,
    required: [true, 'Author name is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Book description is required'],
    trim: true
  },
  chapters: [chapterSchema],
  coverImage: {
    type: String,
    required: false
  },
  isbn: {
    type: String,
    required: [true, 'ISBN is required'],
    unique: true,
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'Fiction', 'Non-Fiction', 'Science', 'Technology',  'Biography',
      'Romance', 'Business', 'Self-Help', 'History',
    'Arts', 'Poetry', 'Drama',  'Other']
  },
  publicationYear: {
    type: Number,
    required: [true, 'Publication year is required'],
    min: 1800,
    max: new Date().getFullYear()
  },
  publisher: {
    type: String,
    required: [true, 'Publisher is required'],
    trim: true
  },
  language: {
    type: String,
    required: [true, 'Language is required'],
    default: 'English'
  },
 
  availability: {
    type: Boolean,
    default: true
  },
  favorites: {
    type: [mongoose.Schema.Types.ObjectId], // Array of userIds who have marked the book as favorite
    ref: 'User'
  },
  likes: {
    type: [mongoose.Schema.Types.ObjectId], // Array of userIds who liked the book
    ref: 'User'
  },
  tags: {
    type: [String],  // Array of tags, e.g., ["technology", "AI", "education"]
    required: false,
    trim: true
  },
  ratings: [
    {
      userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
      },
      rating: {
        type: Number,
        min: 0,
        max: 5
      },
      review: {
        type: String,
        trim: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  
  downloads: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

const Book = mongoose.model('Book', bookSchema);

module.exports = Book;