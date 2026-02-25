// CATEGORY FORM VALIDATION

// HELPER FUNCTIONS

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

function validateCategoryName(value) {
    const result = validateString(value, 3, 50, 'Category name');
    
    if (!result.valid) {
        return result;
    }
    
    // Check for valid characters (letters, numbers, spaces only)
    if (!/^[a-zA-Z0-9\s]+$/.test(result.value)) {
        return { valid: false, message: 'Category name can only contain letters, numbers, and spaces' };
    }
    
    return result;
}

function validateNumeric(value, fieldName, minValue = 0) {
    const num = Number(value);
    
    if (isNaN(num)) {
        return { valid: false, message: `${fieldName} must be a valid number` };
    }
    
    if (num < minValue) {
        return { valid: false, message: `${fieldName} must be at least ${minValue}` };
    }
    
    return { valid: true, value: num };
}

function validateInteger(value, fieldName, minValue = 0, maxValue = null) {
    const num = Number(value);
    
    if (isNaN(num) || !Number.isInteger(num)) {
        return { valid: false, message: `${fieldName} must be a valid integer` };
    }
    
    if (num < minValue) {
        return { valid: false, message: `${fieldName} must be at least ${minValue}` };
    }
    
    if (maxValue !== null && num > maxValue) {
        return { valid: false, message: `${fieldName} must not exceed ${maxValue}` };
    }
    
    return { valid: true, value: num };
}

function showError(input, message) {
    // Add error class to input
    input.classList.add('border-red-500', 'bg-red-50');
    input.classList.remove('border-gray-300');
    
    // Find or create error message element
    let errorElement = input.parentElement.querySelector('.error-message');
    if (!errorElement) {
        errorElement = document.createElement('p');
        errorElement.className = 'error-message text-xs text-red-600 mt-1';
        input.parentElement.appendChild(errorElement);
    }
    
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
}

function clearError(input) {
    input.classList.remove('border-red-500', 'bg-red-50');
    input.classList.add('border-gray-300');
    
    const errorElement = input.parentElement.querySelector('.error-message');
    if (errorElement) {
        errorElement.classList.add('hidden');
    }
}

function scrollToFirstError() {
    const firstError = document.querySelector('.border-red-500');
    if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstError.focus();
    }
}

function disableSubmitButton(button, disabled) {
    if (disabled) {
        button.disabled = true;
        button.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        button.disabled = false;
        button.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

// FIELD VALIDATION

function validateCategoryNameField() {
    const input = document.querySelector('input[name="name"]');
    if (!input) return true;
    
    const result = validateCategoryName(input.value);
    
    if (!result.valid) {
        showError(input, result.message);
        return false;
    }
    
    clearError(input);
    return true;
}

function validateDescriptionField() {
    const input = document.querySelector('textarea[name="description"]');
    if (!input) return true;
    
    const result = validateString(input.value, 10, 500, 'Description');
    
    if (!result.valid) {
        showError(input, result.message);
        return false;
    }
    
    clearError(input);
    return true;
}

function validateOfferFields() {
    const offerTypeInput = document.getElementById('offerType');
    const offerValueInput = document.getElementById('offerValue');
    
    if (!offerTypeInput || !offerValueInput) return true;
    
    const offerType = offerTypeInput.value;
    const offerValue = offerValueInput.value;
    
    // Clear any existing errors
    clearError(offerValueInput);
    
    // If "No Offer" is selected
    if (offerType === 'none') {
        // Offer value must be 0
        if (offerValue !== '0' && offerValue !== '') {
            offerValueInput.value = '0';
        }
        return true;
    }
    
    // If "Percentage" is selected
    if (offerType === 'percentage') {
        const result = validateInteger(offerValue, 'Offer value', 1, 90);
        
        if (!result.valid) {
            showError(offerValueInput, result.message);
            return false;
        }
        
        clearError(offerValueInput);
        return true;
    }
    
    // If "Flat" is selected
    if (offerType === 'flat') {
        const result = validateNumeric(offerValue, 'Offer value', 0.01);
        
        if (!result.valid) {
            showError(offerValueInput, result.message);
            return false;
        }
        
        clearError(offerValueInput);
        return true;
    }
    
    return true;
}

// FORM VALIDATION

function validateCategoryForm() {
    let isValid = true;
    
    // Validate all fields
    if (!validateCategoryNameField()) isValid = false;
    if (!validateDescriptionField()) isValid = false;
    if (!validateOfferFields()) isValid = false;
    
    return isValid;
}

function handleFormSubmit(event) {
    // ALWAYS prevent default first
    event.preventDefault();
    event.stopPropagation();
    
    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    
    // Disable submit button
    disableSubmitButton(submitButton, true);
    
    // Validate form
    const isValid = validateCategoryForm();
    
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
            confirmButtonColor: '#1f2937',
            confirmButtonText: 'Fix Errors'
        });
        
        return false;
    }
    
    // If validation passes, call the custom submit function if available
    // This ensures proper form submission for both add and edit forms
    if (typeof window.submitCategoryForm === 'function') {
        window.submitCategoryForm();
    } else {
        // Fallback to default form submission
        disableSubmitButton(submitButton, false);
        event.target.submit();
    }
}

// OFFER TYPE HANDLING

function handleOfferTypeChange() {
    const offerTypeInput = document.getElementById('offerType');
    const offerValueInput = document.getElementById('offerValue');
    
    if (!offerTypeInput || !offerValueInput) return;
    
    const offerType = offerTypeInput.value;
    
    // Clear any existing errors
    clearError(offerValueInput);
    
    if (offerType === 'none') {
        // Disable and set to 0
        offerValueInput.value = '0';
        offerValueInput.disabled = true;
        offerValueInput.classList.add('bg-gray-100', 'cursor-not-allowed');
    } else {
        // Enable input
        offerValueInput.disabled = false;
        offerValueInput.classList.remove('bg-gray-100', 'cursor-not-allowed');
        
        // Set placeholder based on type
        if (offerType === 'percentage') {
            offerValueInput.placeholder = 'Enter percentage (1-90)';
            offerValueInput.min = '1';
            offerValueInput.max = '90';
            offerValueInput.step = '1';
        } else if (offerType === 'flat') {
            offerValueInput.placeholder = 'Enter amount';
            offerValueInput.min = '0.01';
            offerValueInput.max = '';
            offerValueInput.step = '0.01';
        }
    }
}

// REAL-TIME VALIDATION

function setupRealTimeValidation() {
    // Category name
    const nameInput = document.querySelector('input[name="name"]');
    if (nameInput) {
        nameInput.addEventListener('blur', validateCategoryNameField);
        nameInput.addEventListener('input', () => {
            if (nameInput.classList.contains('border-red-500')) {
                validateCategoryNameField();
            }
        });
    }
    
    // Description
    const descriptionInput = document.querySelector('textarea[name="description"]');
    if (descriptionInput) {
        descriptionInput.addEventListener('blur', validateDescriptionField);
        descriptionInput.addEventListener('input', () => {
            if (descriptionInput.classList.contains('border-red-500')) {
                validateDescriptionField();
            }
        });
    }
    
    // Offer type
    const offerTypeInput = document.getElementById('offerType');
    if (offerTypeInput) {
        offerTypeInput.addEventListener('change', () => {
            handleOfferTypeChange();
            validateOfferFields();
        });
    }
    
    // Offer value
    const offerValueInput = document.getElementById('offerValue');
    if (offerValueInput) {
        offerValueInput.addEventListener('blur', validateOfferFields);
        offerValueInput.addEventListener('input', () => {
            if (offerValueInput.classList.contains('border-red-500')) {
                validateOfferFields();
            }
        });
    }
}

// INITIALIZATION

document.addEventListener('DOMContentLoaded', function() {
    // Setup form submit handler
    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
    
    // Setup real-time validation
    setupRealTimeValidation();
    
    // Initialize offer type state
    handleOfferTypeChange();
});
