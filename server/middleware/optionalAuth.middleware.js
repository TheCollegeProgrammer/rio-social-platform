const jwt = require("jsonwebtoken");

const optionalAuth = (req, res, next) => {
    const token = req.cookies.token;

    if (token) {
        try {
            req.user = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            req.user = null;
        }
    }

    next();
};

module.exports = optionalAuth;
