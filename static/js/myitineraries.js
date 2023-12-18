// Script for the 'myitineraries' Flask template. Handles user interactions such as deleting, editing, and viewing personal itineraries. 

document.addEventListener('DOMContentLoaded', function () {
    /* Checks for an active service worker and, if present, sends a message to initiate the synchronization of locally saved personal itineraries.
       This ensures that the user's itineraries are synchronized with the server when the 'myitineraries' page is accessed while online.*/
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            action: 'sync-itineraries'
        });
    }

    /* Attaches event listeners to all 'Delete' buttons. On click, confirms itinerary deletion and sends a POST request to delete the itinerary.
       If successful, reloads the page; otherwise, shows an error message.*/
    document.querySelectorAll('.btn-delete').forEach(function (button) {
        button.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            var itineraryId = this.getAttribute('data-itinerary-id');
            var confirmation = confirm('Are you sure you want to delete this itinerary?');

            if (confirmation) {
                fetch('/delete-itinerary', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ itinerary_id: itineraryId })
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            window.location.reload();
                        } else {
                            alert('There was an error deleting the itinerary.');
                        }
                    })
                    .catch((error) => {
                        console.error('Error:', error);
                    });
            }
        });
    });

    // Iterates over all itinerary cards and sets their background images
    var cards = document.querySelectorAll('.itinerary-card-bg');
    cards.forEach(function (card) {
        var bgImage = card.getAttribute('data-bg');
        if (bgImage) {
            card.style.backgroundImage = 'url("' + bgImage + '")';
        }
    });

    // Adds click event listeners to 'Edit' buttons. On click, redirects the user to the edit page for the selected itinerary.
    document.querySelectorAll('.btn-edit').forEach(function (button) {
        button.addEventListener('click', function (e) {
            e.stopPropagation();
            var itineraryId = this.getAttribute('data-itinerary-id');
            window.location.href = '/edit-itinerary/' + itineraryId;
        });
    });

    // Assigns event listeners to each itinerary card. Clicking on a card navigates the user to the respective itinerary's view page
    document.querySelectorAll('.card').forEach(function (card) {
        card.addEventListener('click', function () {
            var itineraryId = this.querySelector('.btn-edit').getAttribute('data-itinerary-id');
            window.location.href = '/view-itinerary/' + itineraryId;
        });
    });
});
