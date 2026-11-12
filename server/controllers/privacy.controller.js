const User = require("../models/User");
const { parseAudiences } = require("../utils/interactionPolicy");

// 6.10: update the caller's interaction audience settings.
const updatePrivacy = async (req, res, next) => {
    try {
        const { updates, errors } = parseAudiences(req.body);
        if (errors.length > 0) return res.status(400).json({ errors });
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ errors: ["No valid privacy settings provided"] });
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updates },
            { new: true, runValidators: true }
        ).select("-password");

        res.json({ message: "Privacy settings updated", user });
    } catch (error) {
        return next(error);
    }
};

module.exports = { updatePrivacy };
