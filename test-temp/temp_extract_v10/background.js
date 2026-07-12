/* ══════════════════════════════════════════════════════════
   Annotation Tool — Background Service Worker (MV3)
   - Extension icon = ON/OFF toggle
   - When ON: auto-inject on every page load / navigation
   - Badge shows ON (green) / OFF (no badge)
══════════════════════════════════════════════════════════ */

let isOn = false;

// On startup: set defaults for new users if not already set
chrome.storage.local.get(['AN_enabled', 'AN_theme', 'AN_lang'], (r) => {
  isOn = r.AN_enabled === true;
  updateIcon();
  // Write defaults only if keys are missing (new user)
  const defaults = {};
  if (r.AN_theme === undefined) defaults.AN_theme = 'device';
  if (r.AN_lang  === undefined) defaults.AN_lang  = 'en';
  if (Object.keys(defaults).length > 0) chrome.storage.local.set(defaults);
});

// Toggle ON/OFF on icon click
chrome.action.onClicked.addListener((tab) => {
  isOn = !isOn;
  chrome.storage.local.set({ AN_enabled: isOn });
  updateIcon();
  if (isOn && tab && tab.id && tab.url && tab.url.startsWith('http')) {
    injectIntoTab(tab.id);
  }
});

// Auto-inject when page finishes loading (if ON)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!isOn) return;
  if (!tab.url || !tab.url.startsWith('http')) return;
  injectIntoTab(tabId);
});

// Re-sync isOn from storage when service worker wakes up
chrome.storage.onChanged.addListener((changes) => {
  if (changes.AN_enabled) {
    isOn = changes.AN_enabled.newValue === true;
    updateIcon();
  }
});

// Inject content script into a tab
function injectIntoTab(tabId) {
  chrome.storage.local.get(['AN_theme', 'AN_lang'], (result) => {
    const theme = result.AN_theme || 'light';
    const lang  = result.AN_lang  || 'bn';

    // First check if already injected (idempotent guard)
    chrome.scripting.executeScript({
      target: { tabId },
      func: () => !!document.getElementById('AN_open')
    }, (res) => {
      if (chrome.runtime.lastError) return;
      if (res && res[0] && res[0].result === true) return; // already injected

      chrome.scripting.executeScript({
        target: { tabId },
        func: (t, l) => { window.__AN_INIT = { theme: t, lang: l }; },
        args: [theme, lang]
      }, () => {
        if (chrome.runtime.lastError) return;
        chrome.scripting.executeScript({
          target: { tabId },
          files: ['content.js']
        });
      });
    });
  });
}

// Update badge and title
function updateIcon() {
  if (isOn) {
    chrome.action.setBadgeText({ text: 'ON' });
    chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
    chrome.action.setTitle({ title: 'Self Annotate — ON  (click to turn OFF)' });
  } else {
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setTitle({ title: 'Self Annotate — OFF  (click to turn ON)' });
  }
}
