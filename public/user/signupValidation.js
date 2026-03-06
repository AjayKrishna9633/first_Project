document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signup");
  const passwordInput = document.getElementById("password");
  const passwordStrengthDiv = document.getElementById("passwordStrength");

  // Real-time error clearing
  document.getElementById("fullName").addEventListener("input", () => {
    clearError('error1');
  });
  
  document.getElementById('email').addEventListener('input', () => {
    clearError('error2');
  });
  
  passwordInput.addEventListener('input', () => {
    clearError('error3');
    checkPasswordStrength(passwordInput.value);
  });
  
  document.getElementById('confirmPassword').addEventListener('input', () => {
    clearError('error4');
  });

  function clearError(errorId) {
    const errorElement = document.getElementById(errorId);
    if (errorElement) {
      errorElement.style.display = "none";
      errorElement.innerHTML = "";
    }
  }

  function clearAllErrors() {
    clearError('error1');
    clearError('error2');
    clearError('error3');
    clearError('error4');
  }

  function showError(errorId, message) {
    const errorElement = document.getElementById(errorId);
    if (errorElement) {
      errorElement.style.display = "block";
      errorElement.innerHTML = message;
    }
  }

  function checkPasswordStrength(password) {
    if (!password) {
      passwordStrengthDiv.style.display = "none";
      return;
    }

    let strength = 0;
    let strengthText = "";
    let strengthClass = "";

    // Length check
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;

    // Character type checks
    if (/[a-z]/.test(password)) strength++; // lowercase
    if (/[A-Z]/.test(password)) strength++; // uppercase
    if (/[0-9]/.test(password)) strength++; // number
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength++; // symbol

    // Determine strength level
    if (strength <= 2) {
      strengthText = "Weak";
      strengthClass = "strength-weak";
    } else if (strength === 3) {
      strengthText = "Fair";
      strengthClass = "strength-fair";
    } else if (strength === 4 || strength === 5) {
      strengthText = "Moderate";
      strengthClass = "strength-moderate";
    } else {
      strengthText = "Strong";
      strengthClass = "strength-strong";
    }

    // Update display
    passwordStrengthDiv.style.display = "block";
    passwordStrengthDiv.textContent = `Password Strength: ${strengthText}`;
    passwordStrengthDiv.className = `text-xs mt-2 ${strengthClass}`;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault(); // Always prevent default first
    
    const fullName = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value.trim();

    clearAllErrors();
    
    let valid = true;

    // Validate Full Name
    if (!fullName) {
      valid = false;
      showError('error1', "Please enter your full name");
    } else if (fullName.length < 3) {
      valid = false;
      showError('error1', "Full name must be at least 3 characters long");
    } else if (!/^[a-zA-Z]/.test(fullName)) {
      valid = false;
      showError('error1', "The name must start with a letter");
    }

    // Validate Email
    if (!email) {
      valid = false;
      showError('error2', "Please enter your email");
    } else {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/;
      if (!emailRegex.test(email)) {
        valid = false;
        showError('error2', "Please enter a valid email");
      }
    }

    // Validate Password
    if (!password) {
      valid = false;
      showError('error3', "Please enter your password");
    } else if (password.length < 8) {
      valid = false;
      showError('error3', "Password must be at least 8 characters long");
    } else if (!/[A-Z]/.test(password)) {
      valid = false;
      showError('error3', "Password must contain at least one uppercase letter");
    } else if (!/[a-z]/.test(password)) {
      valid = false;
      showError('error3', "Password must contain at least one lowercase letter");
    } else if (!/[0-9]/.test(password)) {
      valid = false;
      showError('error3', "Password must contain at least one number");
    } else if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      valid = false;
      showError('error3', "Password must contain at least one symbol (!@#$%^&*...)");
    }

    // Validate Confirm Password
    if (!confirmPassword) {
      valid = false;
      showError('error4', "Please confirm your password");
    } else if (confirmPassword !== password) {
      valid = false;
      showError('error4', "Passwords do not match");
    }

    // Submit form only if valid
    if (valid) {
      form.submit();
    }
  });
});
