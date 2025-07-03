const mongoose = require('mongoose');

const UserBookAccessSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' },
  paidAt: Date,
});

const UserBookAccess = mongoose.model('UserBookAccess', UserBookAccessSchema);

module.exports = { UserBookAccess };
