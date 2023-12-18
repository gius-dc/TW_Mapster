# Main script for the Flask web application.

from flask import Flask
from flask_pymongo import PyMongo
from flask_login import LoginManager
from user_model import User
from flask import send_from_directory
import os
import config # config.py

app = Flask(__name__)
app.config.from_object(config) # config.py

mongo = PyMongo(app)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# Route for loading user data from the database using Flask-Login; returns a User object if found.
@login_manager.user_loader
def load_user(username):
    user_data = mongo.db.users.find_one({'username': username})
    if user_data:
        return User(username=username, name=user_data.get('name'))
    return None

# Modifies response headers to prevent caching if CACHE_ENABLED is not set in app configuration (see config.py).
@app.after_request
def after_request(response):
    if not app.config['CACHE_ENABLED']:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

# Route for Service Worker (sw.js) placed at root to ensure maximum scope across the entire site.
@app.route('/sw.js')
def sw():
    return send_from_directory(os.path.join(app.root_path), 'sw.js')

# Importing and initializing route modules containing routes for the web application.
from routes import auth_routes
from routes import itinerary_routes
from routes import api_routes
from routes import main_routes

auth_routes.init_app(app, mongo)
itinerary_routes.init_app(app, mongo)
api_routes.init_app(app, mongo)
main_routes.init_app(app, mongo)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)