# This script defines routes for managing itineraries in the Flask web application, including viewing, creating, editing, and deleting itineraries.
# It includes user-specific logic, data handling, and rendering of corresponding templates.

from flask import request, render_template, redirect, url_for, flash, jsonify
from flask_login import login_required, current_user
from bson import ObjectId, json_util
import json
from base64 import b64encode
import time
from datetime import datetime
from bson.binary import Binary
import traceback


request_block = {}
request_results = {}

def init_app(app, mongo):
    # Route for displaying itineraries created by the current logged-in user. Retrieves user-specific itineraries from the database.
    @app.route('/myitineraries')
    @login_required
    def myitineraries():
        user_id = current_user.id
        try:
            itineraries = list(mongo.db.itineraries.find({'user_id': user_id, 'deleted': {'$ne': 1}}, {
                'name': 1, 
                'description': 1, 
                'detailed_description': 1,
                'num_views': 1, 
                'likes': 1,
                'upload_datetime': 1,
                'image': 1,
                'image_format': 1
            }))
            for itinerary in itineraries:
                itinerary['views'] = itinerary.pop('num_views')
                itinerary['likes'] = len(itinerary.get('likes', []))
                itinerary['date_created'] = itinerary['upload_datetime'].split(" ")[0]
                if 'image' in itinerary and itinerary['image']:
                    itinerary['image_b64'] = b64encode(itinerary['image']).decode('utf-8')
        except Exception as e:
            flash(f"Errore di connessione al database: {e}", "danger")
            return redirect(url_for('index'))

        return render_template('myitineraries.html', itineraries=itineraries)
    
    # Route to display the form for creating a new itinerary. Provides an empty template for itinerary creation.
    @app.route('/create-itinerary')
    @login_required
    def create_itinerary():
        empty_itinerary = {
            '_id': {'$oid': ''},
            'name': '',
            'description': '',
            'waypoints': []
        }

        return render_template('create_itinerary.html', edit_mode=False, itinerary=empty_itinerary)

    @app.route('/save-itinerary', methods=['POST'])
    @login_required
    def save_itinerary():
        itinerary_name = request.form.get('itinerary_name')
        itinerary_description = request.form.get('itinerary_description')  
        user_id = current_user.id

        waypoints = []
        waypoint_count = int(request.form.get('waypoint_count', 0))

        for i in range(waypoint_count):
            waypoint = {
                'name': request.form.get(f'waypoints[{i}][name]'),
                'latitude': request.form.get(f'waypoints[{i}][latitude]'),
                'longitude': request.form.get(f'waypoints[{i}][longitude]')
            }
            waypoints.append(waypoint)

        utc_datetime = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

        itinerary = {
            'user_id': user_id,
            'name': itinerary_name,
            'description': itinerary_description,
            'waypoints': waypoints,
            'upload_datetime': utc_datetime,  
            'last_modified': utc_datetime,    
            'num_views': 0,
            'likes': [],
            'deleted' : 0
        }

        """ Handles processing and storage of the itinerary's map image, supporting both JPG and the more efficient WEBP format to minimize storage impact. 
            The image is heavily compressed client-side before being sent via POST. """

        map_image = request.files.get('map_image')
        if map_image:
        
            image_format = 'jpg'
            if map_image.content_type == 'image/webp':
                image_format = 'webp'

        
            image_binary = Binary(map_image.read())

        
            itinerary['image'] = image_binary
            itinerary['image_format'] = image_format

    
        existing_itinerary = mongo.db.itineraries.find_one({
            'user_id': user_id,
            'name': itinerary_name
        })

        if existing_itinerary:
            error_message = f"An itinerary named '{itinerary_name}' already exists in your profile."
            return jsonify({"error": error_message}), 400

    
        mongo.db.itineraries.insert_one(itinerary)
        return jsonify({"message": "Itinerary saved successfully!"})


    # Route for editing an existing itinerary. Retrieves the itinerary data for the given ID and displays it for editing.
    @app.route('/edit-itinerary/<itinerary_id>')
    @login_required
    def edit_itinerary(itinerary_id):
        try:
            itinerary = mongo.db.itineraries.find_one({'_id': ObjectId(itinerary_id), 'user_id': current_user.id})
            if not itinerary:
                flash("Itinerary not found or you do not have permission to edit this itinerary.", "danger")
                return redirect(url_for('index'))

            itinerary_json = json.loads(json_util.dumps(itinerary))
        except Exception as e:
            flash(f"Error retrieving itinerary for editing: {e}", "danger")
            return redirect(url_for('index'))

        return render_template('create_itinerary.html', edit_mode=True, itinerary=itinerary_json)
    
    # Route for updating an existing itinerary. Processes the POST request and updates the itinerary data in the database.
    @app.route('/update-itinerary/<itinerary_id>', methods=['POST'])
    @login_required
    def update_itinerary(itinerary_id):
        try:
            itinerary_name = request.form.get('itinerary_name')
            itinerary_description = request.form.get('itinerary_description')
            user_id = current_user.id

            
            existing_itinerary = mongo.db.itineraries.find_one({
                '_id': {'$ne': ObjectId(itinerary_id)},
                'user_id': user_id,
                'name': itinerary_name
            })

            if existing_itinerary:
                error_message = f"An itinerary named '{itinerary_name}' already exists in your profile."
                return jsonify({"error": error_message}), 400

            waypoints = []
            waypoint_count = int(request.form.get('waypoint_count', 0))
            for i in range(waypoint_count):
                waypoint = {
                    'name': request.form.get(f'waypoints[{i}][name]'),
                    'latitude': request.form.get(f'waypoints[{i}][latitude]'),
                    'longitude': request.form.get(f'waypoints[{i}][longitude]')
                }
                waypoints.append(waypoint)

            update_fields = {
                'name': itinerary_name,
                'description': itinerary_description,
                'waypoints': waypoints,
                'last_modified': datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
            }

            
            map_image = request.files.get('map_image')
            if map_image:
                image_format = 'jpg' if map_image.content_type != 'image/webp' else 'webp'
                image_binary = Binary(map_image.read())
                update_fields['image'] = image_binary
                update_fields['image_format'] = image_format

            
            mongo.db.itineraries.update_one(
                {'_id': ObjectId(itinerary_id), 'user_id': user_id},
                {'$set': update_fields}
            )

            return jsonify({"message": "Itinerary updated successfully!"}), 200
        except Exception as e:
            return jsonify({"error": f"Error updating itinerary: {e}"}), 500

    # Route for deleting an itinerary. Marks the itinerary as deleted in the database based on the provided ID.
    @app.route('/delete-itinerary', methods=['POST'])
    @login_required
    def delete_itinerary():
        try:
            data = request.get_json()
            app.logger.info(f"Received data: {data}")

            itinerary_id = data.get('itinerary_id')
            if itinerary_id:
                app.logger.info(f"Attempting to mark itinerary with ID: {itinerary_id} as deleted")

                user_id = current_user.id
                existing_itinerary = mongo.db.itineraries.find_one({'_id': ObjectId(itinerary_id), 'user_id': user_id})

                if existing_itinerary:
                    """ The itinerary document is not deleted but instead updated with blank fields using 'update_one()' to maintain a record of its deletion. 
                        This approach updates the 'last_modified' timestamp, allowing the service worker to detect the deletion and synchronize local data accordingly. 
                        While minimal data is retained, most fields, including the 'image' field which is data-heavy, are cleared to minimize storage impact. """

                    mongo.db.itineraries.update_one(
                        {'_id': ObjectId(itinerary_id), 'user_id': user_id},
                        {
                            '$set': {
                                'name': '',
                                'description': '',
                                'waypoints': '',
                                'upload_datetime': '',  
                                'last_modified': datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
                                'num_views': 0,
                                'likes': [],
                                'deleted': 1,
                                'image': '',
                                'image_format': ''
                            }
                        }
                    )
                    app.logger.info(f"Successfully marked itinerary with ID: {itinerary_id} as deleted")
                    return jsonify(success=True)
                else:
                    app.logger.warning(f"No itineraries found with ID: {itinerary_id}")
                    return jsonify(success=False, error="No itinerary found with the provided ID or permission denied.")
            else:
                app.logger.warning("No itinerary ID provided in request data.")
                return jsonify(success=False, error="No itinerary ID provided.")
        except Exception as e:
            app.logger.error(f"Error in delete_itinerary: {e}")
            traceback.print_exc()
            return jsonify(success=False, error=str(e))
    
    # Route for viewing a specific itinerary. Retrieves and displays detailed information of the itinerary based on the given ID.
    @app.route('/view-itinerary/<itinerary_id>')
    @login_required
    def view_itinerary(itinerary_id):
        try:
            itinerary = mongo.db.itineraries.find_one({'_id': ObjectId(itinerary_id)})
            if not itinerary:
                flash("Itinerary not found.", "danger")
                return redirect(url_for('index'))
        
            
            itinerary_name = itinerary.get('name')
            
            author_username = itinerary.get('user_id')
            author_data = mongo.db.users.find_one({'username': author_username})
            author = author_data.get('name') if author_data else "Anonymous"
    
            try:
                if isinstance(itinerary.get('upload_datetime'), datetime):
                    creation_date = itinerary['upload_datetime'].strftime('%m/%d/%Y')
                elif isinstance(itinerary.get('upload_datetime'), str):
                    
                    creation_date = datetime.strptime(itinerary['upload_datetime'], '%Y-%m-%d %H:%M:%S').strftime('%m/%d/%Y')
                else:
                    creation_date = "Unknown"  
            except Exception as e:
                flash(f"Error formatting the creation date: {e}", "warning")
                creation_date = "Unknown"  
            likes = itinerary.get('likes', [])
            num_likes = len(likes)
            description = itinerary.get('description', '')

            
            is_author = False
            has_liked = False

            
            user_id = str(current_user.id) if current_user.is_authenticated else None

            if user_id and 'user_id' in itinerary:
                is_author = user_id == str(itinerary['user_id'])
                has_liked = user_id in likes

            
            if not is_author:
                new_views = itinerary.get('num_views', 0) + 1
                mongo.db.itineraries.update_one(
                    {'_id': ObjectId(itinerary_id)}, 
                    {'$set': {'num_views': new_views}}
                )
                itinerary['num_views'] = new_views  

            
            itinerary_json = json.loads(json_util.dumps(itinerary))
        except Exception as e:
            flash(f"Error retrieving itinerary: {e}", "danger")
            return redirect(url_for('index'))

        return render_template('view_itinerary.html', itinerary=itinerary_json, itinerary_name=itinerary_name, author=author, creation_date=creation_date, num_likes=num_likes, description=description, user_id=user_id, is_author=is_author, has_liked=has_liked, num_views=itinerary.get('num_views', 0))
