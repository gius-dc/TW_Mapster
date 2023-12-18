# User model definition for Flask application.

from flask_login import UserMixin

class User(UserMixin):
    def __init__(self, username, name=None):
        self.id = username
        self.name = name
