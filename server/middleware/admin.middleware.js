const User = require("../models/User");

// Mount after protect: requires a live session AND the admin role.
const requireAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select("role");
        if (!user || user.role !== "admin") {
            return res.status(403).json({ errors: ["Admin access required"] });
        }
        next();
    } catch (error) {
        return next(error);
    }
};

module.exports = requireAdmin;
