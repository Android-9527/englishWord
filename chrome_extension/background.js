// background service worker: receives selection from content script and stores it in the vocab backend
const DEFAULTS = {
  USER_ID: 'default'
};
const MENU_ID = 'analyse-selection';
const BACKEND_BASE_URLS = [
  'http://136.117.65.65/englishword/api',
  'http://127.0.0.1:5000/api',
  'http://localhost:5000/api'
];

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULTS, (items) => resolve(items));
  });
}

function normalizeBaseUrl(url) {
  const value = String(url || '').trim();
  if (!value) {
    return BACKEND_BASE_URLS[0];
  }
  return value.replace(/\/+$/, '');
}

function buildSelectionUrl(baseUrl) {
  const normalized = normalizeBaseUrl(baseUrl);
  return normalized.endsWith('/selection') ? normalized : `${normalized}/selection`;
}

async function postSelection(baseUrl, body) {
  const response = await fetch(buildSelectionUrl(baseUrl), {
    method: 'POST',
    mode: 'cors',
    cache: 'no-store',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const backendPayload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(backendPayload.error || `Request failed: ${response.status}`);
    error.backendPayload = backendPayload;
    error.status = response.status;
    throw error;
  }

  return backendPayload;
}

function sendMessageToTab(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        const errorMessage = chrome.runtime.lastError.message || '';
        if (errorMessage.includes('Receiving end does not exist')) {
          reject(new Error('当前页面不支持划词分析，请切换到普通网页再试'));
          return;
        }
        reject(new Error(errorMessage));
        return;
      }
      resolve(response);
    });
  });
}

function ensureContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: 'analyse',
      contexts: ['selection']
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  ensureContextMenu();
});

chrome.runtime.onStartup.addListener(() => {
  ensureContextMenu();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID || !tab?.id) {
    return;
  }

  if (!tab.url || !/^https?:\/\//i.test(tab.url)) {
    console.warn('Selection analysis is only supported on normal web pages.');
    return;
  }

  (async () => {
    try {
      const selectionResponse = await sendMessageToTab(tab.id, { type: 'collect_selection_context' });
      if (!selectionResponse || !selectionResponse.success) {
        throw new Error(selectionResponse?.error || 'No selection found');
      }

      const settings = await getSettings();
      const userId = String(settings.USER_ID || DEFAULTS.USER_ID).trim() || 'default';
      const candidateBases = BACKEND_BASE_URLS.map(normalizeBaseUrl);

      const payload = {
        selectionText: selectionResponse.selectionText,
        sentence: selectionResponse.sentence,
        source_url: selectionResponse.pageUrl,
        u_id: userId
      };

      let backendPayload = null;
      let lastError = null;

      for (const baseUrl of candidateBases) {
        try {
          backendPayload = await postSelection(baseUrl, payload);
          backendPayload = {
            ...backendPayload,
            backendUrl: baseUrl
          };
          break;
        } catch (err) {
          lastError = err;
          console.warn('Selection post failed for backend url:', baseUrl, err);
        }
      }

      if (!backendPayload) {
        throw lastError || new Error('Failed to fetch backend');
      }

      await sendMessageToTab(tab.id, {
        type: 'show_selection_result',
        selectionText: selectionResponse.selectionText,
        wordMeaning: backendPayload?.selection_meaning || '',
        sentenceMeaning: backendPayload?.sentence_meaning || ''
      });
    } catch (err) {
      console.error(err);
    }
  })();
});

