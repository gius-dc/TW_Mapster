#!/bin/bash

# Activate the Mapster virtual environment
source mapster_env/bin/activate

# Set the Flask application to run
export FLASK_APP=mapster_app.py

# Enable Flask debug mode for development
export FLASK_ENV=debug

# Start the Flask app, accessible from any host on port 5000
flask run -h 0.0.0.0 -p 5000