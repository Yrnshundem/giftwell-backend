const jwt = require("jsonwebtoken");
require("dotenv").config();

module.exports = function authenticate(req, res, next) {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ error: "Access denied. No token provided." });
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        req.user = decoded; // Attach user data to request object
        next();
    } catch (error) {
        res.status(403).json({ error: "Invalid or expired token." });
    }
};
