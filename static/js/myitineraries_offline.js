/* This script is used for the 'myitineraries_offline.html' page. It handles reading offline-synchronized itineraries
   from a local database and dynamically displaying them on the page. The script leverages Dexie.js to interact with the
   IndexedDB where the itineraries are stored. */


// Initializes a Dexie database named 'ItinerariesDatabase'
const db = new Dexie('ItinerariesDatabase');
db.version(1).stores({ itineraries: '_id' });
db.open();

/* Asynchronously retrieves all itineraries stored in the local database.
   Returns an array of itinerary objects or an empty array if an error occurs during retrieval. */
async function getLocalItineraries() {
  try {
    const itineraries = await db.itineraries.toArray();
    return itineraries;
  } catch (error) {
    console.error('Failed to get local itineraries:', error);
    return [];
  }
}

/* Asynchronously fetches local itineraries and populates them into the 'itinerary-container' element of the webpage.
   Each itinerary is displayed as a card, similar to the online version in 'myitineraries.html', where they are rendered server-side by Flask.
   However, in this offline version, the itinerary cards are dynamically created by JavaScript.
   The cards include the itinerary's image, name, creation date, and description. */
async function populateItineraries() {
  const itineraries = await getLocalItineraries();
  const container = document.querySelector('#itinerary-container');

  if (!container) {
    console.error('Itinerary container not found');
    return;
  }

  let cardHtml = '';

  itineraries.forEach(itinerary => {
    if (itinerary.deleted === 0) {
      cardHtml += `
        <div class="col-md-6 mb-4">
            <div class="card h-100" onclick="window.location.href='view_itinerary_offline.html?itineraryId=${itinerary._id}';" style="cursor: pointer; background-image: url('data:image/${itinerary.image_format};base64,${itinerary.image}');">
                <div class="card-body">
                    <div class="d-flex justify-content-between">
                        <h5 class="card-title mb-0">${itinerary.name}</h5>
                        <span class="date-created">${new Date(itinerary.upload_datetime).toLocaleDateString()}</span>
                    </div>
                    <p class="card-text">${itinerary.description || '<i>No description provided</i>'}</p>
                </div>
                <div class="card-footer" onclick="event.stopPropagation();">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="itinerary-info">
                            <p class="card-text"><i>Go online to view the latest statistics and to edit or remove your itineraries.</i></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    }
  });

  if (cardHtml === '') {
    container.innerHTML = '<div class="d-flex justify-content-center align-items-center" style="height: 200px; color: #616161;">' +
      '<p>No itineraries saved locally...</p>' +
      '</div>';
  } else {
    container.innerHTML = cardHtml;
  }

}

populateItineraries();
