import User from "../models/User.js";
import Expense from "../models/Expense.js";
import Settlement from "../models/Settlement.js";
import { sendEmail } from "../utils/email.js";

export const sendPaymentReminders = async () => {
  const users = await User.find();
  const expenses = await Expense.find({ groupId: null });
  const settlements = await Settlement.find({ groupId: null });

  const results = [];

  for (const user of users) {
    const ledger = new Map();

    for (const exp of expenses) {
      if (!exp.paidByUserId.equals(user._id)) {
        const split = exp.splits.find((s) => s.userId.equals(user._id) && !s.paid);
        if (!split) continue;
        const entry = ledger.get(exp.paidByUserId.toString()) || { amount: 0, since: exp.date };
        entry.amount += split.amount;
        entry.since = entry.since < exp.date ? entry.since : exp.date;
        ledger.set(exp.paidByUserId.toString(), entry);
      } else {
        for (const s of exp.splits) {
          if (s.userId.equals(user._id) || s.paid) continue;
          const uid = s.userId.toString();
          const entry = ledger.get(uid) || { amount: 0, since: exp.date };
          entry.amount -= s.amount;
          ledger.set(uid, entry);
        }
      }
    }

    for (const st of settlements) {
      if (st.paidByUserId.equals(user._id)) {
        const entry = ledger.get(st.receivedByUserId.toString());
        if (entry) {
          entry.amount -= st.amount;
          if (entry.amount === 0) ledger.delete(st.receivedByUserId.toString());
        }
      } else if (st.receivedByUserId.equals(user._id)) {
        const entry = ledger.get(st.paidByUserId.toString());
        if (entry) {
          entry.amount += st.amount;
          if (entry.amount === 0) ledger.delete(st.paidByUserId.toString());
        }
      }
    }

    const debts = [];
    for (const [uid, { amount }] of ledger) {
      if (amount > 0) {
        const creditor = await User.findById(uid).select("name");
        debts.push({ name: creditor?.name || "Unknown", amount });
      }
    }

    if (!debts.length) continue;

    const rows = debts.map((d) => `<tr><td style="padding:4px 8px;">${d.name}</td><td style="padding:4px 8px;">$${d.amount.toFixed(2)}</td></tr>`).join("");
    const html = `
      <h2>Splitr – Payment Reminder</h2>
      <p>Hi ${user.name}, you have the following outstanding balances:</p>
      <table cellspacing="0" cellpadding="0" border="1" style="border-collapse:collapse;">
        <thead><tr><th>To</th><th>Amount</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p>Please settle up soon. Thanks!</p>
    `;

    try {
      await sendEmail({ to: user.email, subject: "You have pending payments on Splitr", html });
      results.push({ userId: user._id, success: true });
    } catch (err) {
      results.push({ userId: user._id, success: false, error: err.message });
    }
  }

  console.log(`Payment reminders: ${results.filter((r) => r.success).length} sent`);
  return results;
};
