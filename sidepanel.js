// QuickXiv – Side Panel Logic
// Manages API key, paper fetching, HF summarization, and rendering.

// =========================================================================
// Configuration
// =========================================================================

const HF_MODEL = "mistralai/Mistral-7B-Instruct-v0.2";
const HF_API_URL = "https://router.huggingface.co/v1/chat/completions";

// Loading-text element for streaming progress
let $loadingText = null;

const SUMMARY_SECTIONS = [
  {
    key: "problem",
    title: "What It Solved",
    emoji: "\uD83C\uDFAF", // 🎯
    badge: "problem",
  },
  {
    key: "method",
    title: "How It Solved It",
    emoji: "\uD83D\uDD27", // 🔧
    badge: "method",
  },
  {
    key: "results",
    title: "Key Results",
    emoji: "\uD83D\uDCCA", // 📊
    badge: "results",
  },
  {
    key: "limitations",
    title: "Limitations & Future Work",
    emoji: "\uD83D\uDD2E", // 🔮
    badge: "limitations",
  },
];

// =========================================================================
// DOM References
// =========================================================================

const $onboarding = document.getElementById("onboarding");
const $main = document.getElementById("main");
const $apiKeyInput = document.getElementById("api-key-input");
const $saveKeyBtn = document.getElementById("save-key-btn");
const $keyError = document.getElementById("key-error");
const $paperInfo = document.getElementById("paper-info");
const $paperTitle = document.getElementById("paper-title");
const $paperAuthors = document.getElementById("paper-authors");
const $loading = document.getElementById("loading");
const $error = document.getElementById("error");
const $errorMessage = document.getElementById("error-message");
const $retryBtn = document.getElementById("retry-btn");
const $noPaper = document.getElementById("no-paper");
const $ready = document.getElementById("ready");
const $summarizeBtn = document.getElementById("summarize-btn");
const $summary = document.getElementById("summary");
const $settingsBtn = document.getElementById("settings-btn");
const $settingsModal = document.getElementById("settings-modal");
const $modalApiKey = document.getElementById("modal-api-key");
const $modalSaveBtn = document.getElementById("modal-save-btn");
const $modalCancelBtn = document.getElementById("modal-cancel-btn");
const $closeModalBtn = document.getElementById("close-modal-btn");
const $usageBtn = document.getElementById("usage-btn");
const $usageModal = document.getElementById("usage-modal");
const $closeUsageBtn = document.getElementById("close-usage-btn");
const $usageTotalRequests = document.getElementById("usage-total-requests");
const $usageTotalTokens = document.getElementById("usage-total-tokens");
const $usageTotalPapers = document.getElementById("usage-total-papers");
const $usageHistory = document.getElementById("usage-history");
const $usageClearBtn = document.getElementById("usage-clear-btn");

// =========================================================================
// State
// =========================================================================

let currentPaperId = null;
let apiKey = null;

// =========================================================================
// Initialization
// =========================================================================

async function init() {
  // Load API key
  const stored = await chrome.storage.sync.get("hf_api_key");
  apiKey = stored.hf_api_key || null;

  if (!apiKey) {
    showScreen("onboarding");
  } else {
    showScreen("main");
    // Don't auto-summarize — just detect the paper and show the "ready" state
    await detectPaper();
  }

  bindEvents();
}

function bindEvents() {
  // Onboarding
  $saveKeyBtn.addEventListener("click", handleSaveKey);
  $apiKeyInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSaveKey();
  });

  // Settings modal
  $settingsBtn.addEventListener("click", openSettings);
  $closeModalBtn.addEventListener("click", closeSettings);
  $modalCancelBtn.addEventListener("click", closeSettings);
  $modalSaveBtn.addEventListener("click", handleModalSave);

  // Summarize button (manual trigger)
  $summarizeBtn.addEventListener("click", () => runSummarize());

  // Retry
  $retryBtn.addEventListener("click", () => runSummarize());

  // Close modal on overlay click
  $settingsModal.addEventListener("click", (e) => {
    if (e.target === $settingsModal) closeSettings();
  });

  // Usage modal
  $usageBtn.addEventListener("click", openUsage);
  $closeUsageBtn.addEventListener("click", closeUsage);
  $usageClearBtn.addEventListener("click", clearUsage);
  $usageModal.addEventListener("click", (e) => {
    if (e.target === $usageModal) closeUsage();
  });
}

// =========================================================================
// Screen Management
// =========================================================================

function showScreen(screen) {
  $onboarding.classList.toggle("hidden", screen !== "onboarding");
  $main.classList.toggle("hidden", screen !== "main");
}

function showState(state) {
  $loading.classList.toggle("hidden", state !== "loading");
  $error.classList.toggle("hidden", state !== "error");
  $noPaper.classList.toggle("hidden", state !== "no-paper");
  $ready.classList.toggle("hidden", state !== "ready");
  $summary.classList.toggle("hidden", state !== "summary");
  $paperInfo.classList.toggle(
    "hidden",
    state === "no-paper" || state === "error",
  );
}

// =========================================================================
// API Key Handling
// =========================================================================

async function handleSaveKey() {
  const key = $apiKeyInput.value.trim();
  if (!key) {
    showKeyError("Please enter your API key.");
    return;
  }
  if (!key.startsWith("hf_")) {
    showKeyError('API key should start with "hf_".');
    return;
  }

  apiKey = key;
  await chrome.storage.sync.set({ hf_api_key: key });
  showScreen("main");
  detectPaper();
}

function showKeyError(msg) {
  $keyError.textContent = msg;
  $keyError.classList.remove("hidden");
}

function openSettings() {
  $modalApiKey.value = apiKey || "";
  $settingsModal.classList.remove("hidden");
}

function closeSettings() {
  $settingsModal.classList.add("hidden");
}

async function handleModalSave() {
  const key = $modalApiKey.value.trim();
  if (!key || !key.startsWith("hf_")) return;
  apiKey = key;
  await chrome.storage.sync.set({ hf_api_key: key });
  closeSettings();
}

// =========================================================================
// Usage Tracking
// =========================================================================

async function trackUsage(paperTitle, inputChars, outputChars) {
  // Rough token estimate: ~4 chars per token for English text
  const inputTokens = Math.round(inputChars / 4);
  const outputTokens = Math.round(outputChars / 4);
  const totalTokens = inputTokens + outputTokens;

  const stored = await chrome.storage.sync.get("usage");
  const usage = stored.usage || { requests: 0, tokens: 0, papers: [], paperSet: [] };

  usage.requests += 1;
  usage.tokens += totalTokens;

  // Track unique papers
  if (!usage.paperSet.includes(currentPaperId)) {
    usage.paperSet.push(currentPaperId);
  }

  // Add to history (keep last 20)
  usage.papers.unshift({
    title: paperTitle.slice(0, 80),
    tokens: totalTokens,
    date: new Date().toISOString(),
  });
  if (usage.papers.length > 20) usage.papers = usage.papers.slice(0, 20);

  await chrome.storage.sync.set({ usage });
}

async function openUsage() {
  const stored = await chrome.storage.sync.get("usage");
  const usage = stored.usage || { requests: 0, tokens: 0, papers: [], paperSet: [] };

  $usageTotalRequests.textContent = usage.requests;
  $usageTotalTokens.textContent = formatNumber(usage.tokens);
  $usageTotalPapers.textContent = (usage.paperSet || []).length;

  // Render history
  if (usage.papers.length === 0) {
    $usageHistory.innerHTML = '<p class="usage-empty">No requests yet.</p>';
  } else {
    $usageHistory.innerHTML = usage.papers
      .map((entry) => {
        const date = new Date(entry.date);
        const timeStr = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
        return `
          <div class="usage-entry">
            <span class="usage-entry-title">${escapeHtml(entry.title)}</span>
            <span class="usage-entry-meta">
              <span>${entry.tokens} tok</span>
              <span>${timeStr}</span>
            </span>
          </div>
        `;
      })
      .join("");
  }

  $usageModal.classList.remove("hidden");
}

function closeUsage() {
  $usageModal.classList.add("hidden");
}

async function clearUsage() {
  await chrome.storage.sync.set({
    usage: { requests: 0, tokens: 0, papers: [], paperSet: [] },
  });
  openUsage(); // refresh the modal
}

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// =========================================================================
// Summary Cache (chrome.storage.local, keyed by paper ID)
// =========================================================================

const CACHE_PREFIX = "summary_";
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function getSummaryCache(paperId) {
  const key = CACHE_PREFIX + paperId;
  const stored = await chrome.storage.local.get(key);
  const entry = stored[key];
  if (!entry) return null;

  // Expire old entries
  if (Date.now() - entry.timestamp > CACHE_MAX_AGE_MS) {
    await chrome.storage.local.remove(key);
    return null;
  }

  return entry;
}

async function setSummaryCache(paperId, paperData, summaryData) {
  const key = CACHE_PREFIX + paperId;
  // Store only what we need (not the full text, to save space)
  await chrome.storage.local.set({
    [key]: {
      paperData: {
        title: paperData.title,
        authors: paperData.authors,
        abstract: paperData.abstract,
        sectionTitles: paperData.sectionTitles,
        // skip fullText to save storage space
      },
      summaryData,
      timestamp: Date.now(),
    },
  });
  console.log("[QuickXiv] Summary cached for", paperId);
}

// =========================================================================
// Paper Detection & Summarization Pipeline
// =========================================================================

// Cached paper data so we don't re-fetch when the user clicks "Summarize"
let cachedPaperData = null;

/**
 * Detect if we're on a paper page, fetch + parse it, show title,
 * then show the "ready" state with the Summarize button.
 */
async function detectPaper() {
  const response = await chrome.runtime.sendMessage({ type: "GET_PAPER_ID" });
  const paperId = response?.paperId;

  if (!paperId) {
    showState("no-paper");
    return;
  }

  // Don't re-fetch if we already have this paper loaded
  if (paperId === currentPaperId && cachedPaperData) {
    if (!$summary.classList.contains("hidden")) return;
    showState("ready");
    return;
  }

  currentPaperId = paperId;
  showState("loading");

  try {
    // Check if we have a cached summary for this paper
    const cached = await getSummaryCache(paperId);
    if (cached) {
      console.log("[QuickXiv] Loaded summary from cache for", paperId);
      cachedPaperData = cached.paperData;

      $paperTitle.textContent = cachedPaperData.title || "Untitled Paper";
      $paperAuthors.textContent = cachedPaperData.authors || "Unknown Authors";
      $paperInfo.classList.remove("hidden");

      renderSummary(cached.summaryData, cachedPaperData.sectionTitles);
      showState("summary");
      return;
    }

    // No cache — fetch from ar5iv
    const result = await chrome.runtime.sendMessage({
      type: "FETCH_PAPER_HTML",
      paperId,
    });

    if (result.error) {
      throw new Error(result.error);
    }

    cachedPaperData = parsePaperHTML(result.html);

    // Show paper info
    $paperTitle.textContent = cachedPaperData.title || "Untitled Paper";
    $paperAuthors.textContent = cachedPaperData.authors || "Unknown Authors";
    $paperInfo.classList.remove("hidden");

    // Show ready state with Summarize button
    showState("ready");
  } catch (err) {
    console.error("QuickXiv error:", err);
    $errorMessage.textContent = err.message || "Something went wrong.";
    showState("error");
  }
}

/**
 * Run the summarization on the already-fetched paper data.
 */
async function runSummarize() {
  if (!cachedPaperData) {
    await detectPaper();
    if (!cachedPaperData) return;
  }

  showState("summary");
  $summary.innerHTML = '<p class="streaming-placeholder">Generating summary...</p>';

  try {
    const summaryData = await summarizeWithHFStream(
      cachedPaperData.fullText,
      cachedPaperData.sectionTitles,
      (partialText) => {
        const partial = parseSummaryResponse(partialText);
        renderSummary(partial, cachedPaperData.sectionTitles);
      },
    );

    // Save to cache
    await setSummaryCache(currentPaperId, cachedPaperData, summaryData);

    // Track usage
    const outputLength = Object.values(summaryData).join("").length;
    await trackUsage(cachedPaperData.title, cachedPaperData.fullText.length, outputLength);
  } catch (err) {
    console.error("QuickXiv error:", err);
    $errorMessage.textContent = err.message || "Something went wrong.";
    showState("error");
  }
}

// =========================================================================
// Paper HTML Parsing (runs in side panel which has full DOM access)
// =========================================================================

function parsePaperHTML(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Title
  const titleEl =
    doc.querySelector(".ltx_title.ltx_title_document") ||
    doc.querySelector("h1") ||
    doc.querySelector("title");
  const title = titleEl ? titleEl.textContent.trim() : "Unknown Title";

  // Authors
  const authorEls = doc.querySelectorAll(".ltx_personname");
  const authors = Array.from(authorEls)
    .map((el) => el.textContent.trim())
    .join(", ");

  // Abstract
  const abstractEl = doc.querySelector(".ltx_abstract");
  const abstract = abstractEl
    ? abstractEl.textContent.replace(/^Abstract\s*/i, "").trim()
    : "";

  // Body sections – collect text from main content sections
  const sections = [];
  const sectionEls = doc.querySelectorAll(
    "section.ltx_section, .ltx_section, section.ltx_chapter",
  );

  for (const sec of sectionEls) {
    const heading = sec.querySelector(
      "h2, h3, h4, .ltx_title.ltx_title_section",
    );
    const sectionTitle = heading ? heading.textContent.trim() : "";

    // Skip references / bibliography / appendix sections
    const lowerTitle = sectionTitle.toLowerCase();
    if (
      lowerTitle.includes("reference") ||
      lowerTitle.includes("bibliograph") ||
      lowerTitle.includes("appendix") ||
      lowerTitle.includes("acknowledgment")
    ) {
      continue;
    }

    // Get text content of the section (excluding nested section headings)
    const paragraphs = sec.querySelectorAll("p, .ltx_para");
    let text = "";
    for (const p of paragraphs) {
      text += p.textContent.trim() + "\n";
    }

    if (text.trim()) {
      sections.push({ title: sectionTitle, text: text.trim() });
    }
  }

  // Clean LaTeX artifacts: repeated digits like "181818" → "18", "333333" → "33"
  function cleanLatex(str) {
    return str
      .replace(/(\d{1,4})\1{2,}/g, "$1") // e.g. 181818 → 18
      .replace(/\s{2,}/g, " ") // collapse whitespace
      .trim();
  }

  // Build section titles list for the prompt (so the model can reference them)
  const sectionTitles = sections.map((s) => s.title).filter(Boolean);

  // Combine into a single text block for summarization
  let fullText = `Title: ${cleanLatex(title)}\n\nAuthors: ${authors}\n\nAbstract:\n${cleanLatex(abstract)}\n\n`;
  for (const sec of sections) {
    fullText += `## ${cleanLatex(sec.title)}\n${cleanLatex(sec.text)}\n\n`;
  }

  // Truncate to ~12 000 characters to fit within typical model context windows
  const MAX_CHARS = 12000;
  if (fullText.length > MAX_CHARS) {
    const headLength = Math.floor(MAX_CHARS * 0.7);
    const tailLength = MAX_CHARS - headLength - 50;
    fullText =
      fullText.slice(0, headLength) +
      "\n\n[... content truncated for brevity ...]\n\n" +
      fullText.slice(-tailLength);
  }

  return {
    title: cleanLatex(title),
    authors,
    abstract: cleanLatex(abstract),
    fullText,
    sectionTitles,
  };
}

// =========================================================================
// Hugging Face Inference API
// =========================================================================

/**
 * Stream chat completion from HF Inference API (SSE).
 * Calls onChunk(partialText) as tokens arrive for live rendering.
 * Returns the final parsed summary sections.
 */
async function summarizeWithHFStream(paperText, sectionTitles = [], onChunk) {
  const messages = buildMessages(paperText, sectionTitles);

  console.log("[QuickXiv] Sending streaming request to HF API...");
  console.log("[QuickXiv] Model:", HF_MODEL);
  console.log("[QuickXiv] Paper text length:", paperText.length);

  const body = {
    model: HF_MODEL,
    messages,
    max_tokens: 1500,
    temperature: 0.5,
    top_p: 0.7,
    stream: true,
  };

  const response = await fetch(HF_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("[QuickXiv] API error:", response.status, errorBody);
    if (response.status === 401 || response.status === 403) {
      throw new Error("Invalid API key. Please update it in settings.");
    }
    if (response.status === 503) {
      throw new Error("Model is loading. Please retry in a few seconds.");
    }
    throw new Error(`API error (${response.status}): ${errorBody}`);
  }

  // Read the SSE stream
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";
  let lastRenderTime = 0;
  const RENDER_INTERVAL = 150; // ms – throttle re-renders for performance

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Process complete SSE lines
    const lines = buffer.split("\n");
    buffer = lines.pop() || ""; // keep incomplete line in buffer

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data:")) continue;

      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") continue;

      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          fullText += delta;

          // Throttled live rendering
          const now = Date.now();
          if (onChunk && now - lastRenderTime > RENDER_INTERVAL) {
            lastRenderTime = now;
            onChunk(fullText);
          }
        }
      } catch {
        // Skip malformed chunks
      }
    }
  }

  console.log("[QuickXiv] Streaming complete, total length:", fullText.length);
  console.log("[QuickXiv] Final text:", fullText.slice(0, 400));

  // Final render with the complete text
  const result = parseSummaryResponse(fullText);
  if (onChunk) onChunk(fullText);
  return result;
}

function buildMessages(paperText, sectionTitles = []) {
  const sectionList = sectionTitles.length
    ? `\nThe paper has these sections: ${sectionTitles.join(", ")}.\nWhen referencing where information comes from, use the format [Sec: <section name>] inline.`
    : "";

  return [
    {
      role: "system",
      content: `You are an expert scientific paper summarizer. You produce clear, well-structured summaries that help researchers quickly understand a paper.

Rules:
- Use bullet points (starting with "- ") for each key point.
- Each bullet should be one clear, specific sentence — avoid vague generalities.
- Include concrete details: method names, dataset names, metrics, numbers.
- When a point comes from a specific section of the paper, add a reference like [Sec: Introduction] or [Sec: Experiments] at the end of that bullet.
- Do NOT repeat the paper title or author names.

Respond with EXACTLY these four sections:

**What It Solved:**
<bullet points about the problem, gap, or challenge this paper addresses>

**How It Solved It:**
<bullet points about the proposed method, architecture, or approach>

**Key Results:**
<bullet points with concrete numbers, comparisons, or findings>

**Limitations & Future Work:**
<bullet points about acknowledged weaknesses, open questions, or suggested extensions>`,
    },
    {
      role: "user",
      content: `Summarize the following research paper.${sectionList}\n\n${paperText}`,
    },
  ];
}

function parseSummaryResponse(text) {
  const sections = {};

  // Try to parse the structured sections
  const patterns = [
    {
      key: "problem",
      regex:
        /\*?\*?What It Solved:?\*?\*?\s*([\s\S]*?)(?=\*?\*?How It Solved|$)/i,
    },
    {
      key: "method",
      regex:
        /\*?\*?How It Solved It:?\*?\*?\s*([\s\S]*?)(?=\*?\*?Key Results|$)/i,
    },
    {
      key: "results",
      regex: /\*?\*?Key Results:?\*?\*?\s*([\s\S]*?)(?=\*?\*?Limitations|$)/i,
    },
    {
      key: "limitations",
      regex:
        /\*?\*?Limitations\s*(?:&|and)?\s*Future Work:?\*?\*?\s*([\s\S]*?)$/i,
    },
  ];

  for (const { key, regex } of patterns) {
    const match = text.match(regex);
    sections[key] = match ? match[1].trim() : "";
  }

  // Fallback: if parsing failed, put everything in the first section
  const hasContent = Object.values(sections).some((v) => v.length > 10);
  if (!hasContent) {
    sections.problem =
      text.trim() || "Could not generate summary. Please retry.";
    sections.method = "";
    sections.results = "";
    sections.limitations = "";
  }

  return sections;
}

// =========================================================================
// Render Summary
// =========================================================================

function renderSummary(data, sectionTitles = []) {
  $summary.innerHTML = "";

  for (const section of SUMMARY_SECTIONS) {
    const content = data[section.key];
    if (!content) continue;

    const card = document.createElement("div");
    card.className = "summary-card";

    const chevronSvg = `<svg class="card-chevron open" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;

    card.innerHTML = `
      <div class="card-header">
        <div class="card-badge ${section.badge}">${section.emoji}</div>
        <span class="card-title">${section.title}</span>
        ${chevronSvg}
      </div>
      <div class="card-body">
        ${formatContent(content, sectionTitles)}
      </div>
    `;

    // Toggle collapse
    const header = card.querySelector(".card-header");
    const body = card.querySelector(".card-body");
    const chevron = card.querySelector(".card-chevron");

    header.addEventListener("click", () => {
      body.classList.toggle("collapsed");
      chevron.classList.toggle("open");
    });

    $summary.appendChild(card);
  }
}

function formatContent(text, sectionTitles = []) {
  // Convert markdown-like content to HTML
  let html = text
    // Bold
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    // Bullet points
    .replace(/^[-•]\s+(.+)/gm, "<li>$1</li>");

  // Convert [Sec: X] references to styled tags (non-clickable)
  html = html.replace(/\[Sec(?:tion)?:\s*([^\]]+)\]/gi, (match, secName) => {
    const trimmed = secName.trim();
    return `<span class="sec-ref">${trimmed}</span>`;
  });

  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li>.*?<\/li>\s*)+)/g, "<ul>$1</ul>");

  // Split remaining text into paragraphs
  html = html
    .split(/\n\n+/)
    .map((p) => {
      p = p.trim();
      if (!p || p.startsWith("<ul>")) return p;
      return `<p>${p}</p>`;
    })
    .join("");

  // Clean up stray newlines inside paragraphs
  html = html.replace(/\n/g, " ");

  return html || "<p>No information available.</p>";
}

// =========================================================================
// Boot
// =========================================================================

init();
