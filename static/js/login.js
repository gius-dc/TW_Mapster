// This script is included in the Flask 'login.html' template for managing the login form.

document.addEventListener('DOMContentLoaded', function () {
    // Attaches a 'submit' event listener to the login form.
    document.getElementById('login-form').addEventListener('submit', function (event) {
        var form = this;
        // Checks the form for validity. If invalid, prevents submission and highlights invalid fields.
        if (!form.checkValidity()) {
            event.preventDefault();
            event.stopPropagation();
        }
        Array.from(form.elements).forEach(input => {
            if (input.type !== "checkbox" && !input.checkValidity()) {
                input.classList.add('is-invalid');
            }
        });
    });

    // Adds 'input' event listeners to text and password inputs for real-time validation.
    Array.from(document.querySelectorAll('#login-form input[type="text"], #login-form input[type="password"]')).forEach(input => {
        input.addEventListener('input', function () {
            if (input.validity.valid) {
                input.classList.remove('is-invalid');
                input.nextElementSibling.style.display = 'none';
            } else {
                input.classList.add('is-invalid');
                input.nextElementSibling.style.display = 'block';
            }
        });
    });
});
