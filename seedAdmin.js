const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const createAdminUser = async () => {
  try {
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@hblirary.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    // Create new admin user
    const adminUser = new User({
      name: 'Admin User',
      email: process.env.ADMIN_EMAIL || 'admin@hblirary.com',
      password: process.env.ADMIN_PASSWORD || 'admin123!',
      role: 'admin',
      notificationSettings: {
        newReleases: true,
        bookRecommendations: true,
        friendActivity: true,
        readingReminders: true
      },
      privacySettings: {
        showReadingProgress: false,
        showLibrary: false,
        showReviews: false
      }
    });

    await adminUser.save();
    console.log('Admin user created successfully');

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
  }
};

// Connect to MongoDB
mongoose.connect('mongodb+srv://promesserukundo:papa32.ruru@hb-cluster.t9u7h.mongodb.net/Hb-library?retryWrites=true&w=majority&appName=hb-cluster')
  .then(() => {
    console.log('Connected to MongoDB');
    createAdminUser();
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });