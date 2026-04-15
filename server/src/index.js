import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import expenseRoutes from "./routes/expenses.js";
import groupRoutes from "./routes/groups.js";
import settlementRoutes from "./routes/settlements.js";
import dashboardRoutes from "./routes/dashboard.js";
import contactRoutes from "./routes/contacts.js";
import aiRoutes from "./routes/ai.js";
import { startCronJobs } from "./jobs/cron.js";

dotenv.config();

const app = express();

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((o) => o.trim())
  : ["http://localhost:5173"];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (mobile apps, curl, etc.)
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/settlements", settlementRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/ai", aiRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Connect to DB once (cached for serverless reuse)
let isConnected = false;
const ensureDB = async () => {
  if (!isConnected) {
    await connectDB();
    isConnected = true;
  }
};

// For local development: start the server normally
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  ensureDB().then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    startCronJobs();
  });
} else {
  // In production (Vercel), connect on first request
  app.use(async (req, res, next) => {
    await ensureDB();
    next();
  });
}

// Export for Vercel serverless
export default app;
