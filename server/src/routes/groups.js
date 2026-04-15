import { Router } from "express";
import Group from "../models/Group.js";
import Expense from "../models/Expense.js";
import Settlement from "../models/Settlement.js";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";

const router = Router();

// Create group
router.post("/", protect, async (req, res) => {
  const { name, description, members } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: "Group name required" });

  // BUG FIX: validate members is an array
  if (!Array.isArray(members)) return res.status(400).json({ message: "Members must be an array" });

  try {
    // BUG FIX: validate all member IDs exist before creating group
    const uniqueMembers = [...new Set([...members, req.user._id.toString()])];

    const validUsers = await User.find({ _id: { $in: uniqueMembers } }).select("_id");
    if (validUsers.length !== uniqueMembers.length) {
      return res.status(400).json({ message: "One or more member IDs are invalid" });
    }

    const group = await Group.create({
      name: name.trim(),
      description: description?.trim() || "",
      createdBy: req.user._id,
      members: uniqueMembers.map((id) => ({
        userId: id,
        role: id === req.user._id.toString() ? "admin" : "member",
        joinedAt: Date.now(),
      })),
    });
    res.status(201).json(group);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get group details with expenses, settlements, balances
router.get("/:id", protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate("members.userId", "name email imageUrl");
    if (!group) return res.status(404).json({ message: "Group not found" });

    const isMember = group.members.some((m) => m.userId._id.equals(req.user._id));
    if (!isMember) return res.status(403).json({ message: "Not a member" });

    const expenses = await Expense.find({ groupId: group._id }).sort({ date: -1 });
    const settlements = await Settlement.find({ groupId: group._id }).sort({ date: -1 });

    // All IDs as strings for consistent comparison
    const memberDetails = group.members.map((m) => ({
      id: m.userId._id.toString(),
      name: m.userId.name,
      email: m.userId.email,
      imageUrl: m.userId.imageUrl,
      role: m.role,
    }));

    const ids = memberDetails.map((m) => m.id);

    // Build pair-wise ledger (all string keys)
    const totals = Object.fromEntries(ids.map((id) => [id, 0]));
    const ledger = {};
    ids.forEach((a) => {
      ledger[a] = {};
      ids.forEach((b) => { if (a !== b) ledger[a][b] = 0; });
    });

    for (const exp of expenses) {
      const payer = exp.paidByUserId.toString();
      for (const split of exp.splits) {
        const debtor = split.userId.toString();
        if (debtor === payer || split.paid) continue;
        // BUG FIX: only process members that are in the ledger
        if (totals[payer] === undefined || totals[debtor] === undefined) continue;
        totals[payer] += split.amount;
        totals[debtor] -= split.amount;
        if (ledger[debtor]?.[payer] !== undefined) ledger[debtor][payer] += split.amount;
      }
    }

    for (const s of settlements) {
      const payer = s.paidByUserId.toString();
      const receiver = s.receivedByUserId.toString();
      if (totals[payer] === undefined || totals[receiver] === undefined) continue;
      totals[payer] += s.amount;
      totals[receiver] -= s.amount;
      if (ledger[payer]?.[receiver] !== undefined) ledger[payer][receiver] -= s.amount;
    }

    // Net the pair-wise ledger
    ids.forEach((a) => {
      ids.forEach((b) => {
        if (a >= b) return;
        const diff = ledger[a][b] - ledger[b][a];
        if (diff > 0) { ledger[a][b] = diff; ledger[b][a] = 0; }
        else if (diff < 0) { ledger[b][a] = -diff; ledger[a][b] = 0; }
        else { ledger[a][b] = ledger[b][a] = 0; }
      });
    });

    const balances = memberDetails.map((m) => {
      const id = m.id;
      return {
        ...m,
        totalBalance: totals[id] || 0,
        owes: Object.entries(ledger[id] || {})
          .filter(([, v]) => v > 0.005) // BUG FIX: ignore floating point dust
          .map(([to, amount]) => ({ to, amount })),
        owedBy: ids
          .filter((other) => (ledger[other]?.[id] || 0) > 0.005)
          .map((other) => ({ from: other, amount: ledger[other][id] })),
      };
    });

    const userLookupMap = Object.fromEntries(memberDetails.map((m) => [m.id, m]));

    res.json({
      group: { id: group._id.toString(), name: group.name, description: group.description },
      members: memberDetails,
      expenses,
      settlements,
      balances,
      userLookupMap,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
