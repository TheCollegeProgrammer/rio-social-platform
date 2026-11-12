const FollowRequest = require("../models/FollowRequest");
const User = require("../models/User");
const { createNotification } = require("./notification.controller");

// 6.4: incoming pending requests for the signed-in account owner.
const getFollowRequests = async (req, res, next) => {
    try {
        const requests = await FollowRequest.find({
            target: req.user.id,
            status: "pending"
        })
            .sort({ createdAt: -1 })
            .populate("requester", "username name avatar bio");
        res.json({ requests });
    } catch (error) {
        return next(error);
    }
};

// Outgoing pending requests (the requester's "Requested" list).
const getSentFollowRequests = async (req, res, next) => {
    try {
        const requests = await FollowRequest.find({
            requester: req.user.id,
            status: "pending"
        })
            .sort({ createdAt: -1 })
            .populate("target", "username name avatar bio");
        res.json({ requests });
    } catch (error) {
        return next(error);
    }
};

// Atomic status flip: only the target can approve their own pending request,
// and only while it is still pending (double-approve / wrong owner -> 404).
const approveFollowRequest = async (req, res, next) => {
    try {
        const flipped = await FollowRequest.updateOne(
            { _id: req.params.id, target: req.user.id, status: "pending" },
            { $set: { status: "approved" } }
        );
        if (!flipped.matchedCount) {
            return res.status(404).json({ errors: ["Follow request not found"] });
        }
        const fr = await FollowRequest.findById(req.params.id);
        const [me, requester] = await Promise.all([
            User.findById(req.user.id),
            User.findById(fr.requester)
        ]);
        if (!me || !requester) {
            return res.status(404).json({ errors: ["User not found"] });
        }
        // addToSet: a retry after a crash between the status flip and the edge
        // write can never duplicate the follow relationship.
        requester.following.addToSet(me._id);
        me.followers.addToSet(requester._id);
        await Promise.all([requester.save(), me.save()]);
        createNotification({
            recipient: fr.requester,
            sender: me._id,
            type: "follow_approved"
        });
        res.json({
            following: true,
            pending: false,
            followersCount: me.followers.length,
            followingCount: requester.following.length
        });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid request ID"] });
        }
        return next(error);
    }
};

const rejectFollowRequest = async (req, res, next) => {
    try {
        const flipped = await FollowRequest.updateOne(
            { _id: req.params.id, target: req.user.id, status: "pending" },
            { $set: { status: "rejected" } }
        );
        if (!flipped.matchedCount) {
            return res.status(404).json({ errors: ["Follow request not found"] });
        }
        const fr = await FollowRequest.findById(req.params.id);
        createNotification({
            recipient: fr.requester,
            sender: req.user.id,
            type: "follow_rejected"
        });
        res.json({ rejected: true });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid request ID"] });
        }
        return next(error);
    }
};

module.exports = {
    getFollowRequests,
    getSentFollowRequests,
    approveFollowRequest,
    rejectFollowRequest
};
