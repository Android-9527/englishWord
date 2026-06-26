import json
import os
import sys
import urllib.error
import urllib.request


MODEL_NAME = 'gemini-2.5-flash'


def _request_json(url: str, payload: dict | None = None) -> dict:
    data = None if payload is None else json.dumps(payload).encode('utf-8')
    request = urllib.request.Request(
        url,
        data=data,
        headers={'Content-Type': 'application/json'} if payload is not None else {},
        method='POST' if payload is not None else 'GET'
    )

    with urllib.request.urlopen(request, timeout=60) as response:
        return json.loads(response.read().decode('utf-8'))


def ask_gemini(prompt: str) -> str:
    api_key = os.environ.get('GOOGLE_API_KEY', '').strip()
    if not api_key:
        raise RuntimeError('Missing GOOGLE_API_KEY environment variable')

    url = (
        'https://generativelanguage.googleapis.com/v1beta/models/'
        f'{MODEL_NAME}:generateContent?key={api_key}'
    )

    payload = {
        'contents': [
            {
                'role': 'user',
                'parts': [{ 'text': prompt }]
            }
        ]
    }

    try:
        data = _request_json(url, payload)
    except urllib.error.HTTPError as exc:
        error_text = exc.read().decode('utf-8', errors='replace')
        if exc.code == 404:
            raise RuntimeError(
                f'Model {MODEL_NAME!r} is not available.\n'
                f'Original error: {error_text}'
            ) from exc
        raise

    candidates = data.get('candidates', [])
    if not candidates:
        raise RuntimeError(f'No candidates returned: {data}')

    content = candidates[0].get('content', {})
    parts = content.get('parts', [])
    texts = [part.get('text', '') for part in parts if isinstance(part, dict)]
    return ''.join(texts).strip()


def main() -> int:
    prompt = '告诉我每天的天气'

    try:
        reply = ask_gemini(prompt)
    except urllib.error.HTTPError as exc:
        print(f'HTTP error: {exc.code} {exc.reason}', file=sys.stderr)
        print(exc.read().decode('utf-8', errors='replace'), file=sys.stderr)
        return 1
    except Exception as exc:
        print(f'Error: {exc}', file=sys.stderr)
        return 1

    print('Prompt:', prompt)
    print('Reply:')
    print(reply)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
