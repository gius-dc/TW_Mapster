# This script defines routes for user authentication including signup, login, logout, and Google OAuth in the Flask web application.
# It handles user registration, authentication, session management, and integrates with Google for OAuth logins.

from flask import request, redirect, url_for, flash, render_template, jsonify, session
from flask_login import login_user, logout_user, login_required, current_user
from flask_oauthlib.client import OAuth
from user_model import User
import bcrypt


def init_app(app, mongo):
    # Initializes OAuth for the app with Google as the remote service. Configures OAuth parameters including the consumer key and secret,
    # request token parameters, and various URLs required for the OAuth flow with Google.
    oauth = OAuth(app)
    google = oauth.remote_app(
        'google',
        consumer_key=app.config['GOOGLE_CONSUMER_KEY'], # see config.py
        consumer_secret=app.config['GOOGLE_CONSUMER_SECRET'], # see config.py
        request_token_params={'scope': 'email profile', 'prompt': 'consent'}, 
        base_url='https://www.googleapis.com/oauth2/v1/',
        request_token_url=None,
        access_token_method='POST',
        access_token_url='https://accounts.google.com/o/oauth2/token',
        authorize_url='https://accounts.google.com/o/oauth2/auth',
    )
    
    # Route for user registration. Handles new user sign up process and stores user data in the database.
    @app.route('/signup', methods=['GET', 'POST'])
    def signup():
        if current_user.is_authenticated:
            return redirect(url_for('index'))

        if request.method == 'POST':
            username = request.form['username']
            password = request.form['password']
            name = request.form['name']

            existing_user = mongo.db.users.find_one({'username': username})
            if existing_user is None:
                hashed_pass = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
                mongo.db.users.insert_one({'username': username, 'name': name, 'password': hashed_pass})
                flash('Registration successful! You can now log in with your new account.', 'success')
                return redirect(url_for('login'))
            else:
                flash('Username already exists.', 'info')
        return render_template('signup.html')

    # Route for user login. Authenticates users and manages user sessions.
    @app.route('/login', methods=['GET', 'POST'])
    def login():
        if current_user.is_authenticated:
            return redirect(url_for('index'))

        if request.method == 'POST':
            username = request.form['username']
            password = request.form['password']
            user = mongo.db.users.find_one({'username': username})
            if user and bcrypt.checkpw(password.encode('utf-8'), user['password']):
                login_user(User(username))
                return redirect(url_for('index'))
            else:
                flash('Incorrect username or password.', 'danger')
        return render_template('login.html')

    # Route for logging out. Ends the user's session and redirects to the main page.
    @app.route('/logout')
    @login_required
    def logout():
        logout_user()
        return redirect(url_for('index'))

    # Route to initiate Google OAuth login process.
    @app.route('/login/google')
    def google_login():
        return google.authorize(callback=url_for('authorized', _external=True))

    # Callback route for Google OAuth. Handles the response from Google and manages user authentication.
    @app.route('/login/google/authorized')
    def authorized():
        resp = google.authorized_response()
        if resp is None or resp.get('access_token') is None:
            return 'Access denied: reason={0} error={1}'.format(
                request.args['error_reason'],
                request.args['error_description']
            )
        session['google_token'] = (resp['access_token'], '')
        me = google.get('userinfo')
        user_id = me.data['id']
        user_name = me.data.get('name', '')
        existing_user = mongo.db.users.find_one({'username': user_id})
        if not existing_user:
            random_password = bcrypt.gensalt().decode('utf-8')
            hashed_pass = bcrypt.hashpw(random_password.encode('utf-8'), bcrypt.gensalt())
            mongo.db.users.insert_one({'username': user_id, 'name': user_name, 'password': hashed_pass})
        login_user(User(user_id))
        return redirect(url_for('index'))
    
    # Route to check the user's login status. Returns JSON response indicating if the user is authenticated.
    @app.route('/check-login-status')
    def check_login_status():
        is_logged_in = current_user.is_authenticated
        return jsonify({"isLoggedIn": is_logged_in})

    # Function to retrieve the Google OAuth token from the session.
    @google.tokengetter
    def get_google_oauth_token():
        return session.get('google_token')

