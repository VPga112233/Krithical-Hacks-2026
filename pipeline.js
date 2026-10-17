import crypto from "crypto";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import {
  FAST_MODEL,
  SMART_MODEL,
  MAX_CHARS,
  CACHE_FILE,
  JUNK,
  QUAL_NAMES,
} from "./config.js";

dotenv.config();

let _groqClient = null;
let _tinyFishKey = null;

export const DEBUG = {};
export const LAST_ERROR = { msg: "" };

/**
 * Retrieve API key from environment
 */
function getKey(names, prefix) {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.trim()) return v.trim();
  }
  for (const v of Object.values(process.env)) {
    if (typeof v === "string" && v.startsWith(prefix)) {
      return v.trim();
    }
  }
  throw new Error(`Missing API key: please set ${names[0]} in your .env file.`);
}

export function getTinyFishKey() {
  if (!_tinyFishKey) {
    _tinyFishKey = getKey(["TINYFISH_API_KEY"], "sk-tinyfish-");
  }
  return _tinyFishKey;
}

export function getGroqClient() {
  if (!_groqClient) {
    const key = getKey(["GROQ_API_KEY"], "gsk_");
    _groqClient = new Groq({ apiKey: key });
  }
  return _groqClient;
}

export function getDomain(urlStr) {
  try {
    const parsed = new URL(urlStr);
    return parsed.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function isLinkedIn(domain) {
  return domain === "linkedin.com" || domain.endsWith(".linkedin.com");
}

export function isJunk(domain) {
  return JUNK.some((j) => domain === j || domain.endsWith("." + j));
}

export function norm(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * True if the quoted evidence really appears on the page (guards against made-up quotes).
 */
export function inText(evidence, normText) {
  const e = norm(evidence);
  if (e.length < 8) return false;
  if (normText.includes(e)) return true;
  const words = e.split(" ");
  return words.length >= 6 && normText.includes(words.slice(0, 6).join(" "));
}

export function extractJson(text) {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

export function extractContacts(text) {
  if (!text) return { emails: [], phones: [] };
  const emailRegex = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
  const phoneRegex = /(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}/g;

  const rawEmails = text.match(emailRegex) || [];
  const emails = [...new Set(rawEmails)]
    .filter((e) => !e.toLowerCase().match(/\.(png|jpg|jpeg|gif|svg|webp)$/))
    .slice(0, 2);

  const rawPhones = text.match(phoneRegex) || [];
  const phones = [...new Set(rawPhones.map((p) => p.trim()))].slice(0, 2);

  return { emails, phones };
}

export function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn("Could not load cache:", err.message);
  }
  return {};
}

export function saveCache(cache) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 1), "utf-8");
  } catch (err) {
    console.warn("Could not save cache:", err.message);
  }
}

/**
 * Call Groq in JSON mode with retry and fallback across models.
 */
export async function askJson(system, user, models, retries = 2) {
  const messages = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];

  const client = getGroqClient();

  for (const model of models) {
    const params = {
      model,
      temperature: 0,
      messages,
      response_format: { type: "json_object" },
    };

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const reply = await client.chat.completions.create(params);
        const content = reply.choices?.[0]?.message?.content;
        const data = extractJson(content);
        if (data && typeof data === "object") {
          return data;
        }
      } catch (err) {
        LAST_ERROR.msg = `${model}: ${err.status || err.code || "ERR"} ${String(err.message || "").slice(0, 120)}`;
        if (err.status === 400 && params.response_format) {
          delete params.response_format;
          continue;
        }
        if ([408, 429, 500, 502, 503, 504].includes(err.status) && attempt < retries) {
          const waitMs = 4000 * (attempt + 1);
          await new Promise((res) => setTimeout(res, waitMs));
          continue;
        }
        break;
      }
    }
  }
  return null;
}

export function buildPlan(profile) {
  const occupation = profile.occupation || "Chartered Accountant (CA)";
  const short = occupation.split(" (")[0].toLowerCase();
  const state = profile.state || "";
  const country = profile.country || "";
  const loc = state ? `${state}, ${country}` : country;
  const years = profile.years;
  const quals = profile.quals || [];
  const areas = profile.areas || [];

  const criteria = [
    `Occupation is ${occupation}`,
    `Has at least ${years} years of relevant experience`,
    `Is based in ${loc}`,
  ];
  quals.forEach((q) => criteria.push(`Holds ${QUAL_NAMES[q] || q}`));
  areas.forEach((a) => criteria.push(`Works in or offers ${a}`));

  const specialtyTerms = areas.slice(0, 2).join(" ");
  const credentialTerms = quals.slice(0, 2).join(" ");
  const firstArea = areas[0] || "";

  const queries = [
    `"${occupation}" ${loc} ${specialtyTerms}`,
    `"${occupation}" ${loc} ${credentialTerms} ${firstArea}`,
    `${occupation} ${loc} ${years}+ years experience ${specialtyTerms}`,
  ].map((q) => q.replace(/\s+/g, " ").trim());

  return {
    provider_type: short,
    occupation,
    location: loc,
    criteria,
    queries,
  };
}

/**
 * Execute searches concurrently across TinyFish API
 */
export async function findUrls(queries, countryCode, limit, log = console.log, includeLinkedin = true) {
  const apiKey = getTinyFishKey();
  const batches = [];

  // Parallel TinyFish queries for extreme speed!
  const searchPromises = queries.map(async (q) => {
    try {
      const url = new URL("https://api.search.tinyfish.ai/");
      url.searchParams.set("query", q);
      if (countryCode) url.searchParams.set("location", countryCode);
      url.searchParams.set("language", "en");

      let res = await fetch(url.toString(), {
        headers: {
          "X-API-Key": apiKey,
          Accept: "application/json",
        },
      });

      // Fallback without location if regional search fails
      if (!res.ok) {
        const fallbackUrl = new URL("https://api.search.tinyfish.ai/");
        fallbackUrl.searchParams.set("query", q);
        res = await fetch(fallbackUrl.toString(), {
          headers: {
            "X-API-Key": apiKey,
            Accept: "application/json",
          },
        });
      }

      if (!res.ok) {
        log(`Search failed for: ${q} (HTTP ${res.status})`);
        return [];
      }

      const json = await res.json();
      const items = (json.results || []).map((r) => ({
        url: r.url,
        title: r.title || "",
        snippet: r.snippet || "",
      }));

      if (items.length > 0 && !DEBUG.search_result) {
        DEBUG.search_result = JSON.stringify(items[0]).slice(0, 500);
      }
      log(`Search: ${items.length} results for: ${q}`);
      return items;
    } catch (err) {
      log(`Search error for ${q}: ${err.message}`);
      return [];
    }
  });

  const searchResults = await Promise.all(searchPromises);
  searchResults.forEach((batch) => batches.push(batch));

  const seen = new Set();
  const sites = [];
  const profiles = [];

  const maxLen = Math.max(0, ...batches.map((b) => b.length));
  for (let i = 0; i < maxLen; i++) {
    for (const b of batches) {
      if (i >= b.length) continue;
      const item = b[i];
      const url = item.url;
      const d = getDomain(url);

      if (isLinkedIn(d)) {
        const key = url.split("?")[0].replace(/\/+$/, "");
        if (includeLinkedin && url.includes("/in/") && !seen.has(key) && profiles.length < 3) {
          seen.add(key);
          profiles.push({ ...item, kind: "linkedin" });
        }
      } else if (!seen.has(d) && !isJunk(d)) {
        seen.add(d);
        sites.push({ ...item, kind: "website" });
      }
    }
  }

  return sites.slice(0, limit).concat(profiles);
}

/**
 * Fetch web pages via TinyFish API
 */
export async function readPages(items, log = console.log) {
  const urls = items.map((i) => i.url).slice(0, 10);
  if (urls.length === 0) return [];

  const apiKey = getTinyFishKey();
  try {
    const res = await fetch("https://api.fetch.tinyfish.ai/", {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        urls,
        format: "markdown",
        per_url_timeout_ms: 45000,
      }),
    });

    if (!res.ok) {
      log(`Fetch failed: HTTP ${res.status}`);
      return [];
    }

    const json = await res.json();
    const pages = [];
    for (const r of json.results || []) {
      const text = r.text || "";
      if (!DEBUG.fetch_result) {
        DEBUG.fetch_result = JSON.stringify(r).slice(0, 500);
      }
      if (text.trim().length > 200) {
        pages.push({
          url: r.url,
          title: r.title || "",
          text,
          kind: "website",
        });
      }
    }
    log(`Fetch: read ${pages.length} of ${urls.length} pages`);
    return pages;
  } catch (err) {
    log(`Fetch failed: ${err.message}`);
    return [];
  }
}

/**
 * Judge candidate page against criteria
 */
export async function judge(page, criteria, models) {
  const text = page.text.slice(0, MAX_CHARS);
  const numbered = criteria.map((c, i) => `${i + 1}. ${c}`).join("\n");
  const system =
    "You check whether a web page about a professional or firm meets requirements. " +
    "Use ONLY the page text. Never guess. Reply with JSON only.";

  const currentYear = new Date().getFullYear();
  const user = `REQUIREMENTS:
${numbered}

PAGE URL: ${page.url}
PAGE TEXT:
<<<
${text}
>>>

This year is ${currentYear}. You may work out years of experience from dates written on the page (for example "since 2009" or "established 2005").
Return JSON: {"name": "name of the ONE professional or firm this page is about, or empty", "page_type": "provider" or "directory_or_article" or "irrelevant", "verdicts": [{"n": 1, "verdict": "match" or "no_match" or "unknown", "evidence": "exact short quote copied from the page text (max 200 chars), or empty"}]}
Rules: use "match" or "no_match" only if you can copy an exact quote from the page text as evidence. If the page does not say, use "unknown". Give one verdict per requirement.`;

  const data = await askJson(system, user, models);
  if (!data) return null;

  const normText = norm(text);
  const found = {};

  for (const v of data.verdicts || []) {
    const n = parseInt(v.n, 10);
    if (isNaN(n)) continue;
    let verdict = ["match", "no_match", "unknown"].includes(v.verdict) ? v.verdict : "unknown";
    let evidence = String(v.evidence || "").trim();

    // Verify quote against page text
    if (verdict !== "unknown" && !inText(evidence, normText)) {
      verdict = "unknown";
      evidence = "";
    }
    found[n] = [verdict, evidence];
  }

  const rows = criteria.map((c, i) => {
    const pair = found[i + 1] || ["unknown", ""];
    return {
      criterion: c,
      verdict: pair[0],
      evidence: pair[1],
    };
  });

  const matched = rows.filter((r) => r.verdict === "match").length;
  const unknownCount = rows.filter((r) => r.verdict === "unknown").length;
  const score = Math.round((100 * matched) / rows.length);

  const name = String(data.name || "").trim() || getDomain(page.url);

  return {
    name,
    page_type: String(data.page_type || "provider"),
    url: page.url,
    title: page.title || "",
    kind: page.kind || "website",
    rows,
    score,
    matched,
    total: rows.length,
    unknown: unknownCount,
    contacts: extractContacts(page.text),
  };
}

/**
 * Cross-check LinkedIn profile against independent websites
 */
export async function corroborate(person, plan, countryCode, models) {
  const name = person.name;
  if (!name || name.toLowerCase().includes("linkedin")) return null;

  const q = `"${name}" ${plan.provider_type} ${plan.location}`;
  const apiKey = getTinyFishKey();

  let urls = [];
  try {
    const searchUrl = new URL("https://api.search.tinyfish.ai/");
    searchUrl.searchParams.set("query", q);
    if (countryCode) searchUrl.searchParams.set("location", countryCode);
    searchUrl.searchParams.set("language", "en");

    const res = await fetch(searchUrl.toString(), {
      headers: { "X-API-Key": apiKey, Accept: "application/json" },
    });
    if (res.ok) {
      const json = await res.json();
      urls = (json.results || [])
        .map((r) => r.url)
        .filter((u) => {
          const d = getDomain(u);
          return !isLinkedIn(d) && !isJunk(d);
        });
    }
  } catch {
    return null;
  }

  const last = (name.split(/\s+/).pop() || "").toLowerCase();
  const topPages = await readPages(urls.slice(0, 3).map((u) => ({ url: u })), () => {});

  for (const page of topPages) {
    const text = page.text.slice(0, MAX_CHARS);
    const system =
      "You check whether a web page confirms a specific person. Use ONLY the page text. Reply with JSON only.";
    const user = `PERSON: ${name}
ROLE: ${plan.provider_type}
PAGE TEXT:
<<<
${text}
>>>

Return JSON: {"confirms": true or false, "evidence": "exact quote (max 200 chars) copied from the page that names ${name} and their role or work, or empty"}
Say true only if the page is clearly about this same person.`;

    const data = await askJson(system, user, models);
    const evidence = String(data?.evidence || "");
    if (
      data &&
      data.confirms === true &&
      evidence.toLowerCase().includes(last) &&
      inText(evidence, norm(text))
    ) {
      return {
        url: page.url,
        evidence,
        _text: page.text,
      };
    }
  }
  return null;
}

/**
 * Deep sort object keys for deterministic hash computation (matches Python json.dumps sort_keys=True)
 */
function sortObject(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sortObject);
  const sorted = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = sortObject(obj[key]);
  }
  return sorted;
}

/**
 * Main discovery pipeline: selections -> TinyFish Search & Fetch -> Groq verification
 */
export async function findProviders(profile, options = {}, log = console.log) {
  const maxCandidates = options.maxCandidates || 6;
  const accurate = options.accurate || false;
  const useCache = options.useCache !== false;
  const includeLinkedin = options.includeLinkedin !== false;

  // Compute deterministic SHA1 cache key
  const cachePayload = sortObject([
    "public-evidence-v2",
    profile,
    maxCandidates,
    accurate,
    includeLinkedin,
  ]);
  const key = crypto.createHash("sha1").update(JSON.stringify(cachePayload)).digest("hex");

  const cache = loadCache();
  if (useCache && cache[key]) {
    log("Using saved results from cache");
    return { ...cache[key], cached: true };
  }

  for (const k in DEBUG) delete DEBUG[k];
  LAST_ERROR.msg = "";

  const code = profile.country_code || null;
  const judgeModels = accurate ? [SMART_MODEL, FAST_MODEL] : [FAST_MODEL, SMART_MODEL];

  const plan = buildPlan(profile);
  const queries = [...plan.queries];
  if (includeLinkedin) {
    queries.push(`site:linkedin.com/in ${plan.queries[0]}`);
  }

  log(`Checking ${plan.criteria.length} criteria with ${queries.length} searches`);

  // Step 1: Concurrently search TinyFish
  const items = await findUrls(queries, code, maxCandidates, log, includeLinkedin);

  // Step 2: Concurrently fetch web pages
  const webItems = items.filter((i) => i.kind === "website");
  const pages = await readPages(webItems, log);

  for (const i of items) {
    if (i.kind === "linkedin") {
      pages.push({
        url: i.url,
        title: i.title,
        kind: "linkedin",
        text: `${i.title}\n${i.snippet}`,
      });
    }
  }

  const texts = {};
  pages.forEach((p) => {
    texts[p.url] = p.text;
  });

  // Step 3: Concurrent Groq LLM judging (with concurrency limit = 3)
  const providers = [];
  const skipped = [];

  const judgeWorker = async (page) => {
    try {
      const res = await judge(page, plan.criteria, judgeModels);
      if (res && !["directory_or_article", "irrelevant"].includes(res.page_type)) {
        providers.push(res);
        log(`Checked ${res.name}: ${res.score}% match`);
      } else {
        skipped.push(page.url);
      }
    } catch (err) {
      skipped.push(page.url);
    }
  };

  // Run judging with concurrency pool of 3
  const poolLimit = 3;
  const pool = [];
  for (const page of pages) {
    const p = judgeWorker(page);
    pool.push(p);
    if (pool.length >= poolLimit) {
      await Promise.race(pool);
      // Remove finished promises
      for (let i = pool.length - 1; i >= 0; i--) {
        const settled = await Promise.resolve(pool[i]).then(
          () => true,
          () => true
        );
        if (settled) pool.splice(i, 1);
      }
    }
  }
  await Promise.all(pool);

  // Step 4: Cross-check LinkedIn profiles
  const profiles = providers.filter((p) => p.kind === "linkedin");
  let qualifiedProviders = providers.filter((p) => p.kind !== "linkedin");

  if (profiles.length > 0) {
    log("Cross-checking LinkedIn profiles against independent websites...");
    const checkPromises = profiles.map(async (p) => {
      try {
        const co = await corroborate(p, plan, code, judgeModels);
        if (co) {
          texts[p.url] = co._text || "";
          delete co._text;
        }
        p.corroboration = co;
        if (co) qualifiedProviders.push(p);
        log(`LinkedIn ${p.name}: ${co ? "confirmed by another website" : "not confirmed"}`);
      } catch (err) {
        log(`LinkedIn corroboration error for ${p.name}: ${err.message}`);
      }
    });
    await Promise.all(checkPromises);
  }

  // Filter: must have matched > 0, no "no_match" verdicts, and if linkedin must be corroborated
  qualifiedProviders = qualifiedProviders.filter(
    (p) =>
      p.matched > 0 &&
      p.rows.every((row) => row.verdict !== "no_match") &&
      (p.kind !== "linkedin" || p.corroboration)
  );

  // Sort: highest matched desc, lowest unknown asc, highest score desc
  qualifiedProviders.sort((a, b) => {
    if (b.matched !== a.matched) return b.matched - a.matched;
    if (a.unknown !== b.unknown) return a.unknown - b.unknown;
    return b.score - a.score;
  });

  const warning =
    !qualifiedProviders.length && LAST_ERROR.msg
      ? `AI model problem: ${LAST_ERROR.msg}`
      : "";

  const data = {
    plan,
    providers: qualifiedProviders,
    unverified: [],
    skipped,
    warning,
    debug: { ...DEBUG },
    cached: false,
  };

  if (qualifiedProviders.length > 0) {
    cache[key] = data;
    saveCache(cache);
  }

  return data;
}
