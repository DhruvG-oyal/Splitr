import { Router } from "express";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";

const router = Router();

// Search users by name or email
router.get("/search", protect, async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json([]);

  try {
    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ],
    })
      .select("name email imageUrl")
      .limit(10);

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update profile
router.patch("/profile", protect, async (req, res) => {
  const { name, imageUrl } = req.body;
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, imageUrl },
      { new: true }
    ).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
