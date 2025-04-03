const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User'); 
require('dotenv').config();
const { CloudinaryStorage } = require('multer-storage-cloudinary'); 
const cloudinary = require('./CloudinaryConfig'); // Ensure this file exists
const bookRoutes = require('./routes/BookUpload');
const bookRoute = require('./routes/BookRoutes');


const app = express();
const PORT = process.env.PORT || 5000;

const multer = require('multer');
const storage = new CloudinaryStorage({ 
cloudinary: cloudinary, params: {
  folder: 'avatars', 
  format: async (req, file) => 'jpg',
    public_id: (req, file) => `${Date.now()}-${file.originalname}`, 
    }, 
  });

const upload = multer({ storage });



// Allowed origins
const allowedOrigins = [
  "http://localhost:3000",
  "https://hb-library.vercel.app",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // Allow cookies/auth headers
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// Explicitly handle preflight (OPTIONS) requests
app.options("*", (req, res) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");
    return res.status(200).end();
  }
  res.status(403).json({ message: "Not allowed by CORS" });
}); // Ensure preflight requests are handled


// Middleware for logging requests (for debugging)
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url} from origin: ${req.headers.origin}`);
  next();
});

// Middleware for parsing JSON
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

     const token = jwt.sign(
                { 
                    id: user._id,
                    role: user.role // Include role in token
                }, 
             'a8d9b5f4f7@J9#6l3o1Yw$Tp9Z!7kX2Lm6C^uE8v3ZgM7h5K4Xz0hD9aM1P',
                { expiresIn: '10h' }
            );

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
   
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log('User not found');
      return res.status(400).json({ message: 'Invalid email or password' });
    }

   

    const isMatch = await bcrypt.compare(password, user.password);
   

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid password' });
    }

     const token = jwt.sign(
                { 
                    id: user._id,
                    role: user.role // Include role in token
                }, 
          'a8d9b5f4f7@J9#6l3o1Yw$Tp9Z!7kX2Lm6C^uE8v3ZgM7h5K4Xz0hD9aM1P',
                { expiresIn: '10h' }
            );
    console.log('Generated token:', token);
    

    res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});



// Middleware to verify JWT
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


// Fetch User Route
router.get('/user', authenticateToken, async (req, res) => {
  try {
    // Change from req.user._id to req.user.id since that's how we set it in the middleware
    const userId = req.user.id;
    console.log('Fetching profile for User ID:', userId);

    const user = await User.findById(userId);
    if (!user) {
      console.error('User not found for ID:', userId);
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update the avatar upload route as well
router.post('/user/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    const userId = req.user.id;  // Changed from _id to id
    console.log('User ID:', userId);
    const avatarUrl = req.file.path;
    console.log('Uploaded Avatar URL:', avatarUrl);

    const user = await User.findByIdAndUpdate(userId, { avatar: avatarUrl }, { new: true });
    if (!user) {
      console.error('User not found for ID:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


router.put('/user', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;  // Changed from _id to id
    console.log('Updating profile for User ID:', userId);

    const updatedData = req.body;
    console.log('Updated Data:', updatedData);

    const user = await User.findByIdAndUpdate(userId, updatedData, { new: true });
    if (!user) {
      console.error('User not found for ID:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Updated User:', user);
    res.json(user);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});




// Use router
app.use('/api/auth', router);
app.use('/api/upload-book', bookRoutes);
app.use('/api/books', bookRoute);

// Database connection
mongoose.connect( 'mongodb+srv://promesserukundo:papa32.ruru@hb-cluster.t9u7h.mongodb.net/Hb-library?retryWrites=true&w=majority&appName=hb-cluster'
  ).then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('Database connection error:', err));

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
