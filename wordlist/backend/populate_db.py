from app import create_app
from app.extensions import db
from app.models import Relation, User, UserRelation


def main():
    app = create_app()
    pairs = [
        ("abandon", "He refused to abandon his friend in need."),
        ("absorb", "Plants absorb water through their roots."),
        ("accommodate", "The hotel can accommodate up to 200 guests."),
        ("adapt", "Animals adapt to their environment over time."),
        ("adjust", "You can adjust the brightness on the screen."),
        ("affect", "The new law will affect many businesses."),
        ("allocate", "We must allocate resources efficiently."),
        ("analyze", "Researchers analyze the data for trends."),
        ("assist", "He will assist you with the installation."),
        ("assume", "Don't assume the answer without checking the facts.")
    ]

    with app.app_context():
        inserted_relations = 0
        inserted_user_relations = 0
        demo_user_id = 'demo'

        demo_user = User.query.get(demo_user_id)
        if not demo_user:
            demo_user = User(u_id=demo_user_id)
            db.session.add(demo_user)
            db.session.flush()

        for w, s in pairs:
            relation = Relation.query.filter_by(word=w, sentence=s).first()
            if not relation:
                relation = Relation(word=w, sentence=s)
                db.session.add(relation)
                db.session.flush()
                inserted_relations += 1

            exists = UserRelation.query.get((demo_user_id, relation.r_id))
            if not exists:
                user_relation = UserRelation(u_id=demo_user_id, r_id=relation.r_id)
                db.session.add(user_relation)
                inserted_user_relations += 1

        db.session.commit()

        total_relations = Relation.query.count()
        total_user_relations = UserRelation.query.count()

        print(f"Inserted relations: {inserted_relations}")
        print(f"Inserted user_relations: {inserted_user_relations}")
        print(f"Users: {User.query.count()}")
        print(f"Totals - relations: {total_relations}, user_relations: {total_user_relations}")

        # Print first 10 relations for verification
        print("Sample relations:")
        query = db.session.query(Relation).order_by(Relation.r_id.asc()).limit(10)
        for relation in query.all():
            print(f"{relation.word} -> {relation.sentence}")


if __name__ == '__main__':
    main()
