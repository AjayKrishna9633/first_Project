document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("adminLoginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const errorEmail = document.getElementById('emailError');
  const errorPassword = document.getElementById('passwordError');

  // Helper function to show error
  function showError(errorElement, message) {
    if (errorElement) {
      errorElement.classList.remove('hidden');
      errorElement.querySelector('span').textContent = message;
    }
  }

  // Helper function to hide error
  function hideError(errorElement) {
    if (errorElement) {
      errorElement.classList.add('hidden');
      errorElement.querySelector('span').textContent = '';
    }
  }

  // Clear errors on input
  emailInput.addEventListener('input', () => hideError(errorEmail));
  passwordInput.addEventListener('input', () => hideError(errorPassword));

  // Form validation
  form.addEventListener("submit", (e) => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    let isValid = true;

    // Clear all errors
    hideError(errorEmail);
    hideError(errorPassword);

    // Email validation
    if (!email) {
      isValid = false;
      showError(errorEmail, "Please enter your email");
    } else {
      const emailRegex = /^[a-zA-Z0-9_+]+@[a-z0-9.-]+\.[a-z]{2,}$/;
      if (!emailRegex.test(email)) {
        isValid = false;
        showError(errorEmail, "Please enter a valid email");
      }
    }

    // Password validation
    if (!password) {
      isValid = false;
      showError(errorPassword, "Please enter your password");
    }

    // Prevent submission if invalid
    if (!isValid) {
      e.preventDefault();
    }
  });
});
