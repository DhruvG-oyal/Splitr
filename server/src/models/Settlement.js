import mongoose from "mongoose";

const settlementSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0.01 },
    note: { type: String, default: "" },
    date: { type: Date, default: Date.now },
    paidByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receivedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", default: null },
    relatedExpenseIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Expense" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

settlementSchema.index({ groupId: 1 });
settlementSchema.index({ paidByUserId: 1, groupId: 1 });
settlementSchema.index({ receivedByUserId: 1, groupId: 1 });
settlementSchema.index({ date: 1 });

export default mongoose.model("Settlement", settlementSchema);
