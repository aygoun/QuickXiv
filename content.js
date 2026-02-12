// QuickXiv – Content Script
// Injects the QuickXiv sidebar (as an iframe) into arXiv paper pages.
// Works in Chrome, Arc, Edge, Brave, and any Chromium-based browser.

(function () {
  // Prevent double-injection
  if (document.getElementById("quickxiv-sidebar")) return;

  // -----------------------------------------------------------------------
  // Paper ID extraction
  // -----------------------------------------------------------------------

  const ARXIV_PATTERNS = [
    /^https:\/\/arxiv\.org\/abs\/(.+?)(?:\?|#|$)/,
    /^https:\/\/arxiv\.org\/pdf\/(.+?)(?:\.pdf)?(?:\?|#|$)/,
  ];

  function extractPaperId(url) {
    for (const pattern of ARXIV_PATTERNS) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  const paperId = extractPaperId(window.location.href);
  if (!paperId) return; // not a paper page

  // -----------------------------------------------------------------------
  // Constants
  // -----------------------------------------------------------------------

  const SIDEBAR_WIDTH = 420;
  const TOGGLE_SIZE = 40;

  // -----------------------------------------------------------------------
  // Create the sidebar container
  // -----------------------------------------------------------------------

  const sidebar = document.createElement("div");
  sidebar.id = "quickxiv-sidebar";
  sidebar.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    width: ${SIDEBAR_WIDTH}px;
    height: 100vh;
    z-index: 2147483647;
    box-shadow: -2px 0 12px rgba(0,0,0,0.12);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    transform: translateX(0);
    display: flex;
    flex-direction: column;
    background: #f8f9fb;
  `;

  // -----------------------------------------------------------------------
  // Create the iframe that hosts sidepanel.html
  // -----------------------------------------------------------------------

  const iframe = document.createElement("iframe");
  iframe.src = chrome.runtime.getURL("sidepanel.html");
  iframe.style.cssText = `
    width: 100%;
    height: 100%;
    border: none;
    flex: 1;
    background: #f8f9fb;
  `;
  iframe.allow = "";
  sidebar.appendChild(iframe);

  // -----------------------------------------------------------------------
  // Create the toggle button (visible when sidebar is collapsed too)
  // -----------------------------------------------------------------------

  const toggle = document.createElement("div");
  toggle.id = "quickxiv-toggle";
  toggle.title = "Toggle QuickXiv";
  toggle.style.cssText = `
    position: fixed;
    top: 50%;
    right: ${SIDEBAR_WIDTH}px;
    transform: translateY(-50%);
    width: ${TOGGLE_SIZE}px;
    height: ${TOGGLE_SIZE}px;
    background: #418BCB;
    border-radius: 8px 0 0 8px;
    cursor: pointer;
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: -2px 0 8px rgba(0,0,0,0.15);
    transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s ease;
    user-select: none;
  `;
  toggle.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  `;

  // -----------------------------------------------------------------------
  // Toggle logic
  // -----------------------------------------------------------------------

  let isOpen = true;

  // Save original styles so we can restore them
  const origBodyMarginRight = document.body.style.marginRight;
  const origBodyTransition = document.body.style.transition;

  function setSidebarOpen(open) {
    isOpen = open;

    // Push the page content (PDF / HTML) to the left instead of overlaying
    document.body.style.transition = "margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
    document.body.style.marginRight = open ? `${SIDEBAR_WIDTH}px` : origBodyMarginRight;

    if (open) {
      sidebar.style.transform = "translateX(0)";
      toggle.style.right = `${SIDEBAR_WIDTH}px`;
      toggle.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      `;
    } else {
      sidebar.style.transform = `translateX(${SIDEBAR_WIDTH}px)`;
      toggle.style.right = "0px";
      toggle.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      `;
    }
  }

  toggle.addEventListener("click", () => setSidebarOpen(!isOpen));

  // Hover effect
  toggle.addEventListener("mouseenter", () => {
    toggle.style.background = "#3578b5";
  });
  toggle.addEventListener("mouseleave", () => {
    toggle.style.background = "#418BCB";
  });

  // -----------------------------------------------------------------------
  // Listen for toggle messages from the background (toolbar icon click)
  // -----------------------------------------------------------------------

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "TOGGLE_SIDEBAR") {
      setSidebarOpen(!isOpen);
    }
  });

  // -----------------------------------------------------------------------
  // Inject into the page
  // -----------------------------------------------------------------------

  document.body.appendChild(sidebar);
  document.body.appendChild(toggle);

  // Apply initial margin to push page content left
  document.body.style.transition = "margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
  document.body.style.marginRight = `${SIDEBAR_WIDTH}px`;
})();
