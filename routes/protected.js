const express = require('express');
const { protectedEndpoint } = require('../controllers/protectedController');
const authenticate = require('../middlewares/authenticate');
const router = express.Router();

router.get('/protected', authenticate, protectedEndpoint);

router.get('/profile', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password'); // Exclude password
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});


module.exports = router;
