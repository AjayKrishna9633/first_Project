// ============================================
// CHANGE PASSWORD FORM VALIDATION
// ============================================

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Validate password strength
 */
function validatePasswordStrength(password) {
    const trimmed = password.trim();
    
    if (!trimmed) {
        return { valid: false, message: 'Password is required' };
    }
    
    if (trimmed.length < 8) {
        return { valid: false, message: 'Password must be at least 8 characters' };
    }
    
    if (trimmed.length > 64) {
        return { valid: false, message: 'Password must not exceed 64 characters' };
    }
    
    // Check for at least one lowercase letter
    if (!/[a-z]/.test(trimmed)) {
        return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }
    
    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(trimmed)) {
        return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    
    // Check for at least one number
    if (!/\d/.test(trimmed)) {
        return { valid: false, message: 'Password must contain at least one number' };
    }
    
    return { valid: true, value: trimmed };
}

/**
 * Show error message
 */
function showError(inputId, message) {
    const input = document.getElementById(inputId);
    const errorElement = document.getElementById(`${inputId}-error`);
    
    if (input) {
        input.classList.add('border-red-500', 'bg-red-900', 'bg-opacity-20');
        input.classList.remove('border-gray-700');
    }
    
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
    }
}

/**
 * Clear error message
 */
function clearError(inputId) {
    const input = document.getElementById(inputId);
    const errorElement = document.getElementById(`${inputId}-error`);
    
    if (input) {
        input.classList.remove('border-red-500', 'bg-red-900', 'bg-opacity-20');
        input.classList.add('border-gray-700');
    }
    
    if (errorElement) {
        errorElement.classList.add('hidden');
    }
}

/**
 * Scroll to first error
 */
function scrollToFirstError() {
    const firstError = document.querySelector('.border-red-500');
    if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstError.focus();
    }
}

/**
 * Disable/enable submit button
 */
function disableSubmitButton(button, disabled) {
    if (disabled) {
        button.disabled = true;
        button.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        button.disabled = false;
        button.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

/**
 * Toggle password visibility
 */
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(`${inputId}-icon`);
    
    if (input && icon) {
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }
}

// Make togglePassword available globally
window.togglePassword = togglePassword;

// ============================================
// FIELD VALIDATION
// ============================================

/**
 * Validate current password field
 */
function validateCurrentPassword() {
    const input = document.getElementById('currentPassword');
    if (!input) return true;
    
    const value = input.value.trim();
    
    if (!value) {
        showError('currentPassword', 'Current password is required');
        return false;
    }
    
    clearError('currentPassword');
    return true;
}

/**
 * Validate new password field
 */
function validateNewPassword() {
    const input = document.getElementById('newPassword');
    const currentPasswordInput = document.getElementById('currentPassword');
    
    if (!input) return true;
    
    const result = validatePasswordStrength(input.value);
    
    if (!result.valid) {
        showError('newPassword', result.message);
        return false;
    }
    
    // Check if new password is same as current password
    if (currentPasswordInput && currentPasswordInput.value.trim() === result.value) {
        showError('newPassword', 'New password must be different from current password');
        return false;
    }
    
    clearError('newPassword');
    
    // Re-validate confirm password if it has a value
    const confirmPasswordInput = document.getElementById('confirmPassword');
    if (confirmPasswordInput && confirmPasswordInput.value) {
        validateConfirmPassword();
    }
    
    return true;
}

/**
 * Validate confirm password field
 */
function validateConfirmPassword() {
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    if (!newPasswordInput || !confirmPasswordInput) return true;
    
    const confirmValue = confirmPasswordInput.value.trim();
    
    if (!confirmValue) {
        showError('confirmPassword', 'Please confirm your new password');
        return false;
    }
    
    const newValue = newPasswordInput.value.trim();
    
    if (confirmValue !== newValue) {
        showError('confirmPassword', 'Passwords do not match');
        return false;
    }
    
    clearError('confirmPassword');
    return true;
}

// ============================================
// FORM VALIDATION
// ============================================

/**
 * Validate entire form
 */
function validateChangePasswordForm() {
    let isValid = true;
    
    // Validate all fields
    if (!validateCurrentPassword()) isValid = false;
    if (!validateNewPassword()) isValid = false;
    if (!validateConfirmPassword()) isValid = false;
    
    return isValid;
}

/**
 * Handle form submission
 */
async function handleFormSubmit(event) {
    // ALWAYS prevent default first
    event.preventDefault();
    event.stopPropagation();
    
    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    
    // Disable submit button
    disableSubmitButton(submitButton, true);
    
    // Validate form
    const isValid = validateChangePasswordForm();
    
    if (!isValid) {
        // Re-enable submit button
        disableSubmitButton(submitButton, false);
        
        // Scroll to first error
        scrollToFirstError();
        
        // Show validation error alert
        Swal.fire({
            icon: 'error',
            title: 'Validation Failed',
            text: 'Please fix the errors before submitting',
            confirmButtonColor: '#10b981',
            confirmButtonText: 'Fix Errors'
        });
        
        return false;
    }
    
    // If validation passes, proceed with submission
    const formData = {
        currentPassword: document.getElementById('currentPassword').value.trim(),
        newPassword: document.getElementById('newPassword').value.trim(),
        confirmPassword: document.getElementById('confirmPassword').value.trim()
    };
    
    try {
        const response = await fetch('/changePassword', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            await Swal.fire({
                icon: 'success',
                title: 'Password Changed!',
                text: result.message || 'Your password has been updated successfully',
                confirmButtonColor: '#10b981'
            });
            
            // Clear form
            document.getElementById('changePasswordForm').reset();
            
            // Redirect to profile or login
            if (result.redirect) {
                window.location.href = result.redirect;
            } else {
                window.location.href = '/profile';
            }
        } else {
            // Re-enable submit button
            disableSubmitButton(submitButton, false);
            
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: result.message || 'Failed to change password',
                confirmButtonColor: '#ef4444'
            });
        }
    } catch (error) {
        console.error('Error:', error);
        
        // Re-enable submit button
        disableSubmitButton(submitButton, false);
        
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'An error occurred. Please try again.',
            confirmButtonColor: '#ef4444'
        });
    }
}

// ============================================
// REAL-TIME VALIDATION
// ============================================

/**
 * Setup real-time validation listeners
 */
function setupRealTimeValidation() {
    // Current password
    const currentPasswordInput = document.getElementById('currentPassword');
    if (currentPasswordInput) {
        currentPasswordInput.addEventListener('blur', validateCurrentPassword);
        currentPasswordInput.addEventListener('input', () => {
            if (currentPasswordInput.classList.contains('border-red-500')) {
                validateCurrentPassword();
            }
            // Re-validate new password when current password changes
            const newPasswordInput = document.getElementById('newPassword');
            if (newPasswordInput && newPasswordInput.value) {
                validateNewPassword();
            }
        });
    }
    
    // New password
    const newPasswordInput = document.getElementById('newPassword');
    if (newPasswordInput) {
        newPasswordInput.addEventListener('blur', validateNewPassword);
        newPasswordInput.addEventListener('input', () => {
            if (newPasswordInput.classList.contains('border-red-500')) {
                validateNewPassword();
            }
        });
    }
    
    // Confirm password
    const confirmPasswordInput = document.getElementById('confirmPassword');
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('blur', validateConfirmPassword);
        confirmPasswordInput.addEventListener('input', () => {
            if (confirmPasswordInput.classList.contains('border-red-500')) {
                validateConfirmPassword();
            }
        });
    }
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize validation on page load
 */
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('changePasswordForm');
    
    if (form) {
        // Add submit event listener
        form.addEventListener('submit', handleFormSubmit, true); // Use capture phase
        
        // Setup real-time validation
        setupRealTimeValidation();
    }
});
