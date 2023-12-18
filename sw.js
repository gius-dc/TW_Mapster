/* Service Worker Script (sw.js)
   This script is responsible for caching static assets, handling offline requests,
   and synchronizing user itineraries with the server when online. */

// Define the cache name and URLs to cache
const CACHE_NAME = 'mapster-cache';
const urlsToCache = [
  '/static/manifest.json',
  '/static/css/base.css',
  '/static/css/login.css',
  '/static/css/signup.css',
  '/static/css/myitineraries.css',
  '/static/css/create_itinerary.css',
  '/static/css/view_itinerary.css',
  '/static/css/index.css',
  '/static/css/leaflet-gesture-handling.min.css',
  '/static/css/leaflet.css',
  '/static/css/bootstrap.min.css',
  '/static/css/images/marker-shadow.png',
  '/static/css/images/markers-shadow.png',
  '/static/css/images/marker-icon.png',
  '/static/js/login.js',
  '/static/js/signup.js',
  '/static/js/base.js',
  '/static/js/create_itinerary.js',
  '/static/js/myitineraries.js',
  '/static/js/view_itinerary.js',
  '/static/js/index.js',
  '/static/js/myitineraries_offline.js',
  '/static/js/view_itinerary_offline.js',
  '/static/js/leaflet.js',
  '/static/js/leaflet-gesture-handling.js',
  '/static/js/Sortable.min.js',
  '/static/js/html2canvas.min.js',
  '/static/js/bootstrap.bundle.min.js',
  '/static/js/dexie.min.js',
  '/static/icons/download-icon.svg',
  '/static/icons/bin-icon.svg',
  '/static/icons/edit-icon.svg',
  '/static/icons/likes-icon.svg',
  '/static/icons/views-icon.svg',
  '/static/icons/add-icon.svg',
  '/static/icons/send-icon.svg',
  '/static/icons/walking-icon.svg',
  '/static/icons/car-icon.svg',
  '/static/icons/biking-icon.svg',
  '/static/icons/user-icon.svg',
  '/static/icons/unlike-icon.svg',
  '/static/icons/calendar-icon.svg',
  '/static/icons/icon-192x192.png',
  '/static/icons/icon-256x256.png',
  '/static/icons/icon-384x384.png',
  '/static/icons/icon-512x512.png',
  '/static/icons/transp-icon-256x256.png',
  '/static/icons/navigate-icon.svg',
  '/static/icons/google-logo.png',
  '/static/icons/offline-icon.svg',
  '/static/html/myitineraries_offline.html',
  '/static/html/offline.html',
  '/static/html/view_itinerary_offline.html',
];
// URL for the offline page
const OFFLINE_URL = '/static/html/offline.html';

// Variable to track user login status
let isUserLoggedIn = false;

// Timer to periodically sync itineraries
let syncTimer = null;

// Install event: Caches static assets for offline use
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching all');
        cache.addAll(urlsToCache);

        return cache.addAll([OFFLINE_URL]);
      })
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate event');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event: Handle requests

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  if (requestUrl.pathname === '/static/html/view_itinerary_offline.html') {
    // Se la richiesta è per la pagina dinamica view_itinerary_offline.html, gestiscila in modo specifico
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/static/html/view_itinerary_offline.html').then(response => {
          return response || caches.match(OFFLINE_URL);
        });
      })
    );
  } else {
    // Per tutte le altre richieste, prova a recuperare dalla cache se disponibile
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).catch(() => {
          // Se la richiesta online fallisce, restituisci la pagina offline
          return caches.match(OFFLINE_URL);
        });
      })
    );
  }
});


// Importing Dexie for local IndexedDB database management, enabling offline data storage and synchronization.
importScripts('/static/js/dexie.min.js');

// Create a local database for itineraries
const db = new Dexie('ItinerariesDatabase');
db.version(1).stores({
  itineraries: '_id, user_id, name, description, waypoints, upload_datetime, last_modified, num_views, likes, image, image_format, deleted'
});

// Function to get the last synchronization time
async function getLastSyncTime() {
  const lastSync = await db.itineraries.orderBy('last_modified').reverse().first();
  if (lastSync && lastSync.last_modified) {
    const date = new Date(lastSync.last_modified + 'Z');
    return date.toISOString().substring(0, 19).replace('T', ' ');
  } else {
    return '0001-01-01 00:00:00';
  }
}

// Function to save itineraries to the local database
async function saveItinerariesToLocalDatabase(itineraries) {
  // Check if there are itineraries to update
  if (itineraries.length === 0) {
    console.log('[Service worker] No itineraries to update in IndexedDB');
    return;
  }

  try {
    const mappedItineraries = itineraries.map(itinerary => {
      let image = null;
      if (itinerary.image) {
        if (typeof itinerary.image === 'string') {
          image = itinerary.image;
        } else if (itinerary.image.$binary) {
          image = itinerary.image.$binary.base64;
        }
      }

      return {
        _id: itinerary._id.$oid || itinerary._id,
        user_id: itinerary.user_id,
        name: itinerary.name,
        description: itinerary.description,
        waypoints: itinerary.waypoints,
        upload_datetime: itinerary.upload_datetime,
        last_modified: itinerary.last_modified,
        num_views: itinerary.num_views.$numberInt || itinerary.num_views,
        likes: itinerary.likes,
        image: image,
        image_format: itinerary.image_format,
        deleted: itinerary.deleted
      };
    });

    await db.itineraries.bulkPut(mappedItineraries);
    console.log('[Service worker] IndexedDB: Updated with itineraries received from synchronization');
  } catch (error) {
    console.log(`[Service worker] Error updating IndexedDB with itineraries: ${error}`);
  }
}


// Function to synchronize itineraries with the server
async function syncItineraries() {
  console.log("[Service worker] Attempting synchronization...");
  try {
    const lastSyncTime = await getLastSyncTime();
    const response = await fetch('/api/sync-itineraries?lastSyncTime=' + encodeURIComponent(lastSyncTime));
    const itineraries = await response.json();
    console.log("[Service worker] Itineraries received from synchronization:", itineraries);
    await saveItinerariesToLocalDatabase(itineraries);
  } catch (error) {
    console.error('Failed to sync itineraries:', error);
  }
}


/* Listens for messages from the main thread. If it's a 'sync-itineraries' message, triggers itinerary synchronization.
   For 'LOGIN_STATUS' messages, updates 'isUserLoggedIn' and manages synchronization timers accordingly. */
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'sync-itineraries') {
    syncItineraries();
  } else if (event.data && event.data.type === 'LOGIN_STATUS') {
    isUserLoggedIn = event.data.isLoggedIn;

    if (isUserLoggedIn) {
      startSyncTimer();
    } else {
      stopSyncTimer();

      clearIndexedDB();
    }
  }
});

/* Function to start the synchronization timer.
   Initiates a timer to periodically synchronize itineraries if the user is logged in. */
function startSyncTimer() {
  if (!syncTimer) {
    syncTimer = setInterval(() => {
      if (isUserLoggedIn) {
        syncItineraries();
      }
    }, 60000); // Synchronize itineraries every 60 seconds.
  }
}

/* Function to stop the synchronization timer.
   Clears the synchronization timer and sets it to null. */
function stopSyncTimer() {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
}


/* Function to clear data from IndexedDB, primarily used when the user logs out.
   This ensures that locally saved itineraries are removed, allowing for a clean slate
   when a different user logs in, and synchronization starts anew with the correct personal itineraries. */
async function clearIndexedDB() {
  try {
    await db.itineraries.clear();
    console.log('[Service worker] IndexedDB: Data successfully deleted.');
  } catch (error) {
    console.error('[Service worker] Error while deleting data from IndexedDB:', error);
  }
}
