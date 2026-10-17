# ⚡ VouchAI Turbo

[![Node.js](https://img.shields.io/badge/Node.js-v24-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Powered by Groq](https://img.shields.io/badge/LLM-Groq%20Cloud-f55036.svg)](https://groq.com)
[![Web Agent](https://img.shields.io/badge/Search-TinyFish%20AI-00bcd4.svg)](https://tinyfish.ai)

> **High-speed professional discovery platform backed by verifiable public-page evidence.**  
> Powered by **TinyFish Web Agents** for live internet crawling and **Groq Cloud** for hallucination-guarded LLM verification.

---

## 🏆 Quickstart for Judges & Evaluators

> **Zero setup required.**  
> Pre-configured environment keys (`.env`) and warm cache (`cache.json`) are already bundled.

### ⚡ env file:
   **change '.env.example' to 'env'

   
### ⚡ 1-Click Launch:
- **Windows**: Double-click **[`start.bat`](file:///./start.bat)** (or run `.\start.bat` in terminal).  
  *Automatically checks dependencies, starts the backend, and opens your browser at http://localhost:3000!*
- **macOS / Linux**: Run `bash start.sh` (or `chmod +x start.sh && ./start.sh`).
- **Terminal (Any OS)**:
  ```bash
  npm install
  node server.js
  ```
  Then open **[http://localhost:3000](http://localhost:3000)**.

---

### 🧪 Recommended 2-Minute Evaluation Walkthrough:

1. **Instant Verification (<10ms Demo)**:
   - Keep the default selections (*Chartered Accountant (CA)*, *5+ years*, *India*, *Delhi*).
   - Click **`Find Providers`**.
   - **Observe**: Results return instantly with green **Supported** badges and exact **source quotes** extracted from public pages.
2. **Live Engine & Parallel Concurrency Demo**:
   - In the left sidebar under *Advanced Pipeline Settings*, uncheck **Use local cache** (or choose another profession like *Software Developer* or *Lawyer*).
   - Click **`Find Providers`**.
   - **Observe**: Watch the real-time **streaming terminal logs** and stage stepper update live via Server-Sent Events (SSE) as parallel TinyFish web queries and Groq LLM evaluations run simultaneously.
3. **Anti-Hallucination Guard**:
   - Examine how every verified criterion includes the verbatim quote from the page. Any quote not physically present in the page text is rejected and demoted to *Not Stated*.
4. **Data Export**:
   - Click **Export CSV** or **Export JSON** to download findings.

---

## ✨ Features

- **🚀 Concurrent Web Scraping**: Parallelized TinyFish queries via `Promise.all` — 10x faster than traditional sequential search loops.
- **🛡️ Anti-Hallucination Guard**: Every claim must be backed by an exact verbatim quote on the source page; fabricated claims are automatically demoted.
- **⚡ Sub-5ms Caching**: Deterministic SHA-1 cached queries return verified findings in under 5 milliseconds.
- **📡 Live Server-Sent Events (SSE)**: Watch the pipeline execute in real time (`Plan` → `Search` → `Fetch` → `Judge` → `Verify`) with a live streaming terminal.
- **🎨 Modern Responsive UI**: Glassmorphic dashboard with instant dark/light mode toggle, dynamic qualification tags, and one-click JSON/CSV export.
- **🔍 LinkedIn Corroboration**: Cross-verifies LinkedIn profiles against independent non-social web platforms before vouching.

---

## ⚡ Speed & Architecture Comparison

| Metric / Aspect | Legacy Python + Streamlit | VouchAI Turbo (Node.js) |
| :--- | :--- | :--- |
| **Search Queries** | Sequential blocking loop (`for q in queries`) | **Fully concurrent parallel queries** via `Promise.all` |
| **I/O Concurrency** | Python ThreadPoolExecutor hindered by GIL | **Native non-blocking Event Loop** & HTTP/2 pipelining |
| **UI Updates** | Full script re-run on every click / slider move | **Reactive client-side SPA** with zero page reloads |
| **Live Feedback** | Heavy WebSocket connection with blocking spinner | **Server-Sent Events (SSE)** streaming live progress & logs |
| **Cached Queries** | Slow JSON serialization and disk I/O | **Sub-5 millisecond (<5ms)** instantaneous cache response |

---

## 🛠️ Quick Start


### 1. Install dependencies
```bash
npm install
```

### 2. Start the application
*(The `.env` file is already pre-configured out of the box)*
```bash
# Option 1: Standard start
npm start

# Option 2: Direct node command (Windows friendly)
node server.js

# Option 3: Development with auto-restart
npm run dev
```



Open your browser to:
👉 **`http://localhost:3000`**

---

## 📁 Repository Structure

```
├── .env.example          # Environment variable template (safe to commit)
├── .gitignore            # Ignores .env, node_modules, and local caches
├── config.js             # 47+ occupations across 11 industries, qualifications & filters
├── countries-data.json   # Full offline ISO-3166 dataset (249 countries, 5,046 subdivisions)
├── package.json          # Node.js project manifest & dependencies
├── pipeline.js           # Concurrent discovery, quote validation & Groq judging
├── server.js             # Express API server with Server-Sent Events (SSE) streaming
├── start.bat             # 1-click Windows launcher
└── public/
    ├── index.html        # Responsive web dashboard
    ├── style.css         # Modern glassmorphism UI & dark/light theme
    └── app.js            # Real-time SSE streaming, interactive tags & CSV/JSON export
```

---

## 📡 API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/health` | `GET` | Verifies connection status of Groq and TinyFish APIs |
| `/api/config` | `GET` | Returns supported professions, categories, experience levels, and filters |
| `/api/countries` | `GET` | Returns list of 249 countries |
| `/api/states?country=India` | `GET` | Returns states/subdivisions for a specified country |
| `/api/search` | `POST` | Standard JSON discovery endpoint |
| `/api/search/stream?profile=...` | `GET` | Real-time Server-Sent Events (SSE) pipeline stream |
| `/api/cache/stats` | `GET` | View total cached queries |
| `/api/cache/clear` | `POST` | Reset local search cache |

---

## 🛡️ Anti-Hallucination Methodology

1. **Exact-Match Quote Verification**: When the LLM evaluates a candidate web page, it must provide a verbatim quote excerpt. The engine checks this excerpt against normalized page text (`inText`). If the quote cannot be verified, the criterion verdict is automatically demoted to `unknown`.
2. **Independent Corroboration**: Any candidate sourced from a LinkedIn profile must have their identity and role confirmed by an independent third-party website. Unconfirmed profiles are omitted from results.

---
