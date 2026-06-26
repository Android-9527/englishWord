# Wordlist

Wordlist is a small vocabulary workspace with a Vue frontend and a Flask backend.

## Stack

- Frontend: Vue 3.5 + Vue Router + Vite + TypeScript
- Backend: Flask + SQLite + SQLAlchemy

## Structure

- `frontend/` - web UI
- `backend/` - API server and SQLite models

## Database

The database uses three tables:

- `words` - `id`, `word`
- `sentences` - `id`, `sentence`
- `word_sentence_relations` - `word_id`, `sentence_id`

## Run locally

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

By default the frontend talks to `http://127.0.0.1:5000/api`.
