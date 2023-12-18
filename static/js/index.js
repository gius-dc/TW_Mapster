/* This script is included in the Flask 'index.html' template. It manages interactions on the homepage 
   that features a search bar with filters and displays recent itineraries or welcome page. */

document.addEventListener("DOMContentLoaded", function () {
    // Initialize DOM elements for search functionality.
    var searchInput = document.querySelector(".form-control");
    var searchButton = document.getElementById("button-search");
    var mostViewedRadio = document.getElementById("most-viewed-radio");
    var mostLikedRadio = document.getElementById("most-liked-radio");
    
    if (searchButton) {
        var originalSearchButtonColor = window.getComputedStyle(searchButton).backgroundColor;

        // Event listener for the search button click and enter key press in the search input.
        searchButton.addEventListener("click", performSearch);
        searchInput.addEventListener("keyup", function (event) {
            if (event.key === "Enter") {
                performSearch();
            }
        });
    }



    // Function to perform search based on input and selected filters.
    function performSearch() {
        var searchText = searchInput.value;
        var mostViewedChecked = mostViewedRadio.checked;
        var mostLikedChecked = mostLikedRadio.checked;

        if (!searchText && !mostViewedChecked && !mostLikedChecked) {
            alert("Enter a search term or select at least one sorting option.");
            return;
        }

        // Store search criteria in session storage and construct the search URL.
        sessionStorage.setItem("mostViewedChecked", mostViewedChecked);
        sessionStorage.setItem("mostLikedChecked", mostLikedChecked);
        sessionStorage.setItem("searchText", searchText);

        var searchUrl = '/search?q=' + encodeURIComponent(searchText) +
            '&filters=' + JSON.stringify({ mostViewed: mostViewedChecked, mostLiked: mostLikedChecked });

        window.location.href = searchUrl;

        searchButton.style.backgroundColor = "#165bb0";
        setTimeout(function () {
            searchButton.style.backgroundColor = originalSearchButtonColor;
        }, 1000);
    }

    // Repopulate search criteria from session storage if returning from a search.
    var urlSearchParams = new URLSearchParams(window.location.search);
    if (urlSearchParams.has('q') || urlSearchParams.has('filters')) {
        var savedMostViewedChecked = sessionStorage.getItem("mostViewedChecked");
        var savedMostLikedChecked = sessionStorage.getItem("mostLikedChecked");
        if (savedMostViewedChecked !== null) {
            mostViewedRadio.checked = savedMostViewedChecked === "true";
        }
        if (savedMostLikedChecked !== null) {
            mostLikedRadio.checked = savedMostLikedChecked === "true";
        }

        var savedSearchText = sessionStorage.getItem("searchText");
        if (savedSearchText) {
            searchInput.value = savedSearchText;
        }

        // Update page title and search results title based on the search criteria.
        var resultTitle = document.querySelector(".mb-4.text-center");
        if (resultTitle) {
            var searchResultText = savedSearchText ? `Search results for "${savedSearchText}"` : 'Recent Itineraries';

            if (!savedSearchText && (savedMostViewedChecked === "true" || savedMostLikedChecked === "true")) {
                searchResultText = `Search results for ${savedMostViewedChecked === "true" ? 'Most viewed' : 'Most liked'} itineraries`;
            }

            resultTitle.innerHTML = searchResultText;

            document.title = `MapMingle - ${searchResultText}`;
        }
    }
});


