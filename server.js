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
const { Server } = require('socket.io');
const http = require('http');
const paypackSecret = process.env.PAYPACK_SECRET_KEY;
const { UserBookAccess } = require('./models/UserBookAccessSchema'); // import the model

const app = express();

// ========== Allowed Origins ==========
const allowedOrigins = [
  "http://localhost:3000",
  "https://hb-library.vercel.app",
  "https://novtok.vercel.app",
];
const multer = require('multer');
const storage = new CloudinaryStorage({ 
cloudinary: cloudinary, params: {
  folder: 'avatars', 
  format: async (req, file) => 'jpg',
    public_id: (req, file) => `${Date.now()}-${file.originalname}`, 
    }, 
  });
  const upload = multer({ storage: storage });
  
  // ========== Socket.IO ==========
const io = new Server(http, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  }
});

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
});

// Optional: attach io to app for use in routes
app.set('io', io);

const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});




// ========== CORS Options ==========
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// ========== Preflight Request Handler ==========
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
});

// ========== Middleware ==========
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


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

// ============== Payment with PayPack =================== \\

app.post('/api/paypack/initiate', async (req, res) => {
  const { bookId, amount } = req.body;
  const userId = req.user.id;

  if (!bookId || !amount) return res.status(400).json({ error: 'Missing bookId or amount' });

  try {
    // Create payment session with Paypack (example URL and payload — adapt to their API)
    const paypackResponse = await axios.post('https://api.paypack.rw/payments', {
      amount,
      currency: 'RWF',
      customer_id: userId,  // or any customer identifier you track
      description: `Purchase Book ${bookId}`,
      callback_url: 'https://yourapp.com/api/paypack/webhook', // Your webhook URL
      success_url: `https://yourapp.com/books/${bookId}/read`, // Where to redirect after payment success
      cancel_url: `https://yourapp.com/books/${bookId}`,       // Where to redirect if payment cancelled
    }, {
      headers: {
        Authorization: `Bearer ${paypackSecret}`,
        'Content-Type': 'application/json',
      },
    });

    res.json({ paymentUrl: paypackResponse.data.payment_url });
  } catch (err) {
    console.error('Paypack initiation error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to initiate payment' });
  }
});


app.post('/api/paypack/webhook', async (req, res) => {
  const paymentData = req.body;

  // TODO: verify signature or authenticity based on Paypack docs

  if (paymentData.status === 'success' && paymentData.customer_id && paymentData.description) {
    try {
      // Parse bookId from description or you can use metadata fields if available
      const bookId = paymentData.description.split(' ').pop();
      const userId = paymentData.customer_id;

      // Save access to DB
      await UserBookAccess.create({
        userId,
        bookId,
        paidAt: new Date(),
      });

      console.log(`Payment success for user ${userId}, book ${bookId}`);

      res.status(200).send('OK');
    } catch (err) {
      console.error('Webhook processing error:', err);
      res.status(500).send('Failed');
    }
  } else {
    res.status(400).send('Invalid payment status');
  }
});
app.get('/api/books/:bookId/access', async (req, res) => {
  const userId = req.user.id;
  const bookId = req.params.bookId;

  const access = await UserBookAccess.findOne({ userId, bookId });

  res.json({ hasAccess: !!access });
});


// Use router
app.use('/api/auth', router);
app.use('/api/upload-book', bookRoutes);
app.use('/api/books', bookRoute);

// Database connection
mongoose.connect( 'mongodb+srv://promesserukundo:papa32.ruru@hb-cluster.t9u7h.mongodb.net/Hb-library?retryWrites=true&w=majority&appName=hb-cluster'
  ).then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('Database connection error:', err));


