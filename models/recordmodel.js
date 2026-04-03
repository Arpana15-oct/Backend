const mongoose = require("mongoose");

const recordSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
      min: [0.01, "Amount must be greater than 0"],
    },

    type: {
      type: String,
      enum: ["income", "expense"],
      required: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
      lowercase: true, // normalize — "Food" and "food" become same category
    },

    date: {
      type: Date,
      required: true,
      index: true,
    },

    note: {
      type: String,
      trim: true,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Compound indexes for common query patterns
recordSchema.index({ type: 1, category: 1 });
recordSchema.index({ createdBy: 1, date: -1 });
recordSchema.index({ createdBy: 1, type: 1, date: -1 }); // for dashboard filters

module.exports = mongoose.model("Record", recordSchema);