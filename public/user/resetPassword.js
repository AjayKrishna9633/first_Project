function togglePassword(fieldId) {
    const field = document.getElementById(fieldId);
    const icon = document.getElementById(fieldId + '-icon');
    
    if (field.type === 'password') {
        field.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        field.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Password validation
function validatePassword(password) {
    const minLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    
    return minLength && hasUpper && hasLower && hasNumber;
}

// Form submission
document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    document.querySelectorAll('[id$="-error"]').forEach(el => {
        el.classList.add('hidden');
        el.textContent = '';
    });

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validation
    let hasError = false;

    if (!currentPassword) {
        showError('currentPassword', 'Current password is required');
        hasError = true;
    }

    if (!validatePassword(newPassword)) {
        showError('newPassword', 'Password must be at least 8 characters with uppercase, lowercase, and number');
        hasError = true;
    }

    if (newPassword !== confirmPassword) {
        showError('confirmPassword', 'Passwords do not match');
        hasError = true;
    }

    if (currentPassword === newPassword) {
        showError('newPassword', 'New password must be different from current password');
        hasError = true;
    }

    if (hasError) return;

    // Submit form
    try {
        const response = await fetch('/changePassword', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        const data = await response.json();

        if (data.success) {
            await Swal.fire({
                icon: 'success',
                title: 'Password Updated!',
                text: 'Your password has been changed successfully',
                confirmButtonColor: '#10b981',
                confirmButtonText: 'OK',
                customClass: {
                    confirmButton: 'swal-button-success'
                }
            });
            window.location.href = '/profile';
        } else {
            showError('currentPassword', data.message || 'Failed to update password');
        }
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Something went wrong. Please try again.',
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Try Again',
            customClass: {
                confirmButton: 'swal-button-error'
            }
        });
    }
});

function showError(fieldId, message) {
    const errorEl = document.getElementById(fieldId + '-error');
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
}
