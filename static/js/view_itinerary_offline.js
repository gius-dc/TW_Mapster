/* This script is used for the 'viewitinerary_offline.html' page, similar to the 'viewitinerary.html' in functionality.
   While 'viewitinerary.html' retrieves itinerary data from the server, this offline version reads the data from IndexedDB
   and dynamically renders it on the page using JavaScript. */

// Initializes a Dexie database named 'ItinerariesDatabase'. Opens the database for reading itinerary data.
const db = new Dexie('ItinerariesDatabase');
db.version(1).stores({
    itineraries: '_id, user_id, name, description, waypoints, upload_datetime, last_modified, num_views, likes, image, image_format'
});
var usedColors = [];

const urlParams = new URLSearchParams(window.location.search);
const itineraryId = urlParams.get('itineraryId');

/* Asynchronously fetches and displays the details of a specific itinerary identified by 'itineraryId' from IndexedDB.
   It populates elements like itinerary name, author, creation date, and description. */
async function loadAndDisplayItinerary() {
    try {
        const itinerary = await db.itineraries.get(itineraryId);
        if (itinerary) {
            document.getElementById('itinerary-name').textContent = itinerary.name;
            document.getElementById('author-name').textContent = itinerary.user_id;
            document.getElementById('creation-date').textContent = itinerary.upload_datetime;
            document.getElementById('itinerary-description').textContent = itinerary.description || 'No description provided';


            displayMap(itinerary.waypoints);
        } else {
            console.error('Itinerario non trovato');
        }
    } catch (error) {
        console.error('Errore durante il caricamento dell\'itinerario:', error);
    }
}

/* Initializes and displays a Leaflet map. Populates the map with markers representing the waypoints of the itinerary.
   Adjusts the map view to fit all the markers. */
function displayMap(waypoints) {
    var map = L.map('map').setView([41.8719, 12.5674], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
    }).addTo(map);

    waypoints.forEach(function (waypoint, index) {
        var color = getRandomColor();
        var customIcon = createCustomIcon(color, index + 1);
        var marker = L.marker([waypoint.latitude, waypoint.longitude], { icon: customIcon }).addTo(map);
        marker.bindPopup(waypoint.name);

        populateWaypointsList(waypoint, index, color);
    });

    if (waypoints.length > 0) {
        var group = new L.featureGroup(waypoints.map(function (waypoint) {
            return L.marker([waypoint.latitude, waypoint.longitude]);
        }));
        map.fitBounds(group.getBounds());
    }
}

/* Retrieves the current itinerary from IndexedDB and constructs a Google Maps URL for navigation.
   Opens the URL in a new tab, providing turn-by-turn navigation directions based on the itinerary's waypoints.*/
async function startNavigation(travelMode) {
    try {
        const itinerary = await db.itineraries.get(itineraryId);
        if (itinerary && itinerary.waypoints && itinerary.waypoints.length > 0) {
            var destination = itinerary.waypoints[itinerary.waypoints.length - 1];
            var googleMapsUrl = 'https://www.google.com/maps/dir/?api=1&destination=' +
                destination.latitude + ',' + destination.longitude +
                '&travelmode=' + travelMode + '&waypoints=';

            itinerary.waypoints.slice(0, -1).forEach(function (waypoint, index) {
                googleMapsUrl += waypoint.latitude + ',' + waypoint.longitude;
                if (index < itinerary.waypoints.length - 2) {
                    googleMapsUrl += '|';
                }
            });

            window.open(googleMapsUrl, '_blank');
        } else {
            console.error("No waypoints available for navigation");
        }
    } catch (error) {
        console.error("Error while fetching itinerary for navigation:", error);
    }
}

// Calculates the optimal text color (black or white) for maximum contrast against a given background color.
function getContrastYIQ(color) {
    var r = parseInt(color.substr(1, 2), 16);
    var g = parseInt(color.substr(3, 2), 16);
    var b = parseInt(color.substr(5, 2), 16);
    var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? 'black' : 'white';
}

// Generates a random color with controlled brightness, ensuring visibility and aesthetic consistency for map markers.
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

// Creates a custom icon for Leaflet markers. Uses the provided color and a numerical indicator, ensuring each marker is distinct and visible on the map.
function createCustomIcon(color, number) {
    var textColor = getContrastYIQ(color);
    return L.divIcon({
        className: 'custom-marker',
        html: '<svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">' +
            '<path fill="' + color + '" d="M12.5 0C5.59644 0 0 5.59644 0 12.5C0 19.4036 12.5 41 12.5 41C12.5 41 25 19.4036 25 12.5C25 5.59644 19.4036 0 12.5 0ZM12.5 19C9.46243 19 7 16.5376 7 13.5C7 10.4624 9.46243 8 12.5 8C15.5376 8 18 10.4624 18 13.5C18 16.5376 15.5376 19 12.5 19Z"/>' +
            '<text x="12.5" y="28" text-anchor="middle" style="fill: ' + textColor + '; font-size: 12px; font-family: Arial, sans-serif; font-weight: bold;" dy=".3em";>' + number + '</text>' +
            '</svg>',
        iconSize: [25, 41],
        iconAnchor: [12.5, 41],
        popupAnchor: [0, -41]
    });
}

/* Dynamically populates a list with waypoints from the itinerary. Each list item includes a colored circle indicator and the waypoint's name,
   enhancing the user's ability to associate map markers with their corresponding list entries. */
function populateWaypointsList(waypoint, index, color) {
    var waypointsList = document.getElementById('waypointsList').querySelector('ul');
    var li = document.createElement('li');
    li.className = 'list-group-item d-flex align-items-center';

    var circle = document.createElement('span');
    circle.className = 'waypoint-circle';
    circle.style.backgroundColor = color;
    circle.textContent = index + 1;
    circle.style.color = getContrastYIQ(color);

    var addressSpan = document.createElement('span');
    addressSpan.className = 'waypoint-address';
    addressSpan.textContent = waypoint.name;

    li.appendChild(circle);
    li.appendChild(addressSpan);
    waypointsList.appendChild(li);
}


// Adds an event listener to call loadAndDisplayItinerary once the DOM content is fully loaded
document.addEventListener('DOMContentLoaded', loadAndDisplayItinerary);