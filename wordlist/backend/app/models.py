from .extensions import db


class User(db.Model):
    __tablename__ = 'users'

    u_id = db.Column(db.String(64), primary_key=True)

    def to_dict(self):
        return {'u_id': self.u_id}


class Relation(db.Model):
    __tablename__ = 'relation'
    __table_args__ = (
        db.UniqueConstraint('word', 'sentence', name='uq_relation_word_sentence'),
    )

    r_id = db.Column(db.Integer, primary_key=True)
    word = db.Column(db.Text, nullable=False, index=True)
    sentence = db.Column(db.Text, nullable=False)
    w_trans = db.Column(db.Text, nullable=True)
    s_trans = db.Column(db.Text, nullable=True)

    def to_dict(self):
        return {
            'r_id': self.r_id,
            'word': self.word,
            'sentence': self.sentence,
            'w_trans': self.w_trans,
            's_trans': self.s_trans,
        }


class UserRelation(db.Model):
    __tablename__ = 'user_relation'

    u_id = db.Column(db.String(64), db.ForeignKey('users.u_id', ondelete='CASCADE'), primary_key=True)
    r_id = db.Column(db.Integer, db.ForeignKey('relation.r_id', ondelete='CASCADE'), primary_key=True)
    relation = db.relationship('Relation', backref=db.backref('user_relations', cascade='all, delete-orphan'))
    user = db.relationship('User', backref=db.backref('user_relations', cascade='all, delete-orphan'))

    def to_dict(self):
        return {
            'u_id': self.u_id,
            'r_id': self.r_id,
            'relation': self.relation.to_dict() if self.relation else None,
        }
