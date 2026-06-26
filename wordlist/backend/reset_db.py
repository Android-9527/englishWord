from app import create_app
from app.extensions import db
from sqlalchemy import text


def main():
    app = create_app()

    with app.app_context():
        for table_name in [
            'user_relation',
            'users',
            'relation',
        ]:
            db.session.execute(text(f'DROP TABLE IF EXISTS {table_name}'))

        db.drop_all()
        db.create_all()

        print('Database reset complete.')
        print(f'users: {db.session.execute(text("SELECT COUNT(*) FROM users")).scalar_one()}')
        print(f'relation: {db.session.execute(text("SELECT COUNT(*) FROM relation")).scalar_one()}')
        print(f'user_relation: {db.session.execute(text("SELECT COUNT(*) FROM user_relation")).scalar_one()}')


if __name__ == '__main__':
    main()
