import { Router } from "express";
import { Review } from "../models/Review.js";
import { analyzeMarkdown, fetchGithubReadme } from "../services/analyzer.js";

const router = Router();

router.get("/", async (_req, res) => {
  const reviews = await Review.find()
    .sort({ createdAt: -1 })
    .limit(20)
    .select("-findings");
  res.json(reviews);
});

router.get("/:id", async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    res.status(404).json({ error: "Review not found" });
    return;
  }
  res.json(review);
});

router.post("/markdown", async (req, res) => {
  const { markdown, label } = req.body as { markdown?: string; label?: string };
  if (!markdown?.trim()) {
    res.status(400).json({ error: "Markdown content is required" });
    return;
  }

  try {
    const result = analyzeMarkdown(markdown, label ?? "Pasted markdown");
    const review = await Review.create(result);
    res.status(201).json(review);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    res.status(500).json({ error: message });
  }
});

router.post("/github", async (req, res) => {
  const { url } = req.body as { url?: string };
  if (!url) {
    res.status(400).json({ error: "GitHub URL is required" });
    return;
  }

  try {
    const { markdown, source } = await fetchGithubReadme(url);
    const result = analyzeMarkdown(markdown, source);
    const review = await Review.create(result);
    res.status(201).json(review);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    res.status(500).json({ error: message });
  }
});

export default router;
