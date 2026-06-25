import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import reviewRoutes from "./routes/reviews.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT ?? 3001;
const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/meridian";

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use("/api/reviews", reviewRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "meridian" });
});

const clientDist = path.join(__dirname, "../../client/dist");
if (process.env.NODE_ENV === "production") {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"), (err) => {
      if (err) res.status(404).json({ error: "Not found" });
    });
  });
}

async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");
  } catch (err) {
    console.warn("MongoDB unavailable — reviews will not persist:", err);
  }

  app.listen(PORT, () => {
    console.log(`Meridian server running on http://localhost:${PORT}`);
  });
}

start();
