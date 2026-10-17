import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import {
  OCCUPATION_GROUPS,
  OCCUPATIONS,
  EXPERIENCE,
  FILTERS,
  QUAL_NAMES,
  FAST_MODEL,
  SMART_MODEL,
  CACHE_FILE,
  occupationGroup,
} from "./config.js";
import { findProviders, loadCache, saveCache } from "./pipeline.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Load countries data
let countriesData = {};
try {
  const dataPath = path.join(__dirname, "countries-data.json");
  if (fs.existsSync(dataPath)) {
    countriesData = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  }
} catch (err) {
  console.error("Failed to load countries-data.json:", err.message);
}

// Config endpoint
app.get("/api/config", (req, res) => {
  res.json({
    occupations: OCCUPATIONS,
    occupationGroups: OCCUPATION_GROUPS,
    experience: EXPERIENCE,
    filters: FILTERS,
    qualNames: QUAL_NAMES,
    models: {
      fast: FAST_MODEL,
      smart: SMART_MODEL,
    },
  });
});

// Countries endpoint
app.get("/api/countries", (req, res) => {
  const countries = Object.keys(countriesData).sort();
  res.json({ countries });
});

// States for a selected country
app.get("/api/states", (req, res) => {
  const countryName = req.query.country;
  const entry = countriesData[countryName];
  if (!entry) {
    return res.json({ code: "", states: [] });
  }
  res.json({
    code: entry.code || "",
    states: entry.states || [],
  });
});

// Standard search endpoint (JSON response)
app.post("/api/search", async (req, res) => {
  try {
    const { profile, maxCandidates, accurate, useCache, includeLinkedin } = req.body;
    if (!profile || !profile.occupation) {
      return res.status(400).json({ error: "Profile with occupation is required" });
    }

    const logs = [];
    const logFn = (msg) => logs.push(msg);

    const result = await findProviders(
      profile,
      {
        maxCandidates: maxCandidates || 6,
        accurate: !!accurate,
        useCache: useCache !== false,
        includeLinkedin: includeLinkedin !== false,
      },
      logFn
    );

    res.json({
      ...result,
      logs,
    });
  } catch (err) {
    console.error("Search API error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Real-time Server-Sent Events (SSE) streaming search
app.get("/api/search/stream", async (req, res) => {
  try {
    const profileParam = req.query.profile;
    if (!profileParam) {
      return res.status(400).send("Missing profile query parameter");
    }

    const profile = JSON.parse(profileParam);
    const maxCandidates = parseInt(req.query.maxCandidates || "6", 10);
    const accurate = req.query.accurate === "true";
    const useCache = req.query.useCache !== "false";
    const includeLinkedin = req.query.includeLinkedin !== "false";

    // Set headers for SSE
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });
    res.write(": stream opened\n\n");

    const sendEvent = (type, data) => {
      res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
    };

    const logFn = (msg) => {
      sendEvent("log", msg);
    };

    sendEvent("status", "Starting pipeline...");

    const result = await findProviders(
      profile,
      {
        maxCandidates,
        accurate,
        useCache,
        includeLinkedin,
      },
      logFn
    );

    sendEvent("complete", result);
    res.end();
  } catch (err) {
    console.error("SSE stream error:", err);
    res.write(`data: ${JSON.stringify({ type: "error", data: err.message })}\n\n`);
    res.end();
  }
});

// Cache stats endpoint
app.get("/api/cache/stats", (req, res) => {
  const cache = loadCache();
  const keys = Object.keys(cache);
  res.json({
    count: keys.length,
    keys,
  });
});

// Clear cache endpoint
app.post("/api/cache/clear", (req, res) => {
  try {
    saveCache({});
    res.json({ success: true, message: "Cache cleared successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  const hasGroq = !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim());
  const hasTinyFish = !!(process.env.TINYFISH_API_KEY && process.env.TINYFISH_API_KEY.trim());
  res.json({
    status: "ok",
    hasGroq,
    hasTinyFish,
    nodeVersion: process.version,
  });
});

// Fallback to index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  VouchAI High-Speed Server running at:`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
