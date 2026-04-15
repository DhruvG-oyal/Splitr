import { GoogleGenerativeAI } from "@google/generative-ai";
import User from "../models/User.js";
import Expense from "../models/Expense.js";
import { sendEmail } from "../utils/email.js";

export const sendSpendingInsights = async () => {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const users = await User.find();
  const results = [];

  for (const user of users) {
    const expenses = await Expense.find({
      date: { $gte: oneMonthAgo },
      $or: [{ paidByUserId: user._id }, { "splits.userId": user._id }],
    });

    if (!expenses.length) continue;

    const expenseData = expenses.map((e) => {
      const split = e.splits.find((s) => s.userId.equals(user._id));
      return {
        description: e.description,
        category: e.category,
        date: e.date,
        amount: split ? split.amount : 0,
        isPayer: e.paidByUserId.equals(user._id),
        isGroup: !!e.groupId,
      };
    });

    const totalSpent = expenseData.reduce((sum, e) => sum + e.amount, 0);
    const categories = expenseData.reduce((cats, e) => {
      cats[e.category || "other"] = (cats[e.category || "other"] || 0) + e.amount;
      return cats;
    }, {});

    const prompt = `
As a financial analyst, review this user's spending data for the past month and provide insightful observations and suggestions.
Use a friendly, encouraging tone. Format your response in HTML for an email.

User spending data:
${JSON.stringify({ expenses: expenseData, totalSpent, categories })}

Provide your analysis in these sections:
1. Monthly Overview
2. Top Spending Categories
3. Unusual Spending Patterns (if any)
4. Saving Opportunities
5. Recommendations for Next Month
    `.trim();

    try {
      const result = await model.generateContent(prompt);
      const htmlBody = result.response.text();

      await sendEmail({
        to: user.email,
        subject: "Your Monthly Spending Insights",
        html: `<h1>Your Monthly Financial Insights</h1><p>Hi ${user.name},</p><p>Here's your personalized spending analysis for the past month:</p>${htmlBody}`,
      });

      results.push({ userId: user._id, success: true });
    } catch (err) {
      results.push({ userId: user._id, success: false, error: err.message });
    }
  }

  console.log(`Spending insights: ${results.filter((r) => r.success).length} sent`);
  return results;
};
