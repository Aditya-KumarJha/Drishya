import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 12000,
    },
    monitorIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Monitor",
    }],
    memorySaved: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const chatConversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    isSaved: {
      type: Boolean,
      default: true,
    },
    monitorIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Monitor",
    }],
    messages: [chatMessageSchema],
    lastMessageAt: Date,
  },
  { timestamps: true }
);

chatConversationSchema.index({ userId: 1, updatedAt: -1 });

export default mongoose.model("ChatConversation", chatConversationSchema);
