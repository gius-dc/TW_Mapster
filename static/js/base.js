/* This is the 'base.js' file, a common JavaScript script included in the Flask 'base.html' template.
   It provides fundamental functionality for all app pages: service worker management, light/dark theme switching,
   and Progressive Web App (PWA) installation handling. */

document.addEventListener('DOMContentLoaded', function () {
    var themeToggle = document.getElementById('themeToggle');
    var systemThemeCheck = document.getElementById('systemThemeCheck');
    var prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    var installButton = document.getElementById("install-button");

    // Function to apply the selected theme to the UI
    function applyTheme() {
        let isDarkMode = themeToggle.checked;
        document.body.classList.toggle('bg-dark', isDarkMode);
        document.body.classList.toggle('text-white', isDarkMode);

        let navbar = document.querySelector('.navbar');
        navbar.classList.toggle('navbar-dark-custom', isDarkMode);
        navbar.classList.toggle('bg-dark-custom', isDarkMode);
        navbar.classList.toggle('navbar-light', !isDarkMode);
        navbar.classList.toggle('bg-light', !isDarkMode);

        let navbarBrand = document.querySelector('.navbar-brand');
        navbarBrand.classList.toggle('text-white', isDarkMode);

        let navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.classList.toggle('text-white', isDarkMode);
        });

        let dropdownMenus = document.querySelectorAll('.dropdown-menu');
        dropdownMenus.forEach(menu => {
            menu.classList.toggle('dropdown-menu-dark', isDarkMode);
        });

        let navbarTogglerIcon = document.querySelector('.navbar-toggler-icon');
        navbarTogglerIcon.classList.toggle('icon-dark-mode', isDarkMode);

        let loginCard = document.querySelector('.card');
        if (loginCard) {
            loginCard.classList.toggle('bg-dark', isDarkMode);
            loginCard.classList.toggle('text-white', isDarkMode);
            loginCard.querySelectorAll('.form-control').forEach(input => {
                input.classList.toggle('bg-dark', isDarkMode);
                input.classList.toggle('text-white', isDarkMode);
                input.classList.toggle('border-light', isDarkMode);
            });
        }
    }

    // Function to load the saved theme and preferences from local storage
    function loadTheme() {
        let savedTheme = localStorage.getItem('theme');
        let useSystemPreference = localStorage.getItem('useSystemTheme');

        if (useSystemPreference === null) {
            useSystemPreference = 'true';
            localStorage.setItem('useSystemTheme', 'true');
        }

        if (useSystemPreference === 'true') {
            systemThemeCheck.checked = true;
            themeToggle.checked = prefersDarkScheme.matches;
            themeToggle.disabled = true;
        } else {
            systemThemeCheck.checked = false;
            themeToggle.checked = savedTheme === 'dark';
            themeToggle.disabled = false;
        }

        applyTheme();
    }

    /* This function updates theme preferences and stores them in local storage,
       ensuring that the selected theme setting is retained consistently across all pages */
    function updateThemePreferences() {
        localStorage.setItem('theme', themeToggle.checked ? 'dark' : 'light');
        localStorage.setItem('useSystemTheme', systemThemeCheck.checked);
        applyTheme();
    }

    // Event listeners for theme and system theme changes
    themeToggle.addEventListener('change', updateThemePreferences);
    systemThemeCheck.addEventListener('change', function () {
        themeToggle.disabled = this.checked;
        if (this.checked) {
            themeToggle.checked = prefersDarkScheme.matches;
        }
        updateThemePreferences();
    });

    // Event listener for changes in the system's color scheme preference
    prefersDarkScheme.addEventListener('change', function (e) {
        if (systemThemeCheck.checked) {
            themeToggle.checked = e.matches;
            updateThemePreferences();
        }
    });

    // Service worker registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').then(reg => {
                console.log('Service worker registered', reg);

                /* Send login status to the service worker to determine user authentication.
                   The service worker needs this information to decide whether to activate its local route synchronization mechanism.
                   When the user is logged in, the service worker syncs itineraries locally; otherwise, it clears its internal database.
                   The login status is obtained through a dedicated Flask route. */
                if (navigator.onLine) {
                    navigator.serviceWorker.ready.then((registration) => {
                        fetch('/check-login-status')
                            .then(response => response.json())
                            .then(data => {
                                registration.active.postMessage({
                                    type: 'LOGIN_STATUS',
                                    isLoggedIn: data.isLoggedIn
                                });
                            })
                            .catch(error => console.error('Error checking login status:', error));
                    }).catch(err => {
                        console.log('Service worker registration failed: ', err);
                    });
                }
            }).catch(err => {
                console.log('Service worker registration failed: ', err);
            });
        });
    }

    // Event listener for beforeinstallprompt event to handle PWA installation
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (installButton) {
            installButton.style.display = "block";
        }
    });

    // Event listener for the install button to prompt installation
    if (installButton) {
        installButton.addEventListener("click", async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                installButton.style.display = "none";
                deferredPrompt = null;
            }
        });
    }

    // Event listener for appinstalled event to handle installation completion
    window.addEventListener('appinstalled', (e) => {
        if (installButton) {
            installButton.style.display = "none";
        }
    });


    // Load the theme preferences on page load
    loadTheme();
});