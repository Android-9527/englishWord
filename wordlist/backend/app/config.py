from pathlib import Path
import os


BASE_DIR = Path(__file__).resolve().parent.parent
DATABASE_PATH = BASE_DIR / 'wordlist.db'


class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv('WORDLIST_DATABASE_URI', f'sqlite:///{DATABASE_PATH.as_posix()}')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'connect_args': {'check_same_thread': False}
    }
