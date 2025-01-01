exports.protectedEndpoint = (req, res) => {
    res.json({ message: `Welcome, User ${req.user.id}! This is a protected route.` });
};
