// content script: collect the current selection context and render backend results

function normalizeText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function isAbbreviationDot(text, index) {
  const prefix = text.slice(Math.max(0, index - 16), index + 1);
  return /(?:\b[A-Z]\.){2,}$/.test(prefix) || /\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|e\.g|i\.e)\.$/.test(prefix);
}

function isSentenceBoundary(text, index) {
  const ch = text[index];
  if (ch === ',' || ch === '，' || ch === '。' || ch === '！' || ch === '？' || ch === '!' || ch === '?' || ch === '"') {
    return true;
  }

  if (ch !== '.') {
    return false;
  }

  if (isAbbreviationDot(text, index)) {
    return false;
  }

  const prev = text[index - 1] || '';
  const next = text[index + 1] || '';
  if (/\d/.test(prev) && /\d/.test(next)) {
    return false;
  }

  return true;
}

function getDocumentText() {
  try {
    const range = document.createRange();
    range.selectNodeContents(document.body);
    return range.toString();
  } catch (e) {
    return document.body?.innerText || '';
  }
}

function getSelectionStartOffset(selection) {
  try {
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0).cloneRange();
    const prefix = document.createRange();
    prefix.setStart(document.body, 0);
    prefix.setEnd(range.startContainer, range.startOffset);
    return prefix.toString().length;
  } catch (e) {
    return null;
  }
}

function getSelectionOffsets(selection) {
  try {
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    const prefix = document.createRange();
    prefix.setStart(document.body, 0);
    prefix.setEnd(range.startContainer, range.startOffset);
    const startOffset = prefix.toString().length;

    const suffix = document.createRange();
    suffix.setStart(document.body, 0);
    suffix.setEnd(range.endContainer, range.endOffset);
    const endOffset = suffix.toString().length;

    return { startOffset, endOffset };
  } catch (e) {
    return null;
  }
}

function getSentenceRangeForSelection(text, startOffset, endOffset) {
  const source = String(text || '');
  if (!source) return '';

  const safeStart = Math.max(0, Math.min(Number(startOffset) || 0, source.length));
  const safeEnd = Math.max(safeStart, Math.min(Number(endOffset) || 0, source.length));

  let sentenceStart = 0;
  for (let i = 0; i < safeStart; i += 1) {
    if (isSentenceBoundary(source, i)) {
      sentenceStart = i + 1;
    }
  }

  let sentenceEnd = source.length;
  for (let i = safeEnd; i < source.length; i += 1) {
    if (isSentenceBoundary(source, i)) {
      sentenceEnd = i;
      break;
    }
  }

  return source.slice(sentenceStart, sentenceEnd).replace(/^\s+|\s+$/g, '').replace(/^[,，]+|[,，]+$/g, '').trim();
}

function getSentenceAtOffset(text, offset) {
  const source = String(text || '');
  if (!source) return '';

  const safeOffset = Math.max(0, Math.min(Number(offset) || 0, source.length));
  let start = 0;
  for (let i = 0; i < safeOffset; i += 1) {
    if (isSentenceBoundary(source, i)) {
      start = i + 1;
    }
  }

  let end = source.length;
  for (let i = safeOffset; i < source.length; i += 1) {
    if (isSentenceBoundary(source, i)) {
      end = i;
      break;
    }
  }

  return source.slice(start, end).replace(/^\s+|\s+$/g, '').replace(/^[,，]+|[,，]+$/g, '').trim();
}

function splitIntoSentences(text) {
  const source = String(text || '').trim();
  if (!source) return [];

  const sentences = [];
  let start = 0;

  for (let i = 0; i < source.length; i += 1) {
    if (!isSentenceBoundary(source, i)) {
      continue;
    }

    const sentence = source.slice(start, i).replace(/^\s+|\s+$/g, '').replace(/^[,，]+|[,，]+$/g, '').trim();
    if (sentence) {
      sentences.push(sentence);
    }
    start = i + 1;
  }

  const last = source.slice(start).trim();
  if (last) {
    sentences.push(last);
  }

  return sentences;
}

function getContainingSentence(text, selection) {
  try {
    const body = getDocumentText();
    const normalizedSelection = normalizeText(text);
    if (!body || !normalizedSelection) return text;

    const offsets = getSelectionOffsets(selection);
    if (offsets !== null) {
      const sentenceRange = getSentenceRangeForSelection(body, offsets.startOffset, offsets.endOffset);
      if (sentenceRange) {
        return sentenceRange;
      }
    }

    const sentences = splitIntoSentences(body);
    const matches = sentences.filter((sentence) => normalizeText(sentence).includes(normalizedSelection));
    if (matches.length > 0) {
      return matches[0];
    }

    return text;
  } catch (e) {
    return text;
  }
}

function safeSendMessage(message, callback) {
  try {
    if (!chrome?.runtime?.id) return;

    chrome.runtime.sendMessage(message, (resp) => {
      if (chrome.runtime.lastError) {
        return;
      }
      callback?.(resp);
    });
  } catch (e) {
    // Ignore invalidated extension contexts during reload/navigation.
  }
}

function getCurrentSelectionContext() {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) return null;

  const text = sel.toString().trim();
  if (!text || text.length > 200) return null;

  return {
    selectionText: text,
    sentence: getContainingSentence(text, sel),
    pageUrl: location.href
  };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'collect_selection_context') {
    const context = getCurrentSelectionContext();
    if (!context) {
      sendResponse({ success: false, error: 'No selection found' });
      return false;
    }

    sendResponse({ success: true, ...context });
    return false;
  }

  if (msg?.type === 'show_selection_result') {
    const { selectionText, wordMeaning, sentenceMeaning, backendPayload } = msg;
    showTooltip(selectionText || '', `${wordMeaning || '暂无意思'}\n句子意思：${sentenceMeaning || '暂无意思'}`);
    sendResponse({ success: true });
    return false;
  }

  return false;
});

function showTooltip(word, meaning) {
  const EXIST_ID = 'cw-translate-tooltip';
  const prev = document.getElementById(EXIST_ID);
  if (prev) prev.remove();

  const div = document.createElement('div');
  div.id = EXIST_ID;
  div.style.position = 'absolute';
  div.style.zIndex = 2147483647;
  div.style.background = 'rgba(0,0,0,0.85)';
  div.style.color = '#fff';
  div.style.padding = '8px 10px';
  div.style.borderRadius = '6px';
  div.style.maxWidth = '360px';
  div.style.fontSize = '13px';
  div.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
  div.style.whiteSpace = 'pre-wrap';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = '×';
  closeBtn.style.position = 'absolute';
  closeBtn.style.top = '4px';
  closeBtn.style.right = '6px';
  closeBtn.style.border = 'none';
  closeBtn.style.background = 'transparent';
  closeBtn.style.color = '#fff';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.fontSize = '14px';
  closeBtn.style.lineHeight = '1';
  closeBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    div.remove();
  });

  const content = document.createElement('div');
  content.style.paddingRight = '16px';
  content.textContent = `${word}: ${meaning}`;

  div.appendChild(closeBtn);
  div.appendChild(content);
  document.body.appendChild(div);

  try {
    const range = window.getSelection().getRangeAt(0);
    const rect = range.getBoundingClientRect();
    div.style.left = Math.max(8, rect.left + window.scrollX) + 'px';
    div.style.top = Math.max(8, rect.top + window.scrollY - div.offsetHeight - 8) + 'px';
  } catch (e) {
    div.style.left = '8px';
    div.style.top = '8px';
  }

}
