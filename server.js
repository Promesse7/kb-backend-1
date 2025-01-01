const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User'); // Adjust path
require('dotenv').config();
const { CloudinaryStorage } = require('multer-storage-cloudinary'); 
const cloudinary = require('./CloudinaryConfig'); // Ensure this file exists

const app = express();
const PORT = process.env.PORT || 5000;


// Admin credentials
const  ADMIN_CREDENTIALS = {
  email: 'admin@hblibrary.com',
  password: 'admin123',
};


const multer = require('multer');
const storage = new CloudinaryStorage({ 
cloudinary: cloudinary, params: {
  folder: 'avatars', 
  format: async (req, file) => 'jpg',
    public_id: (req, file) => `${Date.now()}-${file.originalname}`, 
    }, 
  });

const upload = multer({ storage });


// Enable CORS
const corsOptions = {
  origin: 'http://localhost:3000', // Allow requests only from your frontend
  credentials: true,               // Allow cookies and credentials
};
app.use(cors(corsOptions));

app.use(express.json());

// Example route
app.get('/api/auth/check-status', (req, res) => {
  res.json({ isAuthenticated: true }); // Mock response
});

app.get('/', (req, res) => {
  res.send('Welcome to the HB Library backend API!');
});

// Define Router
const router = express.Router();

// Registration route
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    console.log('Registration attempt:', {
      email: email.toLowerCase(),
      providedPassword: password  // Only log during debugging
    });

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Create user with plain password - the model's pre-save hook will hash it
    const user = new User({ 
      name, 
      email: email.toLowerCase(), 
      password: password  // Pass the plain password
    });
    await user.save();

    console.log('User saved:', {
      email: user.email,
      storedHash: user.password
    });

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    // Send response with token
    res.status(201).json({ message: 'User registered successfully', token });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt details:', {
      email: email.toLowerCase(),
      providedPassword: password,  // Only log during debugging
    });

    // Check for admin credentials
    if (email.toLowerCase() === ADMIN_CREDENTIALS.email && 
    password === ADMIN_CREDENTIALS.password) {
    const token = jwt.sign(
    { 
      id: 'admin',
      role: 'admin',
      permissions: ['upload_books', 'manage_books']
    }, 
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  return res.status(200).json({
    message: 'Admin login successful',
    token,
    isAdmin: true
  });
}




    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log('User not found');
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    console.log('Found user:', {
      email: user.email,
      storedHash: user.password
    });

    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password comparison:', {
      providedPassword: password,  // Only log during debugging
      passwordMatch: isMatch
    });

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    // Use the same JWT secret as registration
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});



// Middleware to verify JWT
const authenticate = (req, res, next) => {
  const token = req.header('Authorization').replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    console.log('Authenticated User ID:', req.userId); // Debugging line
    next();
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized' });
  }
};



// Fetch User Route
router.get('/user', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    console.log('Fetching profile for User ID:', userId); // Debugging line

    const user = await User.findById(userId);
    if (!user) {
      console.error('User not found for ID:', userId); // Debugging line
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


// Avatar upload route
router.post('/user/avatar', authenticate, upload.single('avatar'), async (req, res) => {
  try {
    const userId = req.userId;
    console.log('User ID:', userId); // Debugging line
    const avatarUrl = req.file.path;
    console.log('Uploaded Avatar URL:', avatarUrl); // Debugging line

    const user = await User.findByIdAndUpdate(userId, { avatar: avatarUrl }, { new: true });
    if (!user) {
      console.error('User not found for ID:', userId); // Debugging line
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user profile
router.put('/user', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    console.log('Updating profile for User ID:', userId); // Debugging line

    const updatedData = req.body;
    console.log('Updated Data:', updatedData); // Debugging line

    const user = await User.findByIdAndUpdate(userId, updatedData, { new: true });
    if (!user) {
      console.error('User not found for ID:', userId); // Debugging line
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Updated User:', user); // Debugging line
    res.json(user);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});





// Use router
app.use('/api/auth', router);
app.use('/api/upload-book', router);

// Database connection
mongoose.connect( 'mongodb+srv://promesserukundo:papa32.ruru@hb-cluster.t9u7h.mongodb.net/Hb-library?retryWrites=true&w=majority&appName=hb-cluster'
  ).then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('Database connection error:', err));

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
