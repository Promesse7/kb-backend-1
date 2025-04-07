const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
    },
    bio: {
        type: String,
    },
    readingPreferences: {
        type: [String],
    },
    notificationSettings: {
        newReleases: { type: Boolean, default: true },
        bookRecommendations: { type: Boolean, default: true },
        friendActivity: { type: Boolean, default: false },
        readingReminders: { type: Boolean, default: true },
    },
    privacySettings: {
        showReadingProgress: { type: Boolean, default: true },
        showLibrary: { type: Boolean, default: true },
        showReviews: { type: Boolean, default: true },
    },
    theme: {
        type: String,
        default: 'light',
    },
    language: {
        type: String,
        default: 'en',
    },

      likedBooks: {
        type: [mongoose.Schema.Types.ObjectId], 
        ref: 'Book'
      },
      favoriteBooks: {
        type: [mongoose.Schema.Types.ObjectId], 
        ref: 'Book'
      },
      ratedBooks: [
        {
          bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' },
          rating: { type: Number, min: 0, max: 5 },
          review: { type: String, trim: true }
        }
      ],
    avatar: { type: String, default: '' },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
    }
}, { timestamps: true });

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

module.exports = mongoose.model('User', userSchema);
