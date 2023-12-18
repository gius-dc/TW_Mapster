# This script defines routes for the main page, search functionality, and search results in the Flask web application.
# It handles the retrieval and processing of itinerary data from the MongoDB database and renders the corresponding templates.

from flask import render_template, request, jsonify
import json
from base64 import b64encode
from datetime import datetime
import pytz
import humanize


def init_app(app, mongo):
    # Route for the main page. Retrieves itineraries from the database and processes them for display.
    @app.route('/')
    def index():
        is_search = False
        search_query = ''

        try:
            
            itineraries = list(mongo.db.itineraries.find({'deleted': 0}).sort('upload_datetime', -1))
            for itinerary in itineraries:
                itinerary['views'] = itinerary.pop('num_views')
                itinerary['likes'] = len(itinerary.get('likes', []))
                if 'image' in itinerary and itinerary['image']:
                    itinerary['image_b64'] = b64encode(itinerary['image']).decode('utf-8')
            
                
                if isinstance(itinerary['upload_datetime'], str):
                    itinerary['upload_datetime'] = datetime.strptime(itinerary['upload_datetime'], '%Y-%m-%d %H:%M:%S').replace(tzinfo=pytz.utc)
            
                
                itinerary['time_since_upload'] = humanize.naturaltime(datetime.utcnow().replace(tzinfo=pytz.utc) - itinerary['upload_datetime'])
        except Exception as e:
            return f"Database connection error: {e}", 500

        return render_template('index.html', itineraries=itineraries, is_search=is_search, search_query=search_query)
    
    # Route for handling search queries. Processes user input, filters, and retrieves matching itineraries from the database.
    @app.route('/search', methods=['GET'])
    def search():
        is_search = True
        search_query = request.args.get('q', '')
        filters = request.args.get('filters', '')

        try:
            filters = json.loads(filters)

            itineraries_query = {
                '$and': [
                    {'$or': [
                        {'name': {'$regex': search_query, '$options': 'i'}},
                        {'description': {'$regex': search_query, '$options': 'i'}}
                    ]},
                    {'deleted': 0}  
                ]
            }

            if filters.get('mostViewed'):
                itineraries = list(mongo.db.itineraries.find(itineraries_query).sort('views', -1))
            elif filters.get('mostLiked'):
                itineraries = list(mongo.db.itineraries.find(itineraries_query).sort('likes', -1))
            else:
                itineraries = list(mongo.db.itineraries.find(itineraries_query).sort('upload_datetime', -1))

            for itinerary in itineraries:
                itinerary['views'] = itinerary.pop('num_views')
                itinerary['likes'] = len(itinerary.get('likes', []))
                if 'image' in itinerary and itinerary['image']:
                    itinerary['image_b64'] = b64encode(itinerary['image']).decode('utf-8')
            
                
                if isinstance(itinerary['upload_datetime'], str):
                    itinerary['upload_datetime'] = datetime.strptime(itinerary['upload_datetime'], '%Y-%m-%d %H:%M:%S')
        except Exception as e:
            return jsonify({"error": f"Database connection error: {e}"}), 500

        return render_template('index.html', itineraries=itineraries, search_query=search_query, is_search=is_search, filters=filters)
    
    # Route for displaying search results. Renders the search results page template.
    @app.route('/search_results')
    def search_results():
        return render_template('search_results.html')