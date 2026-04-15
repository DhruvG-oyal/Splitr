import cron from "node-cron";
import { sendPaymentReminders } from "./paymentReminders.js";
import { sendSpendingInsights } from "./spendingInsights.js";

export const startCronJobs = () => {
  // Daily at 10 AM UTC - payment reminders
  cron.schedule("0 10 * * *", async () => {
    console.log("Running payment reminders job...");
    try {
      await sendPaymentReminders();
    } catch (err) {
      // BUG FIX: catch unhandled rejections so cron doesn't silently die
      console.error("Payment reminders job failed:", err.message);
    }
  });

  // 1st of every month at 8 AM - spending insights
  cron.schedule("0 8 1 * *", async () => {
    console.log("Running spending insights job...");
    try {
      await sendSpendingInsights();
    } catch (err) {
      console.error("Spending insights job failed:", err.message);
    }
  });

  console.log("Cron jobs scheduled");
};
