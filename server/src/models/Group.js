import mongoose from "mongoose";

const memberSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  role: { type: String, enum: ["admin", "member"], default: "member" },
  joinedAt: { type: Date, default: Date.now },
});

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [memberSchema],
  },
  { timestamps: true }
);

export default mongoose.model("Group", groupSchema);
