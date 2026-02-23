// ============================================
// ADDRESS FORM VALIDATION
// ============================================

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Validate string field
 */
function validateString(value, minLength, maxLength, fieldName) {
    const trimmed = value.trim();
    
    if (!trimmed) {
        return { valid: false, message: `${fieldName} is required` };
    }
    
    if (trimmed.length < minLength) {
        return { valid: false, message: `${fieldName} must be at least ${minLength} characters` };
    }
    
    if (trimmed.length > maxLength) {
        return { valid: false, message: `${fieldName} must not exceed ${maxLength} characters` };
    }
    
    // Check if only whitespace
    if (!/\S/.test(trimmed)) {
        return { valid: false, message: `${fieldName} cannot be only whitespace` };
    }
    
    return { valid: true, value: trimmed };
}

/**
 * Validate name field (letters and spaces only)
 */
function validateName(value, fieldName) {
    const result = validateString(value, 2, 50, fieldName);
    
    if (!result.valid) {
        return result;
    }
    
    // Check for valid characters (letters and spaces only)
    if (!/^[a-zA-Z\s]+$/.test(result.value)) {
        return { valid: false, message: `${fieldName} can only contain letters and spaces` };
    }
    
    return result;
}

/**
 * Validate street address
 */
function validateStreetAddress(value) {
    const result = validateString(value, 10, 200, 'Street address');
    
    if (!result.valid) {
        return result;
    }
    
    // Check for valid characters (letters, numbers, commas, hyphens, spaces)
    if (!/^[a-zA-Z0-9\s,\-]+$/.test(result.value)) {
        return { valid: false, message: 'Street address can only contain letters, numbers, commas, and hyphens' };
    }
    
    return result;
}

/**
 * Validate Indian pin code
 */
function validatePinCode(value) {
    const trimmed = value.trim();
    
    if (!trimmed) {
        return { valid: false, message: 'Pin code is required' };
    }
    
    // Check if exactly 6 digits
    if (!/^\d{6}$/.test(trimmed)) {
        return { valid: false, message: 'Pin code must be exactly 6 digits' };
    }
    
    // Check if starts with 1-9 (Indian pin codes don't start with 0)
    if (!/^[1-9][0-9]{5}$/.test(trimmed)) {
        return { valid: false, message: 'Invalid pin code format' };
    }
    
    return { valid: true, value: trimmed };
}

/**
 * Validate Indian mobile number
 */
function validatePhone(value, fieldName = 'Phone number') {
    const trimmed = value.trim();
    
    if (!trimmed) {
        return { valid: false, message: `${fieldName} is required` };
    }
    
    // Check if exactly 10 digits
    if (!/^\d{10}$/.test(trimmed)) {
        return { valid: false, message: `${fieldName} must be exactly 10 digits` };
    }
    
    // Check if starts with 6-9 (Indian mobile numbers)
    if (!/^[6-9][0-9]{9}$/.test(trimmed)) {
        return { valid: false, message: `${fieldName} must start with 6, 7, 8, or 9` };
    }
    
    return { valid: true, value: trimmed };
}

/**
 * Show error message
 */
function showError(input, message) {
    // Add error class to input
    input.classList.add('border-red-500', 'bg-red-900', 'bg-opacity-20');
    input.classList.remove('border-gray-700');
    
    // Find or create error message element
    let errorElement = input.parentElement.querySelector('.error-message');
    if (!errorElement) {
        errorElement = document.createElement('p');
        errorElement.className = 'error-message text-xs text-red-500 mt-1';
        
        // Insert after the input or after the hint text if it exists
        const hintElement = input.parentElement.querySelector('.text-gray-500');
        if (hintElement) {
            hintElement.parentElement.insertBefore(errorElement, hintElement.nextSibling);
        } else {
            input.parentElement.appendChild(errorElement);
        }
    }
    
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
}

/**
 * Clear error message
 */
function clearError(input) {
    input.classList.remove('border-red-500', 'bg-red-900', 'bg-opacity-20');
    input.classList.add('border-gray-700');
    
    const errorElement = input.parentElement.querySelector('.error-message');
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
 * Restrict input to digits only
 */
function restrictToDigits(input) {
    input.addEventListener('input', function(e) {
        this.value = this.value.replace(/\D/g, '');
    });
    
    input.addEventListener('keypress', function(e) {
        if (!/\d/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
            e.preventDefault();
        }
    });
}

// ============================================
// FIELD VALIDATION
// ============================================

/**
 * Validate address type field
 */
function validateAddressTypeField(formId) {
    const input = document.querySelector(`#${formId} select[name="addressType"]`);
    if (!input) return true;
    
    if (!input.value) {
        showError(input, 'Address type is required');
        return false;
    }
    
    clearError(input);
    return true;
}

/**
 * Validate full name field
 */
function validateFullNameField(formId) {
    const input = document.querySelector(`#${formId} input[name="name"]`);
    if (!input) return true;
    
    const result = validateName(input.value, 'Full name');
    
    if (!result.valid) {
        showError(input, result.message);
        return false;
    }
    
    // Auto-trim
    input.value = result.value;
    clearError(input);
    return true;
}

/**
 * Validate street address field
 */
function validateStreetAddressField(formId) {
    const input = document.querySelector(`#${formId} textarea[name="streetAddress"]`);
    if (!input) return true;
    
    const result = validateStreetAddress(input.value);
    
    if (!result.valid) {
        showError(input, result.message);
        return false;
    }
    
    // Auto-trim
    input.value = result.value;
    clearError(input);
    return true;
}

/**
 * Validate city field
 */
function validateCityField(formId) {
    const input = document.querySelector(`#${formId} input[name="city"]`);
    if (!input) return true;
    
    const result = validateName(input.value, 'City');
    
    if (!result.valid) {
        showError(input, result.message);
        return false;
    }
    
    // Auto-trim
    input.value = result.value;
    clearError(input);
    return true;
}

/**
 * Validate state field
 */
function validateStateField(formId) {
    const input = document.querySelector(`#${formId} input[name="state"]`);
    if (!input) return true;
    
    const result = validateName(input.value, 'State');
    
    if (!result.valid) {
        showError(input, result.message);
        return false;
    }
    
    // Auto-trim
    input.value = result.value;
    clearError(input);
    return true;
}

/**
 * Validate pin code field
 */
function validatePinCodeField(formId) {
    const input = document.querySelector(`#${formId} input[name="pinCode"]`);
    if (!input) return true;
    
    const result = validatePinCode(input.value);
    
    if (!result.valid) {
        showError(input, result.message);
        return false;
    }
    
    clearError(input);
    return true;
}

/**
 * Validate phone number field
 */
function validatePhoneField(formId) {
    const input = document.querySelector(`#${formId} input[name="phone"]`);
    if (!input) return true;
    
    const result = validatePhone(input.value, 'Phone number');
    
    if (!result.valid) {
        showError(input, result.message);
        return false;
    }
    
    clearError(input);
    return true;
}

/**
 * Validate alternate phone field
 */
function validateAltPhoneField(formId) {
    const altPhoneInput = document.querySelector(`#${formId} input[name="altPhone"]`);
    const phoneInput = document.querySelector(`#${formId} input[name="phone"]`);
    
    if (!altPhoneInput) return true;
    
    // Alternate phone is optional
    if (!altPhoneInput.value.trim()) {
        clearError(altPhoneInput);
        return true;
    }
    
    const result = validatePhone(altPhoneInput.value, 'Alternate phone');
    
    if (!result.valid) {
        showError(altPhoneInput, result.message);
        return false;
    }
    
    // Check if alternate phone is same as primary phone
    if (phoneInput && altPhoneInput.value.trim() === phoneInput.value.trim()) {
        showError(altPhoneInput, 'Alternate phone cannot be same as primary phone');
        return false;
    }
    
    clearError(altPhoneInput);
    return true;
}

// ============================================
// FORM VALIDATION
// ============================================

/**
 * Validate entire address form
 */
function validateAddressForm(formId) {
    let isValid = true;
    
    // Validate all fields
    if (!validateAddressTypeField(formId)) isValid = false;
    if (!validateFullNameField(formId)) isValid = false;
    if (!validateStreetAddressField(formId)) isValid = false;
    if (!validateCityField(formId)) isValid = false;
    if (!validateStateField(formId)) isValid = false;
    if (!validatePinCodeField(formId)) isValid = false;
    if (!validatePhoneField(formId)) isValid = false;
    if (!validateAltPhoneField(formId)) isValid = false;
    
    return isValid;
}

/**
 * Handle form submission
 */
function handleAddressFormSubmit(event, formId) {
    // ALWAYS prevent default first
    event.preventDefault();
    event.stopPropagation();
    
    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    
    // Disable submit button
    disableSubmitButton(submitButton, true);
    
    // Validate form
    const isValid = validateAddressForm(formId);
    
    if (!isValid) {
        // Re-enable submit button
        disableSubmitButton(submitButton, false);
        
        // Scroll to first error
        scrollToFirstError();
        
        // Show validation error alert
        Swal.fire({
            icon: 'error',
            title: 'Validation Failed',
            text: 'Please fix the errors in the form before submitting',
            confirmButtonColor: '#10b981',
            confirmButtonText: 'Fix Errors'
        });
        
        return false;
    }
    
    // If validation passes, re-enable button and proceed with submission
    disableSubmitButton(submitButton, false);
    
    return true;
}

// ============================================
// REAL-TIME VALIDATION
// ============================================

/**
 * Setup real-time validation listeners
 */
function setupRealTimeValidation(formId) {
    // Address type
    const addressTypeInput = document.querySelector(`#${formId} select[name="addressType"]`);
    if (addressTypeInput) {
        addressTypeInput.addEventListener('change', () => validateAddressTypeField(formId));
    }
    
    // Full name
    const nameInput = document.querySelector(`#${formId} input[name="name"]`);
    if (nameInput) {
        nameInput.addEventListener('blur', () => validateFullNameField(formId));
        nameInput.addEventListener('input', () => {
            if (nameInput.classList.contains('border-red-500')) {
                validateFullNameField(formId);
            }
        });
    }
    
    // Street address
    const streetInput = document.querySelector(`#${formId} textarea[name="streetAddress"]`);
    if (streetInput) {
        streetInput.addEventListener('blur', () => validateStreetAddressField(formId));
        streetInput.addEventListener('input', () => {
            if (streetInput.classList.contains('border-red-500')) {
                validateStreetAddressField(formId);
            }
        });
    }
    
    // City
    const cityInput = document.querySelector(`#${formId} input[name="city"]`);
    if (cityInput) {
        cityInput.addEventListener('blur', () => validateCityField(formId));
        cityInput.addEventListener('input', () => {
            if (cityInput.classList.contains('border-red-500')) {
                validateCityField(formId);
            }
        });
    }
    
    // State
    const stateInput = document.querySelector(`#${formId} input[name="state"]`);
    if (stateInput) {
        stateInput.addEventListener('blur', () => validateStateField(formId));
        stateInput.addEventListener('input', () => {
            if (stateInput.classList.contains('border-red-500')) {
                validateStateField(formId);
            }
        });
    }
    
    // Pin code
    const pinCodeInput = document.querySelector(`#${formId} input[name="pinCode"]`);
    if (pinCodeInput) {
        restrictToDigits(pinCodeInput);
        pinCodeInput.addEventListener('blur', () => validatePinCodeField(formId));
        pinCodeInput.addEventListener('input', () => {
            if (pinCodeInput.classList.contains('border-red-500')) {
                validatePinCodeField(formId);
            }
        });
    }
    
    // Phone
    const phoneInput = document.querySelector(`#${formId} input[name="phone"]`);
    if (phoneInput) {
        restrictToDigits(phoneInput);
        phoneInput.addEventListener('blur', () => {
            validatePhoneField(formId);
            // Re-validate alt phone when primary phone changes
            validateAltPhoneField(formId);
        });
        phoneInput.addEventListener('input', () => {
            if (phoneInput.classList.contains('border-red-500')) {
                validatePhoneField(formId);
            }
        });
    }
    
    // Alternate phone
    const altPhoneInput = document.querySelector(`#${formId} input[name="altPhone"]`);
    if (altPhoneInput) {
        restrictToDigits(altPhoneInput);
        altPhoneInput.addEventListener('blur', () => validateAltPhoneField(formId));
        altPhoneInput.addEventListener('input', () => {
            if (altPhoneInput.classList.contains('border-red-500')) {
                validateAltPhoneField(formId);
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
    // Setup validation for add address form
    const addForm = document.getElementById('addAddressForm');
    if (addForm) {
        // Store reference to original submit handler
        const originalAddHandler = addForm.onsubmit;
        
        // Remove any existing handlers
        addForm.onsubmit = null;
        const oldListeners = addForm.cloneNode(true);
        addForm.parentNode.replaceChild(oldListeners, addForm);
        const newAddForm = document.getElementById('addAddressForm');
        
        // Add new validation handler with highest priority
        newAddForm.addEventListener('submit', async function(e) {
            const isValid = handleAddressFormSubmit(e, 'addAddressForm');
            if (!isValid) {
                return false;
            }
            
            // If validation passes, manually trigger the submission logic
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);

            try {
                const response = await fetch('/address/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (result.success) {
                    await Swal.fire({
                        icon: 'success',
                        title: 'Address Added!',
                        text: result.message,
                        confirmButtonColor: '#10b981',
                        confirmButtonText: 'OK'
                    });
                    location.reload();
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: result.message,
                        confirmButtonColor: '#ef4444'
                    });
                }
            } catch (error) {
                console.error('Error:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to add address',
                    confirmButtonColor: '#ef4444'
                });
            }
        }, true); // Use capture phase
        
        setupRealTimeValidation('addAddressForm');
    }
    
    // Setup validation for edit address form
    const editForm = document.getElementById('editAddressForm');
    if (editForm) {
        // Store reference to original submit handler
        const originalEditHandler = editForm.onsubmit;
        
        // Remove any existing handlers
        editForm.onsubmit = null;
        const oldListeners = editForm.cloneNode(true);
        editForm.parentNode.replaceChild(oldListeners, editForm);
        const newEditForm = document.getElementById('editAddressForm');
        
        // Add new validation handler with highest priority
        newEditForm.addEventListener('submit', async function(e) {
            const isValid = handleAddressFormSubmit(e, 'editAddressForm');
            if (!isValid) {
                return false;
            }
            
            // If validation passes, manually trigger the submission logic
            const addressId = e.target.dataset.addressId;
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            try {
                const response = await fetch(`/address/update/${addressId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    document.getElementById('editAddressModal').classList.add('hidden');
                    await Swal.fire({
                        icon: 'success',
                        title: 'Updated!',
                        text: result.message,
                        confirmButtonColor: '#10b981'
                    });
                    location.reload();
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: result.message,
                        confirmButtonColor: '#ef4444'
                    });
                }
            } catch (error) {
                console.error('Error:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to update address',
                    confirmButtonColor: '#ef4444'
                });
            }
        }, true); // Use capture phase
        
        setupRealTimeValidation('editAddressForm');
    }
});
