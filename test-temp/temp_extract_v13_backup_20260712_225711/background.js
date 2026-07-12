/* ══════════════════════════════════════════════════════════
   Self Annotate — Background Service Worker v1.1 (MV3)
   - Popup-based ON/OFF toggle (popup.html)
   - Supports http://, https://, AND file:// pages
   - Badge shows ON (green) / OFF (no badge)
══════════════════════════════════════════════════════════ */

let isOn = false;

// On startup: restore state
chrome.storage.local.get(['AN_enabled', 'AN_theme', 'AN_lang'], (r) => {
  isOn = r.AN_enabled === true;
  updateIcon();
  const defaults = {};
  if (r.AN_theme === undefined) defaults.AN_theme = 'device';
  if (r.AN_lang  === undefined) defaults.AN_lang  = 'en';
  if (Object.keys(defaults).length > 0) chrome.storage.local.set(defaults);
});

// Listen for messages from popup.html
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_STATE') {
    sendResponse({ isOn });
    return;
  }
  if (msg.type === 'TOGGLE') {
    isOn = !isOn;
    chrome.storage.local.set({ AN_enabled: isOn });
    updateIcon();
    if (isOn) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && isInjectableUrl(tabs[0].url)) {
          injectIntoTab(tabs[0].id);
        }
      });
    }
    sendResponse({ isOn });
    return;
  }
  if (msg.type === 'INJECT_NOW') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && isInjectableUrl(tabs[0].url)) {
        injectIntoTab(tabs[0].id);
        sendResponse({ ok: true });
      } else {
        sendResponse({ ok: false });
      }
    });
    return true;
  }
  if (msg.type === 'SAVE_SETTINGS') {
    chrome.storage.local.set({ AN_theme: msg.theme, AN_lang: msg.lang }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }
  if (msg.type === 'OPEN_WB_TAB') {
    chrome.tabs.create({ url: chrome.runtime.getURL('whiteboard.html') });
    sendResponse({ ok: true });
    return;
  }
});

// Auto-inject when page finishes loading (if ON)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!isOn) return;
  if (!isInjectableUrl(tab.url)) return;
  injectIntoTab(tabId);
});

// Re-sync isOn from storage when service worker wakes up
chrome.storage.onChanged.addListener((changes) => {
  if (changes.AN_enabled) {
    isOn = changes.AN_enabled.newValue === true;
    updateIcon();
  }
});

function isInjectableUrl(url) {
  if (!url) return false;
  return url.startsWith('http://') ||
         url.startsWith('https://') ||
         url.startsWith('file://');
}

function injectIntoTab(tabId) {
  chrome.storage.local.get(['AN_theme', 'AN_lang'], (result) => {
    const theme = result.AN_theme || 'device';
    const lang  = result.AN_lang  || 'en';

    chrome.scripting.executeScript({
      target: { tabId },
      func: () => !!document.getElementById('AN_bar')
    }, (res) => {
      if (chrome.runtime.lastError) return;
      if (res && res[0] && res[0].result === true) return;

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

function updateIcon() {
  if (isOn) {
    chrome.action.setBadgeText({ text: 'ON' });
    chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
    chrome.action.setTitle({ title: 'Self Annotate — ON' });
  } else {
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setTitle({ title: 'Self Annotate — OFF' });
  }
}
