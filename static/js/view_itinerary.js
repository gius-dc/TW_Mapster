/* This script is included in the Flask 'view-itinerary.html' template for displaying specific itineraries.
   It handles mapping and displaying of routes, using Leaflet for interactive map */

var usedColors = [];
var southWest = L.latLng(-89.98155760646617, -180),
    northEast = L.latLng(89.99346179538875, 180);
var bounds = L.latLngBounds(southWest, northEast);

// Configuration and creation of the map using Leaflet
window.map = L.map('map', {
    center: [0, 0],
    zoom: 2,
    maxBounds: bounds,
    maxBoundsViscosity: 1.0,
    gestureHandling: true
});

// Adding the Tile layer for OpenStreetMap to the map
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    noWrap: true,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
}).addTo(map);


var waypoints = itineraryData.waypoints;
var markersLayer = new L.LayerGroup().addTo(map);


document.addEventListener('DOMContentLoaded', function () {
    waypoints.forEach(function (waypoint, index) {
        // Creating and adding custom markers with different colors for each waypoint
        var color = getRandomColor();
        var icon = createCustomIcon(color, index + 1);
        var marker = L.marker([waypoint.latitude, waypoint.longitude], { icon: icon }).addTo(markersLayer);
        marker.bindPopup(waypoint.name);

        // Adding the waypoint to the list in the DOM
        var li = document.createElement('li');
        li.className = 'list-group-item d-flex align-items-center';
        li.dataset.index = index;

        var circle = document.createElement('span');
        circle.className = 'waypoint-circle';
        circle.style.backgroundColor = color;
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
        var textColor = getContrastYIQ(color);
        circle.style.color = textColor;

        var addressSpan = document.createElement('span');
        addressSpan.className = 'waypoint-address';
        addressSpan.textContent = waypoint.name;
        addressSpan.style.flexGrow = '1';
        addressSpan.style.overflow = 'hidden';
        addressSpan.style.whiteSpace = 'nowrap';
        addressSpan.style.textOverflow = 'ellipsis';
        addressSpan.style.marginRight = '10px';

        li.addEventListener('click', function () {
            map.setView([waypoint.latitude, waypoint.longitude], 20);
        });

        li.appendChild(circle);
        li.appendChild(addressSpan);

        // Adding the list item to the DOM
        document.getElementById('waypointsList').querySelector('ul').appendChild(li);
    });

    // Generates a random hex color. Ensures the color is unique and has controlled brightness for consistency across the application.
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


    // Creates a custom SVG icon for map markers, using a specified color and number. It ensures good visibility by adjusting text color for contrast.
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

    // Calculates the contrast color (black or white) for text based on the YIQ color space, ensuring readability against a colored background.
    function getContrastYIQ(color) {
        var r = parseInt(color.substr(1, 2), 16);
        var g = parseInt(color.substr(3, 2), 16);
        var b = parseInt(color.substr(5, 2), 16);
        var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? 'black' : 'white';
    }
    drawRoute();


    // Fetches and displays a driving route on the map using OSRM API. The route is drawn based on waypoints coordinates, adjusting the map view to encompass it.
    function drawRoute() {
        var coordinates = waypoints.map(function (wp) { return [wp.longitude, wp.latitude]; });
        var osrmRouteUrl = 'https://router.project-osrm.org/route/v1/driving/' +
            coordinates.join(';') + '?overview=full&geometries=geojson';

        fetch(osrmRouteUrl)
            .then(response => response.json())
            .then(data => {
                if (data.routes && data.routes.length) {
                    var routeLine = L.polyline(data.routes[0].geometry.coordinates.map(function (coord) {
                        return [coord[1], coord[0]];
                    }), {
                        color: 'blue',
                        weight: 5,
                        opacity: 0.7
                    }).addTo(map);

                    map.fitBounds(routeLine.getBounds());
                }
            })
            .catch(error => {
                console.error('Errore durante il recupero del tracciato del percorso:', error);
            });
    }
});

// Generates a Google Maps URL for directions using itinerary waypoints and a specified travel mode, then navigates the user to this URL.
function startNavigation(travelMode) {
    var destination = itineraryData.waypoints[itineraryData.waypoints.length - 1];

    var googleMapsUrl = 'https://www.google.com/maps/dir/?api=1&destination=' + destination.latitude + ',' + destination.longitude + '&travelmode=' + travelMode + '&waypoints=';

    itineraryData.waypoints.forEach(function (waypoint, index) {
        googleMapsUrl += waypoint.latitude + ',' + waypoint.longitude;
        if (index < itineraryData.waypoints.length - 1) {
            googleMapsUrl += '|';
        }
    });

    window.location.href = googleMapsUrl;
}

// Sends a request to toggle the like status of an itinerary and updates the UI to reflect the new status and like count.
function toggleLike(itineraryId) {
    var likeButton = document.getElementById('likeButton');
    var likesCountElement = document.getElementById('likesCount');
    var likeImg = document.getElementById('like-img');

    fetch(`/api/toggle-like/${itineraryId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {

                if (data.liked) {
                    console.log("unlike");
                    likesCountElement.innerHTML = parseInt(likesCountElement.innerHTML) + 1;
                    likeImg.src = "/static/icons/unlike-icon.svg";

                } else {
                    console.log("like");
                    likesCountElement.innerHTML = parseInt(likesCountElement.innerHTML) - 1;
                    likeImg.src = "/static/icons/likes-icon.svg";
                }
            } else {
                console.error('Errore durante il toggle dei like:', data.error);
            }
        })
        .catch(error => {
            console.error('Errore durante il toggle dei like:', error);
        });
}

window.addEventListener('load', adjustMapHeight);
window.addEventListener('resize', adjustMapHeight);

// Dynamically adjusts the map's height based on the viewport size, ensuring a responsive and user-friendly map display on different devices.
function adjustMapHeight() {
    if (window.innerWidth > 992) {
        var cardBodyHeight = document.querySelector('.card-body').clientHeight;
        var sidebarHeight = document.querySelector('#sidebar').clientHeight;

        var totalHeight = cardBodyHeight + sidebarHeight + 20;
        if (totalHeight < 600) {
            totalHeight = 600;
        }
        var mapElement = document.getElementById('map');
        mapElement.style.height = totalHeight + 'px';

        if (map) {
            map.invalidateSize();
        }
    } else {
        var mapElement = document.getElementById('map');
        mapElement.style.height = '60vh';

        if (map) {
            map.invalidateSize();
        }
    }
}

adjustMapHeight();
