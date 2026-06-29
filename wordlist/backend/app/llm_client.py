import json
import os
import re
from functools import lru_cache

import requests


DEFAULT_MODEL = 'gemini-2.5-flash'
_HTTP_SESSION = requests.Session()


def _request_json(url: str, payload: dict | None = None) -> dict:
    response = _HTTP_SESSION.post(url, json=payload, timeout=(5, 30)) if payload is not None else _HTTP_SESSION.get(url, timeout=(5, 30))
    response.raise_for_status()
    return response.json()


def _extract_json_object(text: str) -> dict:
    cleaned = text.strip()
    if cleaned.startswith('```'):
        cleaned = cleaned.strip('`')
        cleaned = cleaned.replace('json\n', '', 1)
        cleaned = cleaned.replace('JSON\n', '', 1)

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r'\{.*\}', cleaned, re.S)
        if match:
            return json.loads(match.group(0))
        raise


def _extract_text_from_response(data: dict) -> str:
    candidates = data.get('candidates', [])
    if not candidates:
        raise RuntimeError(f'No candidates returned: {data}')

    content = candidates[0].get('content', {})
    parts = content.get('parts', [])
    texts = [part.get('text', '') for part in parts if isinstance(part, dict)]
    return ''.join(texts).strip()


@lru_cache(maxsize=256)
def _translate_selection_cached(api_key: str, selection_text: str, sentence_text: str) -> dict:
    model = DEFAULT_MODEL
    url = (
        'https://generativelanguage.googleapis.com/v1beta/models/'
        f'{model}:generateContent?key={api_key}'
    )

    prompt = (
        '只返回JSON：{"selection_meaning":"...","sentence_meaning":"..."}。'
        '根据选中内容和句子的中文翻译含义。'
        f'选中: {selection_text}\n'
        f'句子: {sentence_text}'
    )

    payload = {
        'contents': [
            {
                'role': 'user',
                'parts': [{'text': prompt}]
            }
        ],
        'generationConfig': {
            'responseMimeType': 'application/json'
        }
    }

    try:
        data = _request_json(url, payload)
    except requests.exceptions.HTTPError as exc:
        response = exc.response
        error_text = response.text if response is not None else str(exc)
        if response is not None and response.status_code == 404:
            raise RuntimeError(
                f"Model '{model}' is not available or you don't have access. Original error: {error_text}"
            ) from exc
        raise RuntimeError(f'Gemini request failed: {error_text}') from exc
    except requests.exceptions.RequestException as exc:
        raise RuntimeError(f'Gemini request failed: {exc}') from exc

    raw_text = _extract_text_from_response(data)
    parsed = _extract_json_object(raw_text)

    selection_meaning = str(parsed.get('selection_meaning', '')).strip()
    sentence_meaning = str(parsed.get('sentence_meaning', '')).strip()
    return {
        'model': model,
        'selection_meaning': selection_meaning,
        'sentence_meaning': sentence_meaning,
        'raw_text': raw_text,
    }


def translate_selection(selection_text: str, sentence_text: str) -> dict:
    api_key = os.environ.get('GOOGLE_API_KEY', '').strip()
    if not api_key:
        raise RuntimeError('Missing GOOGLE_API_KEY environment variable')

    return _translate_selection_cached(api_key, selection_text.strip(), sentence_text.strip())


def count_words(text: str) -> int:
    tokens = re.findall(r"[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*", text or '')
    if tokens:
        return len(tokens)
    fallback = [part for part in re.split(r'\s+', (text or '').strip()) if part]
    return len(fallback)
