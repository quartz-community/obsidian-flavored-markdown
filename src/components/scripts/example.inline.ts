// @ts-nocheck
// ============================================================================
// Example Inline Script for Quartz Community Plugin
// ============================================================================
// This file demonstrates patterns commonly used in Quartz plugin client-side code.
// It is bundled as a string and injected via Component.afterDOMLoaded.
//
// Key patterns demonstrated:
// 1. Listening to Quartz navigation events ('nav', 'prenav')
// 2. Fetching content index data
// 3. DOM manipulation with cleanup
// 4. State persistence (localStorage/sessionStorage)
// 5. Keyboard shortcut handling
// 6. Proper event listener cleanup
// ============================================================================

// Helper: Remove all children from an element
function removeAllChildren(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

// Helper: Simplify slug by removing trailing /index
function simplifySlug(slug) {
  if (slug.endsWith("/index")) {
    return slug.slice(0, -6);
  }
  return slug;
}

// Helper: Get current page slug from URL
function getCurrentSlug() {
  let slug = window.location.pathname;
  if (slug.startsWith("/")) slug = slug.slice(1);
  if (slug.endsWith("/")) slug = slug.slice(0, -1);
  return slug || "index";
}

// Helper: Fetch content index (commonly needed for search, graph, explorer)
async function fetchContentIndex() {
  try {
    const response = await fetch("/static/contentIndex.json");
    const data = await response.json();
    // Handle both formats: { "slug": {...} } or { "content": { "slug": {...} } }
    return data.content || data;
  } catch (error) {
    console.error("[Plugin] Error fetching content index:", error);
    return null;
  }
}

// Main initialization function
function init() {
  const components = document.querySelectorAll(".example-component");
  if (components.length === 0) return;

  // Example: Track cleanup functions for event listeners
  const cleanupFns = [];

  // Example: Add a keyboard shortcut (Ctrl/Cmd + Shift + E)
  function keyboardHandler(e) {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "e") {
      e.preventDefault();
      console.log("[ExampleComponent] Keyboard shortcut triggered!");
      // Do something interesting here
    }
  }

  document.addEventListener("keydown", keyboardHandler);
  cleanupFns.push(() => document.removeEventListener("keydown", keyboardHandler));

  // Example: Click handler with proper cleanup
  for (const component of components) {
    const clickHandler = () => {
      console.log("[ExampleComponent] Clicked!");
    };
    component.addEventListener("click", clickHandler);
    cleanupFns.push(() => component.removeEventListener("click", clickHandler));
  }

  // Register cleanup with Quartz's cleanup system
  if (typeof window !== "undefined" && window.addCleanup) {
    window.addCleanup(() => {
      cleanupFns.forEach((fn) => fn());
    });
  }

  console.log("[ExampleComponent] Initialized with", components.length, "component(s)");
}

// Listen to Quartz navigation events
// 'nav' fires after page navigation (including initial load)
document.addEventListener("nav", (e) => {
  const slug = e.detail?.url || getCurrentSlug();
  console.log("[ExampleComponent] Navigation to:", slug);
  init();
});

// 'prenav' fires before navigation - use for saving state
document.addEventListener("prenav", () => {
  // Example: Save scroll position before navigation
  const component = document.querySelector(".example-component");
  if (component) {
    sessionStorage.setItem("exampleScrollTop", component.scrollTop?.toString() || "0");
  }
});
