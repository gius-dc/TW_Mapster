/* This script is linked to the Flask template 'create_itinerary.html' and contains all the JavaScript logic
   required for creating a new itinerary or modifying an existing one. It manages map interactions,
   waypoint creation, and itinerary data handling. */

// Initialize map boundaries and create the map with a global view.
var southWest = L.latLng(-89.98155760646617, -180),
    northEast = L.latLng(89.99346179538875, 180);
var bounds = L.latLngBounds(southWest, northEast);

var map = L.map('map', {
    center: [0, 0],
    zoom: 2,
    maxBounds: bounds,
    maxBoundsViscosity: 1.0,
    gestureHandling: true,
});

// Variables to manage waypoints, markers, and map interaction state.
var waypoints = [];
var markersLayer = new L.LayerGroup().addTo(map);
var isFetching = false;
var usedColors = [];
var mySortableInstance;

// Initialize the tile layer of the map.
setupTileLayer(true);

let overlayCoordinates = { top: 0, left: 0 };

/* Load existing itinerary data when the DOM is fully loaded. This script is used by the 'create_itinerary.html' template 
   for both 'create-itinerary' and 'edit-itinerary' routes. If 'itineraryData' is populated, it implies that Flask has 
   provided data for an existing itinerary (from the 'edit-itinerary' route), allowing the page to be pre-filled with 
   existing data for editing. In the absence of 'itineraryData', the page functions for creating a new itinerary. */
document.addEventListener('DOMContentLoaded', function () {
    if (itineraryData) {
        if (itineraryData.waypoints) {
            loadExistingItinerary(itineraryData);
        }
    }
});

// Event listener for map clicks to add waypoints.
map.on('click', function (e) {
    var initialScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    var mapTopPosition = document.getElementById('map').getBoundingClientRect().top + initialScrollPosition;

    if (isFetching) return;
    isFetching = true;

    var latlng = e.latlng;
    var color = getRandomColor();
    var markerNumber = waypoints.length + 1;

    reverseGeocode(latlng.lat, latlng.lng).then(locationName => {
        var icon = createCustomIcon(color, markerNumber);
        var marker = L.marker(latlng, { icon: icon }).addTo(markersLayer);
        waypoints.push({
            latlng: [latlng.lat, latlng.lng],
            marker: marker,
            name: locationName,
            color: color,
            order: markerNumber
        });

        drawRoute(function () {
            isFetching = false;
        });

        updateWaypointsList();



        var mapPositionDiff = (document.getElementById('map').getBoundingClientRect().top + window.pageYOffset) - mapTopPosition;

        window.scrollTo({
            top: initialScrollPosition + mapPositionDiff,
            behavior: 'smooth'
        });

        isFetching = false;
    }).catch(error => {
        console.error('Error adding waypoint:', error);
        isFetching = false;

    });
});

// Update the list of waypoints in the UI.
function updateWaypointsList() {
    destroySortable();
    var waypointsList = document.getElementById('waypointsList');
    var ul = waypointsList.querySelector('ul');
    ul.innerHTML = '';

    waypoints.forEach(function (waypoint, index) {
        var li = document.createElement('li');
        li.className = 'list-group-item d-flex align-items-center';
        li.dataset.index = index;

        var circle = document.createElement('span');
        circle.className = 'waypoint-circle';
        circle.style.backgroundColor = waypoint.color;
        circle.style.borderRadius = '50%';
        circle.style.width = '25px';
        circle.style.height = '25px';
        circle.style.display = 'flex';
        circle.style.justifyContent = 'center';
        circle.style.alignItems = 'center';
        circle.style.color = 'white';
        circle.style.fontWeight = 'bold';
        circle.style.marginRight = '10px';
        circle.textContent = index + 1;
        var textColor = getContrastYIQ(waypoint.color);
        circle.style.color = textColor;

        var addressSpan = document.createElement('span');
        addressSpan.className = 'waypoint-address';
        addressSpan.textContent = waypoint.name;
        addressSpan.style.flexGrow = '1';
        addressSpan.style.overflow = 'hidden';
        addressSpan.style.whiteSpace = 'nowrap';
        addressSpan.style.textOverflow = 'ellipsis';
        addressSpan.style.marginRight = '10px';

        var removeButton = document.createElement('button');
        removeButton.className = 'btn btn-danger btn-delete';
        removeButton.innerHTML = '<img src="/static/icons/bin-icon.svg" alt="Rimuovi">';
        removeButton.style.flexShrink = '0';
        removeButton.onclick = function () {
            removeWaypoint(index);
        };

        li.appendChild(circle);
        li.appendChild(addressSpan);
        li.appendChild(removeButton);

        ul.appendChild(li);
    });

    waypointsList.classList.toggle('empty', waypoints.length === 0);
    makeSortable(ul);
}

/* Make the list of waypoints sortable via drag and drop. This feature allows users to reorganize the stops in their itinerary 
   by simply dragging and dropping the waypoint items in the list, providing a user-friendly way to modify the order of their travel route. */
function makeSortable(list) {
    mySortableInstance = Sortable.create(list, {
        animation: 150,
        touchStartThreshold: 100,
        delay: 500,
        delayOnTouchOnly: true,
        onStart: function (evt) {

        },
        onEnd: function (evt) {
            var oldIndex = evt.oldIndex;
            var newIndex = evt.newIndex;
            if (oldIndex !== newIndex) {
                waypoints.splice(newIndex, 0, waypoints.splice(oldIndex, 1)[0]);
                drawRoute();
            }
        }
    });
}

/* Destroy the sortable instance to reset or update the list. This step is crucial because any dynamic modifications 
   to the waypoint list (like additions or removals) via JavaScript cause the list to lose its drag-and-drop functionality.
   Therefore, before reapplying Sortable.js for reordering capabilities, the existing sortable instance must be destroyed. */
function destroySortable() {
    if (mySortableInstance) {
        mySortableInstance.destroy();
        mySortableInstance = null;
    }
}

// Function to remove a waypoint from the map and the list.
function removeWaypoint(index) {
    markersLayer.removeLayer(waypoints[index].marker);
    waypoints.splice(index, 1);
    updateWaypointsList();
    drawRoute();
}

/* Draw a route on the map connecting all waypoints using OSRM (Open Source Routing Machine). 
   This function calculates and displays the optimal path through all the specified waypoints on the map. */
function drawRoute(callback) {
    map.eachLayer(function (layer) {
        if (layer instanceof L.Polyline) {
            map.removeLayer(layer);
        }
    });

    var osrmRequestUrl = 'https://router.project-osrm.org/route/v1/driving/';
    waypoints.forEach(function (waypoint, index) {
        osrmRequestUrl += waypoint.latlng[1] + ',' + waypoint.latlng[0];
        if (index < waypoints.length - 1) osrmRequestUrl += ';';
    });
    osrmRequestUrl += '?overview=full';

    if (waypoints.length > 1) {
        isFetching = true;

        fetch(osrmRequestUrl)
            .then(response => response.json())
            .then(data => {
                L.polyline(decodePolyline(data.routes[0].geometry), { color: 'blue' }).addTo(map);
                if (callback) callback();
            })
            .catch(error => {
                console.error('Error in route calculation:', error);
            })
            .finally(() => {
                isFetching = false;
                updateWaypointsList();
            });
    } else {
        if (callback) callback();
        isFetching = false;
        updateWaypointsList();
    }
}

/* Function to perform reverse geocoding to get location names. This utilizes Nominatim, 
   an OpenStreetMap service, to convert latitude and longitude coordinates into readable location names. */
function reverseGeocode(lat, lng) {
    var nominatimUrl = 'https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=' + lat + '&lon=' + lng;

    isFetching = true;

    return fetch(nominatimUrl)
        .then(response => response.json())
        .then(data => {
            isFetching = false;
            return data.display_name ? data.display_name : 'Unknown location';
        })
        .catch(error => {
            console.error('Error in reverse geocoding:', error);
            isFetching = false;
            return 'Error in reverse geocoding';
        });
}

/* Function to decode an encoded polyline, used in route plotting. This is essential for interpreting 
   the compressed polyline format returned by routing services like OSRM. */
function decodePolyline(polyline) {
    var points = [];
    var index = 0, lat = 0, lng = 0;

    while (index < polyline.length) {
        var b, shift = 0, result = 0;
        do {
            b = polyline.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        var dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;
        shift = 0;
        result = 0;
        do {
            b = polyline.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        var dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;
        points.push([lat / 1e5, lng / 1e5]);
    }
    return points;

}

/* Validates user input for form fields. Ensures required fields are filled and 
   adheres to maximum length constraints. The 'isOptional' flag allows for optional fields. */
function validateInput(input, maxLength, errorMessage, isOptional = false) {
    if (!isOptional && !input.value.trim()) {
        input.classList.add('is-invalid');
        input.focus();
        alert(errorMessage);
        return false;
    } else if (input.value.length > maxLength) {
        alert(`The input cannot be longer than ${maxLength} characters.`);
        return false;
    } else {
        input.classList.remove('is-invalid');
        return true;
    }
}

/* Resets the map to its original dimensions and state after failed itinerary loading.
   Ensures a consistent user experience by reverting any adjustments made for screen capture.*/
function resetMapToOriginalState(originalWidth, originalHeight) {
    const mapElement = document.getElementById('map');
    mapElement.style.width = originalWidth;
    mapElement.style.height = originalHeight;
    map.invalidateSize();
    setupTileLayer(true);
    drawRoute();
}

// Sets up the tile layer for the map. 'disableWrap' controls whether the map tiles wrap around the date line.
function setupTileLayer(disableWrap) {
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        noWrap: disableWrap,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
    }).addTo(map);
}

/* Handles the submission of the itinerary form, including data validation, 
   preparing data for submission, and making the API call to save or update the itinerary. */
async function sendItinerary() {
    const itineraryNameInput = document.getElementById('itinerary_name');
    const itineraryDescriptionInput = document.getElementById('itinerary_description');
    const itineraryId = document.getElementById('itinerary_id').value;
    const originalWidthMap = document.getElementById('map').style.width;
    const originalHeightMap = document.getElementById('map').style.height;

    if (!validateInput(itineraryNameInput, 100, 'Please enter a name for the itinerary.')) return;
    if (!validateInput(itineraryDescriptionInput, 500, 'The itinerary description cannot be longer than 500 characters.', true)) return;
    if (waypoints.length < 2) {
        alert('Please add at least two waypoint before submitting.');
        return;
    }

    const itineraryName = itineraryNameInput.value;
    const itineraryDescription = itineraryDescriptionInput.value;
    const waypointData = waypoints.map(wp => ({
        name: wp.name,
        latitude: wp.latlng[0],
        longitude: wp.latlng[1]
    }));

    const formData = new FormData();
    formData.append('itinerary_name', itineraryName);
    formData.append('itinerary_description', itineraryDescription);
    formData.append('waypoint_count', waypointData.length);
    waypointData.forEach((wp, index) => {
        formData.append(`waypoints[${index}][name]`, wp.name);
        formData.append(`waypoints[${index}][latitude]`, wp.latitude);
        formData.append(`waypoints[${index}][longitude]`, wp.longitude);
    });

    try {
        showLoadingOverlay();
        captureOverlayPosition('loadingOverlay');
        var mapElement = document.getElementById('map');
        mapElement.style.width = '634px';
        mapElement.style.height = '185.141px';
        map.invalidateSize();
        setPositionToResultOverlay('loadingOverlay');
        await sleep(1000);
        hideMapControls();
        map.eachLayer(layer => {
            if (layer instanceof L.Polyline) {
                map.removeLayer(layer);
            }
        });
        setupTileLayer(false);
        var bounds = new L.LatLngBounds(waypoints.map(wp => wp.latlng));
        map.fitBounds(bounds);
        await sleep(500);
        map.setZoom(map.getZoom() - 1);
        await sleep(500);
        panMapDownWithZoom(-10);
        await sleep(500);
        const mapImageBlob = await captureMapImage();
        showMapControls();
        formData.append('map_image', mapImageBlob, 'map.' + (mapImageBlob.type === 'image/webp' ? 'webp' : 'jpg'));
    } catch (error) {
        console.error('Error capturing map image:', error);
        resetMapToOriginalState(originalWidthMap, originalHeightMap);
    }

    const endpoint = itineraryId ? '/update-itinerary/' + itineraryId : '/save-itinerary';
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            body: formData
        });
        setPositionToResultOverlay('resultOverlay');
        if (response.status === 200) {
            if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    action: 'sync-itineraries'
                });
            }

            hideLoadingOverlay();
            showResultOverlay("Upload completed successfully");
            await sleep(3000);
            window.location.href = '/myitineraries';
        } else {
            const data = await response.json();
            if (data.error) {
                console.error(data.error);
                hideLoadingOverlay();
                showResultOverlay(data.error);
                await sleep(3000);
                resetMapToOriginalState(originalWidthMap, originalHeightMap);
                hideResultOverlay();
            }
        }
    } catch (error) {
        console.error('Network error:', error);
        hideLoadingOverlay();
        showResultOverlay(error);
        await sleep(3000);
        resetMapToOriginalState(originalWidthMap, originalHeightMap);
        hideResultOverlay();
    }
}

/* Captures the current map view as an image for use as a background in itinerary cards on various pages, such as home, search, and my itineraries.
   This provides a visual preview of the itinerary. */
async function captureMapImage() {
    const mapElement = document.getElementById('map');
    await sleep(1000);
    try {
        const canvas = await html2canvas(mapElement, { useCORS: true });
        return new Promise((resolve, reject) => {
            if (canvas.toBlob) {
                canvas.toBlob(blob => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        canvas.toBlob(blobFallback => {
                            if (blobFallback) {
                                resolve(blobFallback);
                            } else {
                                reject(new Error('Failed to convert canvas to Blob.'));
                            }
                        }, 'image/jpeg', 0.30);
                    }
                }, 'image/webp', 0.30);
            } else {
                reject(new Error('toBlob is not supported.'));
            }
        });
    } catch (error) {
        console.error('Error capturing map image:', error);
        throw error;
    }
}

// Utility function to pause execution for a specified amount of milliseconds, often used for delays in animations or API calls.
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Prepares the map for screen capture by hiding controls like zoom and attribution.
function hideMapControls() {
    document.querySelector('.leaflet-control-zoom').style.visibility = 'hidden';
    document.querySelector('.leaflet-control-attribution').style.visibility = 'hidden';
}

// Restores previously hidden map controls to their visible state.
function showMapControls() {
    document.querySelector('.leaflet-control-zoom').style.visibility = 'visible';
    document.querySelector('.leaflet-control-attribution').style.visibility = 'visible';
}

// Calculates the appropriate pan value for centering the map, considering the current zoom level.
function getZoomDependentPanValue(basePanValue) {
    var currentZoom = map.getZoom();
    var maxZoom = map.getMaxZoom();
    var zoomDiff = maxZoom - currentZoom;
    var panValue = basePanValue * (1 + zoomDiff / maxZoom);
    return panValue;
}

// Pans the map down by a specified number of pixels, adjusted for the current zoom level, for screen capture purposes.
function panMapDownWithZoom(basePixels) {
    var panValue = getZoomDependentPanValue(basePixels);
    map.panBy([0, panValue]);
}

// Determines whether to use black or white text for good contrast based on the input color.
function getContrastYIQ(color) {
    var r = parseInt(color.substr(1, 2), 16);
    var g = parseInt(color.substr(3, 2), 16);
    var b = parseInt(color.substr(5, 2), 16);
    var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? 'black' : 'white';
}

// Generates a random color with sufficient brightness for text contrast.
function getRandomColor() {
    function getRandomComponent() {
        return Math.floor(Math.random() * 256);
    }

    var minBrightness = 50;
    var maxBrightness = 200;

    var r, g, b;
    do {
        r = getRandomComponent();
        g = getRandomComponent();
        b = getRandomComponent();
        var brightness = (r + g + b) / 3;
    } while (brightness < minBrightness || brightness > maxBrightness);

    var color = '#' + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);

    if (usedColors.includes(color)) {
        return getRandomColor();
    }

    usedColors.push(color);
    return color;
}

// Creates a custom icon for map markers with the specified color and number.
function createCustomIcon(color, number) {
    var icon = L.divIcon({
        className: 'custom-marker',
        html: '<svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg"><path fill="' + color + '" d="M12.5 0C5.59644 0 0 5.59644 0 12.5C0 19.4036 12.5 41 12.5 41C12.5 41 25 19.4036 25 12.5C25 5.59644 19.4036 0 12.5 0ZM12.5 19C9.46243 19 7 16.5376 7 13.5C7 10.4624 9.46243 8 12.5 8C15.5376 8 18 10.4624 18 13.5C18 16.5376 15.5376 19 12.5 19Z"/></svg>',
        iconSize: [25, 41],
        iconAnchor: [12.5, 41],
        popupAnchor: [0, -41]
    });
    return icon;
}

/* This function displays an overlay during the upload phase of the itinerary.
   It serves to indicate the loading phase and to visually mask the resizing and recentering of the map. */
function showLoadingOverlay(message) {
    document.getElementById('loadingOverlay').classList.add('active');
    document.body.classList.add('blur-background');
}

// This function removes the overlay once the upload phase is complete, revealing the updated map.
function hideLoadingOverlay() {
    document.getElementById('loadingOverlay').classList.remove('active');
    document.body.classList.remove('blur-background');
}

// This function displays an overlay with a specific message, indicating the result of a certain operation.
function showResultOverlay(message) {
    const resultOverlay = document.getElementById('resultOverlay');
    resultOverlay.classList.remove('hidden');
    resultOverlay.classList.add('flex-container');
    resultOverlay.classList.add('active');
    const resultMessage = resultOverlay.querySelector('#resultMessage');
    resultMessage.textContent = message;
    document.body.classList.add('blur-background');
}

// This function removes the result overlay.
function hideResultOverlay() {
    const resultOverlay = document.getElementById('resultOverlay');
    if (resultOverlay) {
        resultOverlay.classList.remove('active');
        resultOverlay.classList.add('hidden');
        resultOverlay.classList.remove('flex-container');
        document.body.classList.remove('blur-background');
    }
}

/* This function captures the current position of the overlay. This is done before the map is resized,
   which could potentially change the overlay's position relative to the page center. */
function captureOverlayPosition(overlayId) {
    const overlay = document.getElementById(overlayId);
    const rect = overlay.getBoundingClientRect();
    overlayCoordinates.top = rect.top + window.scrollY;
    overlayCoordinates.left = rect.left + window.scrollX;
}

/* This function sets the overlay's position to the previously captured coordinates.
   This ensures that the overlay appears stationary to the user, even as the page size changes. */
function setPositionToResultOverlay(overlayId) {
    const resultOverlay = document.getElementById(overlayId);
    resultOverlay.style.position = 'absolute';
    resultOverlay.style.top = overlayCoordinates.top + 'px';
    resultOverlay.style.left = overlayCoordinates.left + 'px';
}

/* This function is used when an itinerary is being edited. It loads the existing itinerary data,
   allowing the user to see and modify the current waypoints. */
function loadExistingItinerary(itineraryData) {
    if (itineraryData.waypoints && itineraryData.waypoints.length > 0) {
        itineraryData.waypoints.forEach(function (wp, index) {
            var latlng = L.latLng(wp.latitude, wp.longitude);
            var color = getRandomColor();
            var markerNumber = index + 1;

            var icon = createCustomIcon(color, markerNumber);
            var marker = L.marker(latlng, { icon: icon }).addTo(markersLayer);

            waypoints.push({
                latlng: [latlng.lat, latlng.lng],
                marker: marker,
                name: wp.name,
                color: color,
                order: markerNumber
            });

            updateWaypointsList();
        });

        centerMapOnWaypoints();
        drawRoute();
    }
}

// This function adjusts the map view to center on the waypoints
function centerMapOnWaypoints() {
    var bounds = new L.LatLngBounds(waypoints.map(wp => wp.latlng));
    map.fitBounds(bounds);
}

