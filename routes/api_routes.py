# Script for API route handling in Flask application.

from flask import request, jsonify
from flask_login import login_required, current_user
from datetime import datetime
from bson import ObjectId
from base64 import b64encode
import pytz

def init_app(app, mongo):
    # API route for synchronizing itineraries. This route is used by the client, specifically the service worker, to synchronize personal itineraries stored locally. 
    # It retrieves and sends back itineraries that have been updated since the last sync time provided by the client, ensuring the local data is up-to-date.
    @app.route('/api/sync-itineraries', methods=['GET'])
    @login_required
    def sync_itineraries():
        try:
            last_sync_time_str = request.args.get('lastSyncTime')
            if last_sync_time_str:
                last_sync_time = datetime.fromisoformat(last_sync_time_str)
                if last_sync_time.tzinfo is None:
                    last_sync_time = last_sync_time.replace(tzinfo=pytz.utc)
                last_sync_time = last_sync_time.astimezone(pytz.utc)
            else:
                last_sync_time = datetime.min.replace(tzinfo=pytz.utc)

            app.logger.info(f"Client '{current_user.id}' requesting itinerary sync since: {last_sync_time_str}")

            all_itineraries = mongo.db.itineraries.find({'user_id': current_user.id})

            itineraries_list = []
            for itinerary in all_itineraries:
                itinerary_last_modified_str = itinerary['last_modified']
                itinerary_last_modified = datetime.fromisoformat(itinerary_last_modified_str).replace(tzinfo=pytz.utc)

                if itinerary_last_modified > last_sync_time:
                    itinerary['_id'] = str(itinerary['_id'])
                    if itinerary.get('image'):
                        itinerary['image'] = b64encode(itinerary['image']).decode('utf-8')
                    itineraries_list.append(itinerary)

            app.logger.info(f"Number of itineraries to sync for client '{current_user.id}': {len(itineraries_list)}")
            return jsonify(itineraries_list)
        except Exception as e:
            app.logger.error(f"Error during itinerary synchronization for client '{current_user.id}': {e}")
            return jsonify({"error": str(e)}), 500
        
    # API route for toggling likes on itineraries. This route is used by the client to like or unlike a specific itinerary.
    @app.route('/api/toggle-like/<string:itinerary_id>', methods=['POST'])
    @login_required
    def toggle_like(itinerary_id):
        user_id = current_user.id

        try:
            itinerary = mongo.db.itineraries.find_one({'_id': ObjectId(itinerary_id)})

            if user_id in itinerary.get('likes', []):
                mongo.db.itineraries.update_one({'_id': ObjectId(itinerary_id)}, {'$pull': {'likes': user_id}})
                liked = False
            else:
                mongo.db.itineraries.update_one({'_id': ObjectId(itinerary_id)}, {'$addToSet': {'likes': user_id}})
                liked = True

            likes_count = len(itinerary.get('likes', []))
            return jsonify({'success': True, 'liked': liked, 'likesCount': likes_count})
        
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)})
