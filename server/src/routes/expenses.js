import { Router } from "express";
import Expense from "../models/Expense.js";
import Group from "../models/Group.js";
import Settlement from "../models/Settlement.js";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";

const router = Router();

// Create expense
router.post("/", protect, async (req, res) => {
  const { description, amount, category, date, paidByUserId, splitType, splits, groupId } = req.body;

  // BUG FIX: validate required fields
  if (!description?.trim()) return res.status(400).json({ message: "Description is required" });
  if (!amount || amount <= 0) return res.status(400).json({ message: "Amount must be positive" });
  if (!splits?.length) return res.status(400).json({ message: "Splits are required" });
  if (!paidByUserId) return res.status(400).json({ message: "Payer is required" });

  try {
    if (groupId) {
      const group = await Group.findById(groupId);
      if (!group) return res.status(404).json({ message: "Group not found" });
      const isMember = group.members.some((m) => m.userId.equals(req.user._id));
      if (!isMember) return res.status(403).json({ message: "Not a member of this group" });
    }

    // BUG FIX: validate all split amounts are positive
    if (splits.some((s) => s.amount < 0)) {
      return res.status(400).json({ message: "Split amounts must be non-negative" });
    }

    const totalSplit = splits.reduce((sum, s) => sum + s.amount, 0);
    if (Math.abs(totalSplit - amount) > 0.01) {
      return res.status(400).json({ message: "Split amounts must add up to total" });
    }

    const expense = await Expense.create({
      description: description.trim(),
      amount,
      category: category || "other",
      date: new Date(date),
      paidByUserId,
      splitType,
      splits,
      groupId: groupId || null,
      createdBy: req.user._id,
    });

    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get expenses between current user and another user
router.get("/between/:userId", protect, async (req, res) => {
  const me = req.user._id;
  const otherId = req.params.userId;

  // BUG FIX: prevent querying yourself
  if (me.toString() === otherId) {
    return res.status(400).json({ message: "Cannot query expenses with yourself" });
  }

  try {
    const other = await User.findById(otherId).select("name email imageUrl");
    if (!other) return res.status(404).json({ message: "User not found" });

    // BUG FIX: explicitly filter groupId: null to exclude group expenses
    const expenses = await Expense.find({
      groupId: null,
      $or: [{ paidByUserId: me }, { paidByUserId: otherId }],
    }).sort({ date: -1 });

    const filtered = expenses.filter((e) => {
      const meInvolved = e.paidByUserId.equals(me) || e.splits.some((s) => s.userId.equals(me));
      const themInvolved = e.paidByUserId.equals(otherId) || e.splits.some((s) => s.userId.equals(otherId));
      return meInvolved && themInvolved;
    });

    const settlements = await Settlement.find({
      groupId: null,
      $or: [
        { paidByUserId: me, receivedByUserId: otherId },
        { paidByUserId: otherId, receivedByUserId: me },
      ],
    }).sort({ date: -1 });

    let balance = 0;
    for (const e of filtered) {
      if (e.paidByUserId.equals(me)) {
        const split = e.splits.find((s) => s.userId.equals(otherId) && !s.paid);
        if (split) balance += split.amount;
      } else {
        const split = e.splits.find((s) => s.userId.equals(me) && !s.paid);
        if (split) balance -= split.amount;
      }
    }
    for (const s of settlements) {
      if (s.paidByUserId.equals(me)) balance += s.amount;
      else balance -= s.amount;
    }

    res.json({
      expenses: filtered,
      settlements,
      otherUser: { id: other._id.toString(), name: other.name, email: other.email, imageUrl: other.imageUrl },
      balance,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete expense
router.delete("/:id", protect, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: "Expense not found" });

    const isAuthorized =
      expense.createdBy.equals(req.user._id) || expense.paidByUserId.equals(req.user._id);
    if (!isAuthorized) return res.status(403).json({ message: "Not authorized" });

    // Clean up related settlements
    const relatedSettlements = await Settlement.find({ relatedExpenseIds: expense._id });
    for (const s of relatedSettlements) {
      const updated = s.relatedExpenseIds.filter((id) => !id.equals(expense._id));
      if (updated.length === 0) await s.deleteOne();
      else await s.updateOne({ relatedExpenseIds: updated });
    }

    await expense.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
