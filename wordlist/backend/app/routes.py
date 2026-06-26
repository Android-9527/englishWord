from flask import Blueprint, jsonify, request
import os
import threading

from flask import current_app

from .extensions import db
from .llm_client import count_words, translate_selection, DEFAULT_MODEL
from .models import Relation, User, UserRelation

api_bp = Blueprint('api', __name__)


def _json_data():
    return request.get_json(silent=True) or {}


def _get_user_id(data=None):
    payload = data or {}
    user_id = str(payload.get('u_id', request.args.get('u_id', 'default'))).strip()
    return user_id or 'default'


def _upsert_relation(app, user_id, word_text, sentence_text, word_meaning, sentence_meaning):
    with app.app_context():
        try:
            user = User.query.get(user_id)
            if user is None:
                user = User(u_id=user_id)
                db.session.add(user)

            relation = Relation.query.filter_by(word=word_text, sentence=sentence_text).first()
            if relation is None:
                relation = Relation(
                    word=word_text,
                    sentence=sentence_text,
                    w_trans=word_meaning,
                    s_trans=sentence_meaning,
                )
                db.session.add(relation)
                db.session.flush()
            else:
                relation.w_trans = word_meaning
                relation.s_trans = sentence_meaning

            user_relation = UserRelation.query.get((user_id, relation.r_id))
            if user_relation is None:
                user_relation = UserRelation(u_id=user_id, r_id=relation.r_id)
                db.session.add(user_relation)

            db.session.commit()
        except Exception as exc:
            db.session.rollback()
            print(f'Async relation persistence failed: {exc}')
        finally:
            db.session.remove()


@api_bp.get('/dashboard')
def dashboard():
    user_id = _get_user_id()
    return jsonify({
        'users': User.query.count(),
        'relations': Relation.query.count(),
        'user_relations': UserRelation.query.count(),
        'my_relations': UserRelation.query.filter_by(u_id=user_id).count(),
        'user_id': user_id,
    })


@api_bp.get('/users')
def list_users():
    items = [item.to_dict() for item in User.query.order_by(User.u_id.asc()).all()]
    return jsonify({'items': items})


@api_bp.post('/users')
def create_user():
    data = _json_data()
    user_id = _get_user_id(data)

    if not user_id:
        return jsonify({'error': 'u_id is required'}), 400

    existing = User.query.get(user_id)
    if existing:
        return jsonify({'item': existing.to_dict(), 'created': False, 'duplicate': True})

    user = User(u_id=user_id)
    db.session.add(user)
    db.session.commit()
    return jsonify({'item': user.to_dict(), 'created': True, 'duplicate': False}), 201


@api_bp.get('/model')
def get_model():
    api_key = os.environ.get('GOOGLE_API_KEY', '').strip()
    if not api_key:
        return jsonify({'error': 'GOOGLE_API_KEY is not set'}), 400
    try:
        return jsonify({'model': DEFAULT_MODEL})
    except Exception as exc:
        return jsonify({'error': str(exc)}), 502


@api_bp.get('/relations')
def list_relations():
    user_id = _get_user_id()
    query = (
        db.session.query(Relation)
        .join(UserRelation, UserRelation.r_id == Relation.r_id)
        .filter(UserRelation.u_id == user_id)
        .order_by(Relation.r_id.desc())
    )

    items = [relation.to_dict() for relation in query.all()]
    return jsonify({'items': items, 'u_id': user_id})


@api_bp.post('/selection')
def process_selection():
    data = _json_data()
    selection_text = str(data.get('selectionText', '')).strip()
    sentence_text = str(data.get('sentence', '')).strip()
    source_url = str(data.get('source_url', '')).strip()
    user_id = _get_user_id(data)

    if not selection_text or not sentence_text:
        return jsonify({'error': 'selectionText and sentence are required'}), 400

    word_count = count_words(selection_text)
    if word_count > 3:
        return jsonify({
            'error': 'selectionText must be less than or equal to 3 words',
            'word_count': word_count
        }), 400

    try:
        meaning = translate_selection(selection_text, sentence_text)
        selection_meaning = meaning['selection_meaning']
        sentence_meaning = meaning['sentence_meaning']

        app = current_app._get_current_object()
        worker = threading.Thread(
            target=_upsert_relation,
            args=(app, user_id, selection_text, sentence_text, selection_meaning, sentence_meaning),
            daemon=True
        )
        worker.start()

        return jsonify({
            'selection_meaning': selection_meaning,
            'sentence_meaning': sentence_meaning
        })
    except Exception as exc:
        return jsonify({
            'error': str(exc),
            'selectionText': selection_text,
            'sentence': sentence_text,
            'source_url': source_url,
            'word_count': word_count
        }), 502
