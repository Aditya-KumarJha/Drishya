import mongoose from "mongoose";
import crypto from "crypto";

const projectSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    publicStatusEnabled: {
      type: Boolean,
      default: true,
    },
    publicSlug: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
  },
  { timestamps: true }
);

projectSchema.pre("validate", function ensurePublicSlug() {
  if (!this.publicSlug) {
    this.publicSlug = crypto.randomBytes(8).toString("hex");
  }
});

export default mongoose.model("Project", projectSchema);
