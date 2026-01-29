const jwt = require("jsonwebtoken");

// Use the same JWT secret everywhere
const JWT_SECRET = "your-super-secret-key-change-this-in-production";

module.exports = function (req, res, next) {
    const authHeader = req.header("Authorization");

    if (!authHeader) {
        return res.status(401).json({ message: "No token, authorization denied" });
    }

    const token = authHeader.startsWith("Bearer ")  // FIXED: startsWith (capital S)
        ? authHeader.split(" ")[1]
        : null;

    if (!token) {
        return res.status(401).json({ message: "Invalid token format" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        // Ensure id is always available
        req.user.id = decoded.user?.id || decoded.id || decoded._id;
        next();
    } catch (err) {
        res.status(401).json({ message: "Token is not valid" });
    }
};