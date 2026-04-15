import mongoose from "mongoose";

const splitSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  paid: { type: Boolean, default: false },
});

const expenseSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0.01 },
    category: { type: String, default: "other" },
    date: { type: Date, required: true },
    paidByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    splitType: { type: String, enum: ["equal", "percentage", "exact"], required: true },
    splits: [splitSchema],
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

expenseSchema.index({ groupId: 1 });
expenseSchema.index({ paidByUserId: 1, groupId: 1 });
expenseSchema.index({ date: 1 });

export default mongoose.model("Expense", expenseSchema);
