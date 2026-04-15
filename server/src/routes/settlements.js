import { Router } from "express";
import Settlement from "../models/Settlement.js";
import Expense from "../models/Expense.js";
import Group from "../models/Group.js";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";

const router = Router();

// Create settlement
router.post("/", protect, async (req, res) => {
  const { amount, note, paidByUserId, receivedByUserId, groupId, relatedExpenseIds } = req.body;

  if (!amount || amount <= 0) return res.status(400).json({ message: "Amount must be positive" });
  if (!paidByUserId || !receivedByUserId) return res.status(400).json({ message: "Payer and receiver are required" });

  // BUG FIX: string comparison is correct here since both come from req.body as strings
  if (paidByUserId === receivedByUserId)
    return res.status(400).json({ message: "Payer and receiver cannot be the same" });

  const callerId = req.user._id.toString();
  if (callerId !== paidByUserId && callerId !== receivedByUserId)
    return res.status(403).json({ message: "You must be payer or receiver" });

  try {
    if (groupId) {
      const group = await Group.findById(groupId);
      if (!group) return res.status(404).json({ message: "Group not found" });
      const memberIds = group.members.map((m) => m.userId.toString());
      if (!memberIds.includes(paidByUserId) || !memberIds.includes(receivedByUserId))
        return res.status(400).json({ message: "Both parties must be group members" });
    }

    const settlement = await Settlement.create({
      amount,
      note: note || "",
      date: Date.now(),
      paidByUserId,
      receivedByUserId,
      groupId: groupId || null,
      relatedExpenseIds: relatedExpenseIds || [],
      createdBy: req.user._id,
    });

    res.status(201).json(settlement);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get settlement data for user or group
router.get("/data/:entityType/:entityId", protect, async (req, res) => {
  const { entityType, entityId } = req.params;
  const me = req.user._id;

  try {
    if (entityType === "user") {
      const other = await User.findById(entityId).select("name email imageUrl");
      if (!other) return res.status(404).json({ message: "User not found" });

      // BUG FIX: explicitly filter groupId: null
      const expenses = await Expense.find({
        groupId: null,
        $or: [{ paidByUserId: me }, { paidByUserId: entityId }],
      });

      // BUG FIX: use net ledger instead of separate owed/owing that clip at 0
      let net = 0; // positive = they owe me, negative = I owe them

      for (const exp of expenses) {
        const involvesMe = exp.paidByUserId.equals(me) || exp.splits.some((s) => s.userId.equals(me));
        const involvesThem = exp.paidByUserId.equals(entityId) || exp.splits.some((s) => s.userId.equals(entityId));
        if (!involvesMe || !involvesThem) continue;

        if (exp.paidByUserId.equals(me)) {
          const split = exp.splits.find((s) => s.userId.equals(entityId) && !s.paid);
          if (split) net += split.amount;
        } else if (exp.paidByUserId.equals(entityId)) {
          const split = exp.splits.find((s) => s.userId.equals(me) && !s.paid);
          if (split) net -= split.amount;
        }
      }

      const settlements = await Settlement.find({
        groupId: null,
        $or: [
          { paidByUserId: me, receivedByUserId: entityId },
          { paidByUserId: entityId, receivedByUserId: me },
        ],
      });

      for (const st of settlements) {
        if (st.paidByUserId.equals(me)) net += st.amount;   // I paid them → reduces my debt
        else net -= st.amount;                               // They paid me → reduces their debt
      }

      return res.json({
        type: "user",
        counterpart: { userId: other._id.toString(), name: other.name, email: other.email, imageUrl: other.imageUrl },
        youAreOwed: net > 0 ? net : 0,
        youOwe: net < 0 ? Math.abs(net) : 0,
        netBalance: net,
      });
    }

    if (entityType === "group") {
      const group = await Group.findById(entityId).populate("members.userId", "name imageUrl");
      if (!group) return res.status(404).json({ message: "Group not found" });

      const isMember = group.members.some((m) => m.userId._id.equals(me));
      if (!isMember) return res.status(403).json({ message: "Not a member" });

      const expenses = await Expense.find({ groupId: group._id });

      // BUG FIX: use net per-member ledger (positive = they owe me, negative = I owe them)
      const memberNet = {};
      group.members.forEach((m) => {
        if (!m.userId._id.equals(me)) memberNet[m.userId._id.toString()] = 0;
      });

      for (const exp of expenses) {
        if (exp.paidByUserId.equals(me)) {
          exp.splits.forEach((split) => {
            const sid = split.userId.toString();
            if (!split.userId.equals(me) && !split.paid && memberNet[sid] !== undefined)
              memberNet[sid] += split.amount;
          });
        } else {
          const sid = exp.paidByUserId.toString();
          if (memberNet[sid] !== undefined) {
            const split = exp.splits.find((s) => s.userId.equals(me) && !s.paid);
            if (split) memberNet[sid] -= split.amount;
          }
        }
      }

      const settlements = await Settlement.find({ groupId: group._id });
      for (const st of settlements) {
        const pid = st.paidByUserId.toString();
        const rid = st.receivedByUserId.toString();
        if (st.paidByUserId.equals(me) && memberNet[rid] !== undefined)
          memberNet[rid] += st.amount;
        if (st.receivedByUserId.equals(me) && memberNet[pid] !== undefined)
          memberNet[pid] -= st.amount;
      }

      const list = Object.keys(memberNet).map((uid) => {
        const u = group.members.find((m) => m.userId._id.toString() === uid)?.userId;
        const net = memberNet[uid];
        return {
          userId: uid,
          name: u?.name || "Unknown",
          imageUrl: u?.imageUrl,
          youAreOwed: net > 0 ? net : 0,
          youOwe: net < 0 ? Math.abs(net) : 0,
          netBalance: net,
        };
      });

      return res.json({
        type: "group",
        group: { id: group._id.toString(), name: group.name, description: group.description },
        balances: list,
      });
    }

    res.status(400).json({ message: "Invalid entityType" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
