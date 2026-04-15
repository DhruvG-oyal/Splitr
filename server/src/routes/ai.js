import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Expense from "../models/Expense.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.get("/insights", protect, async (req, res) => {
  // BUG FIX: validate API key exists before attempting to use it
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ message: "AI service is not configured. Please set GEMINI_API_KEY." });
  }

  const me = req.user._id;

  try {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const expenses = await Expense.find({
      date: { $gte: oneMonthAgo },
      $or: [{ paidByUserId: me }, { "splits.userId": me }],
    });

    if (!expenses.length) {
      return res.json({ insights: "No expenses found for the past month. Start adding expenses to get personalized insights!" });
    }

    const expenseData = expenses.map((e) => {
      const split = e.splits.find((s) => s.userId.equals(me));
      return {
        description: e.description,
        category: e.category || "other",
        date: e.date,
        amount: split ? split.amount : 0,
        isPayer: e.paidByUserId.equals(me),
        isGroup: !!e.groupId,
      };
    });

    const totalSpent = expenseData.reduce((sum, e) => sum + e.amount, 0);
    const categories = expenseData.reduce((cats, e) => {
      const key = e.category || "other";
      cats[key] = (cats[key] || 0) + e.amount;
      return cats;
    }, {});

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
As a financial analyst, review this user's spending data for the past month and provide insightful observations and suggestions.
Focus on spending patterns, category breakdowns, and actionable advice for better financial management.
Use a friendly, encouraging tone. Keep the response concise and formatted with clear sections using markdown.

User spending data:
${JSON.stringify({ totalSpent, categories, expenseCount: expenseData.length }, null, 2)}

Provide your analysis in these sections:
1. Monthly Overview
2. Top Spending Categories
3. Unusual Spending Patterns (if any)
4. Saving Opportunities
5. Recommendations for Next Month
    `.trim();

    const result = await model.generateContent(prompt);
    const insights = result.response.text();

    res.json({ insights });
  } catch (err) {
    console.error("AI insights error:", err);
    // BUG FIX: return user-friendly message without leaking internal error details
    res.status(500).json({ message: "Failed to generate insights. Please try again later." });
  }
});

export default router;
