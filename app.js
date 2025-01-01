// app.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
require('dotenv').config();

const app = express();

// Cors configuration
const corsOptions = {
  origin: 'http://localhost:3000',
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Welcome route
app.get('/', (req, res) => {
  res.send('Welcome to the HB Library backend API!');
});

// Status check route
app.get('/api/auth/check-status', (req, res) => {
  res.json({ isAuthenticated: true });
});

// Database connection
mongoose.connect('mongodb+srv://promesserukundo:papa32.ruru@hb-cluster.t9u7h.mongodb.net/Hb-library?retryWrites=true&w=majority&appName=hb-cluster', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch((err) => console.error('Database connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});