import mongoose, { Schema, Document } from "mongoose";

export interface Finding {
  id: string;
  category: "structure" | "readability" | "links" | "inclusivity" | "code";
  severity: "info" | "warning" | "error";
  message: string;
  suggestion: string;
  line?: number;
}

export interface ReviewFeedback {
  summary: string;
  strengths: string[];
  improvements: string[];
}

export interface IReview extends Document {
  source: string;
  title: string;
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  wordCount: number;
  readingLevel: string;
  fleschScore: number;
  findingCount: number;
  findings: Finding[];
  feedback: ReviewFeedback;
  createdAt: Date;
}

const FindingSchema = new Schema(
  {
    id: String,
    category: String,
    severity: String,
    message: String,
    suggestion: String,
    line: Number,
  },
  { _id: false }
);

const ReviewSchema = new Schema<IReview>(
  {
    source: { type: String, required: true },
    title: { type: String, default: "Untitled Document" },
    score: { type: Number, required: true },
    grade: { type: String, required: true },
    wordCount: { type: Number, required: true },
    readingLevel: { type: String, required: true },
    fleschScore: { type: Number, required: true },
    findingCount: { type: Number, required: true },
    findings: [FindingSchema],
    feedback: {
      summary: String,
      strengths: [String],
      improvements: [String],
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Review = mongoose.model<IReview>("Review", ReviewSchema);
