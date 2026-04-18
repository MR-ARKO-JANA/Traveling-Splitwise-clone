const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = function (req, res, next) {
    let token = req.cookies?.token;

    if (!token) {
        const authHeader = req.header("Authorization");
        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        }
    }

    if (!token) {
        return res.status(401).json({ message: "No token, authorization denied" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        req.user.id = decoded.user?.id || decoded.id || decoded._id;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Token is not valid" });
    }
};