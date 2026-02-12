// QuickXiv – Background Service Worker
// Handles: toolbar icon click → toggle, paper HTML fetching, paper ID extraction.

const ARXIV_PATTERNS = [
  /^https:\/\/arxiv\.org\/abs\/(.+?)(?:\?|#|$)/,
  /^https:\/\/arxiv\.org\/pdf\/(.+?)(?:\.pdf)?(?:\?|#|$)/,
];

/**
 * Extract an arXiv paper ID from a URL.
 * Returns null if the URL is not a recognized arXiv paper page.
 */
function extractPaperId(url) {
  for (const pattern of ARXIV_PATTERNS) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// ---------------------------------------------------------------------------
// Toolbar icon click → tell the content script to toggle the sidebar
// ---------------------------------------------------------------------------

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url) return;
  const paperId = extractPaperId(tab.url);
  if (!paperId) return;

  try {
    await chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_SIDEBAR" });
  } catch {
    // Content script may not be injected yet – inject it now
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });
  }
});

// ---------------------------------------------------------------------------
// Message handling – the iframe (sidepanel.js) communicates through here
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_PAPER_ID") {
    // The side panel iframe asks: what paper is on the active tab?
    // Always query the active tab (the iframe's sender.tab may be undefined
    // because its src is a chrome-extension:// URL, not the arXiv page).
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url) {
        sendResponse({ paperId: extractPaperId(tabs[0].url) });
      } else {
        sendResponse({ paperId: null });
      }
    });
    return true; // async
  }

  if (message.type === "FETCH_PAPER_HTML") {
    // Fetch the full paper HTML from ar5iv (cross-origin, so must go through
    // the background service worker which has host_permissions).
    const { paperId } = message;
    fetchPaperHTML(paperId)
      .then((html) => sendResponse({ html }))
      .catch((err) => sendResponse({ error: err.message }));
    return true; // async
  }

});

// ---------------------------------------------------------------------------
// Fetch raw paper HTML from ar5iv
// ---------------------------------------------------------------------------

async function fetchPaperHTML(paperId) {
  const url = `https://ar5iv.labs.arxiv.org/html/${paperId}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch paper HTML (status ${response.status})`);
  }
  return await response.text();
}
