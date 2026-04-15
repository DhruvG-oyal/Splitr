import { Router } from "express";
import Expense from "../models/Expense.js";
import Settlement from "../models/Settlement.js";
import Group from "../models/Group.js";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";

const router = Router();

// Get user balances (1-to-1 only)
router.get("/balances", protect, async (req, res) => {
  const me = req.user._id;

  try {
    // BUG FIX: Use a per-user net ledger instead of separate youOwe/youAreOwed
    // that could go negative and get clipped incorrectly
    const expenses = await Expense.find({
      groupId: null,
      $or: [{ paidByUserId: me }, { "splits.userId": me }],
    });

    // net[uid] > 0  => uid owes me
    // net[uid] < 0  => I owe uid
    const net = {};

    for (const e of expenses) {
      const isPayer = e.paidByUserId.equals(me);
      if (isPayer) {
        for (const s of e.splits) {
          if (s.userId.equals(me) || s.paid) continue;
          const uid = s.userId.toString();
          net[uid] = (net[uid] || 0) + s.amount;
        }
      } else {
        const mySplit = e.splits.find((s) => s.userId.equals(me));
        if (mySplit && !mySplit.paid) {
          const uid = e.paidByUserId.toString();
          net[uid] = (net[uid] || 0) - mySplit.amount;
        }
      }
    }

    const settlements = await Settlement.find({
      groupId: null,
      $or: [{ paidByUserId: me }, { receivedByUserId: me }],
    });

    for (const s of settlements) {
      if (s.paidByUserId.equals(me)) {
        // I paid them → reduces what I owe them (net[uid] was negative)
        const uid = s.receivedByUserId.toString();
        net[uid] = (net[uid] || 0) + s.amount;
      } else {
        // They paid me → reduces what they owe me (net[uid] was positive)
        const uid = s.paidByUserId.toString();
        net[uid] = (net[uid] || 0) - s.amount;
      }
    }

    const youOweList = [], youAreOwedByList = [];
    let youOwe = 0, youAreOwed = 0;

    for (const [uid, amount] of Object.entries(net)) {
      if (Math.abs(amount) < 0.01) continue; // ignore dust
      const user = await User.findById(uid).select("name imageUrl");
      const base = { userId: uid, name: user?.name || "Unknown", imageUrl: user?.imageUrl, amount: Math.abs(amount) };
      if (amount > 0) {
        youAreOwed += amount;
        youAreOwedByList.push(base);
      } else {
        youOwe += Math.abs(amount);
        youOweList.push(base);
      }
    }

    youOweList.sort((a, b) => b.amount - a.amount);
    youAreOwedByList.sort((a, b) => b.amount - a.amount);

    res.json({
      youOwe,
      youAreOwed,
      totalBalance: youAreOwed - youOwe,
      oweDetails: { youOwe: youOweList, youAreOwedBy: youAreOwedByList },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Total spent this year
router.get("/total-spent", protect, async (req, res) => {
  const me = req.user._id;
  const startOfYear = new Date(new Date().getFullYear(), 0, 1);

  try {
    const expenses = await Expense.find({
      date: { $gte: startOfYear },
      $or: [{ paidByUserId: me }, { "splits.userId": me }],
    });

    let totalSpent = 0;
    expenses.forEach((e) => {
      const split = e.splits.find((s) => s.userId.equals(me));
      if (split) totalSpent += split.amount;
    });

    res.json({ totalSpent });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Monthly spending for current year
router.get("/monthly-spending", protect, async (req, res) => {
  const me = req.user._id;
  const year = new Date().getFullYear();
  const startOfYear = new Date(year, 0, 1);

  try {
    const expenses = await Expense.find({
      date: { $gte: startOfYear },
      $or: [{ paidByUserId: me }, { "splits.userId": me }],
    });

    const monthlyTotals = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(year, i, 1).getTime(),
      total: 0,
    }));

    expenses.forEach((e) => {
      const month = new Date(e.date).getMonth();
      const split = e.splits.find((s) => s.userId.equals(me));
      if (split) monthlyTotals[month].total += split.amount;
    });

    res.json(monthlyTotals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// User groups with balances
router.get("/groups", protect, async (req, res) => {
  const me = req.user._id;

  try {
    const groups = await Group.find({ "members.userId": me }).populate("members.userId", "name imageUrl");

    const enhanced = await Promise.all(
      groups.map(async (group) => {
        const expenses = await Expense.find({ groupId: group._id });
        const settlements = await Settlement.find({ groupId: group._id });

        let balance = 0;
        expenses.forEach((e) => {
          if (e.paidByUserId.equals(me)) {
            e.splits.forEach((s) => {
              if (!s.userId.equals(me) && !s.paid) balance += s.amount;
            });
          } else {
            const split = e.splits.find((s) => s.userId.equals(me) && !s.paid);
            if (split) balance -= split.amount;
          }
        });

        settlements.forEach((s) => {
          if (s.paidByUserId.equals(me)) balance += s.amount;
          else if (s.receivedByUserId.equals(me)) balance -= s.amount;
        });

        return {
          id: group._id.toString(),
          name: group.name,
          description: group.description,
          members: group.members.map((m) => ({
            id: m.userId._id ? m.userId._id.toString() : m.userId.toString(),
            name: m.userId.name || "",
          })),
          balance,
        };
      })
    );

    res.json(enhanced);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
