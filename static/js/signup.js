// This script is included in the Flask 'signup.html' template for managing the signup form.

document.addEventListener('DOMContentLoaded', function() {
    const signupForm = document.getElementById('signup-form');

    // Resets validation states when the page loads. 
    Array.from(signupForm.querySelectorAll('input[type="text"], input[type="password"]')).forEach(input => {
        input.classList.remove('is-invalid');
        input.nextElementSibling.style.display = 'none';
    });

    /* Attaches a 'submit' event listener to the signup form. Checks each input for validity;
       if any input is invalid, prevents form submission and shows appropriate validation feedback. */
    signupForm.addEventListener('submit', function(event) {
        let isFormValid = true;

        Array.from(this.elements).forEach(input => {
            if (!input.checkValidity()) {
                isFormValid = false;
                input.classList.add('is-invalid');
                input.nextElementSibling.style.display = 'block';
            }
        });

        if (!isFormValid) {
            event.preventDefault();
            event.stopPropagation();
        }
    });

    // Adds 'input' event listeners to text and password inputs. Provides real-time validation feedback as the user types
    Array.from(signupForm.querySelectorAll('input[type="text"], input[type="password"]')).forEach(input => {
        input.addEventListener('input', function() {
            if (this.validity.valid) {
                this.classList.remove('is-invalid');
                this.nextElementSibling.style.display = 'none';
            } else {
                this.classList.add('is-invalid');
                this.nextElementSibling.style.display = 'block';
            }
        });
    });
});
