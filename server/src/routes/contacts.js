import { Router } from "express";
import Expense from "../models/Expense.js";
import Group from "../models/Group.js";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.get("/", protect, async (req, res) => {
  const me = req.user._id;

  try {
    // 1-to-1 expenses
    const personalExpenses = await Expense.find({
      groupId: null,
      $or: [
        { paidByUserId: me },
        { "splits.userId": me },
      ],
    });

    const contactIds = new Set();
    personalExpenses.forEach((exp) => {
      if (!exp.paidByUserId.equals(me)) contactIds.add(exp.paidByUserId.toString());
      exp.splits.forEach((s) => {
        if (!s.userId.equals(me)) contactIds.add(s.userId.toString());
      });
    });

    const contactUsers = await User.find({ _id: { $in: [...contactIds] } }).select("name email imageUrl");
    const users = contactUsers
      .map((u) => ({ id: u._id.toString(), name: u.name, email: u.email, imageUrl: u.imageUrl, type: "user" }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const groupDocs = await Group.find({ "members.userId": me });
    const groups = groupDocs
      .map((g) => ({ id: g._id.toString(), name: g.name, description: g.description, memberCount: g.members.length, type: "group" }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json({ users, groups });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
