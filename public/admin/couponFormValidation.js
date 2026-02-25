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
    
    return { valid: true, value: trimmed };
}

function validateCouponCode(value) {
    const trimmed = value.trim().toUpperCase();
    
    if (!trimmed) {
        return { valid: false, message: 'Coupon code is required' };
    }
    
    if (trimmed.length < 4) {
        return { valid: false, message: 'Coupon code must be at least 4 characters' };
    }
    
    if (trimmed.length > 20) {
        return { valid: false, message: 'Coupon code must not exceed 20 characters' };
    }
    
    // Check for spaces
    if (/\s/.test(trimmed)) {
        return { valid: false, message: 'Coupon code cannot contain spaces' };
    }
    
    // Check for valid characters (letters and numbers only)
    if (!/^[A-Z0-9]+$/.test(trimmed)) {
        return { valid: false, message: 'Coupon code can only contain letters and numbers' };
    }
    
    return { valid: true, value: trimmed };
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

function validateInteger(value, fieldName, minValue = 1, maxValue = null) {
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

function validateDate(value, fieldName) {
    if (!value) {
        return { valid: false, message: `${fieldName} is required` };
    }
    
    const date = new Date(value);
    
    if (isNaN(date.getTime())) {
        return { valid: false, message: `${fieldName} must be a valid date` };
    }
    
    return { valid: true, value: date };
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

function validateCouponCodeField(formPrefix) {
    const input = document.querySelector(`#${formPrefix}CouponForm input[name="name"]`);
    if (!input) return true;
    
    const result = validateCouponCode(input.value);
    
    if (!result.valid) {
        showError(input, result.message);
        return false;
    }
    
    // Auto-convert to uppercase
    input.value = result.value;
    clearError(input);
    return true;
}

function validateDescriptionField(formPrefix) {
    const input = document.querySelector(`#${formPrefix}CouponForm input[name="description"]`);
    if (!input) return true;
    
    const result = validateString(input.value, 10, 200, 'Description');
    
    if (!result.valid) {
        showError(input, result.message);
        return false;
    }
    
    clearError(input);
    return true;
}

function validateDiscountTypeField(formPrefix) {
    const input = document.querySelector(`#${formPrefix}DiscountType`);
    if (!input) return true;
    
    if (!input.value) {
        showError(input, 'Discount type is required');
        return false;
    }
    
    clearError(input);
    return true;
}

function validateDiscountValueField(formPrefix) {
    const discountTypeInput = document.querySelector(`#${formPrefix}DiscountType`);
    const discountValueInput = document.querySelector(`#${formPrefix}OfferPrice`);
    const minPurchaseInput = document.querySelector(`#${formPrefix}CouponForm input[name="minimumPrice"]`);
    
    if (!discountTypeInput || !discountValueInput) return true;
    
    const discountType = discountTypeInput.value;
    const discountValue = discountValueInput.value;
    
    if (discountType === 'percentage') {
        const result = validateInteger(discountValue, 'Discount percentage', 1, 99);
        
        if (!result.valid) {
            showError(discountValueInput, result.message);
            return false;
        }
        
        // Check if percentage is 100% or more
        if (result.value >= 100) {
            showError(discountValueInput, 'Percentage discount cannot be 100% or more. Maximum allowed is 99%');
            return false;
        }
    } else if (discountType === 'fixed') {
        const result = validateNumeric(discountValue, 'Discount amount', 0.01);
        
        if (!result.valid) {
            showError(discountValueInput, result.message);
            return false;
        }
        
        // Check if fixed discount is less than minimum purchase
        if (minPurchaseInput && minPurchaseInput.value) {
            const minPurchase = Number(minPurchaseInput.value);
            if (result.value >= minPurchase) {
                showError(discountValueInput, 'Fixed discount must be less than minimum purchase amount');
                return false;
            }
        }
    }
    
    clearError(discountValueInput);
    return true;
}

function validateMinPurchaseField(formPrefix) {
    const input = document.querySelector(`#${formPrefix}CouponForm input[name="minimumPrice"]`);
    if (!input) return true;
    
    const result = validateNumeric(input.value, 'Minimum purchase amount', 0);
    
    if (!result.valid) {
        showError(input, result.message);
        return false;
    }
    
    clearError(input);
    return true;
}

function validateMaxDiscountField(formPrefix) {
    const discountTypeInput = document.querySelector(`#${formPrefix}DiscountType`);
    const maxDiscountInput = document.querySelector(`#${formPrefix}CouponForm input[name="maxDiscountAmount"]`);
    
    if (!discountTypeInput || !maxDiscountInput) return true;
    
    const discountType = discountTypeInput.value;
    const maxDiscount = maxDiscountInput.value;
    
    // Max discount is optional for fixed type
    if (discountType === 'fixed' && !maxDiscount) {
        clearError(maxDiscountInput);
        return true;
    }
    
    // Max discount is required for percentage type
    if (discountType === 'percentage' && !maxDiscount) {
        showError(maxDiscountInput, 'Maximum discount is required for percentage discounts');
        return false;
    }
    
    // If provided, validate it
    if (maxDiscount) {
        const result = validateNumeric(maxDiscount, 'Maximum discount', 0.01);
        
        if (!result.valid) {
            showError(maxDiscountInput, result.message);
            return false;
        }
    }
    
    clearError(maxDiscountInput);
    return true;
}

function validateStartDateField(formPrefix) {
    const input = document.querySelector(`#${formPrefix}CouponForm input[name="startDate"]`);
    if (!input) return true;
    
    const result = validateDate(input.value, 'Start date');
    
    if (!result.valid) {
        showError(input, result.message);
        return false;
    }
    
    // Check if start date is today or future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(result.value);
    startDate.setHours(0, 0, 0, 0);
    
    if (startDate < today) {
        showError(input, 'Start date must be today or in the future');
        return false;
    }
    
    clearError(input);
    return true;
}

function validateEndDateField(formPrefix) {
    const startDateInput = document.querySelector(`#${formPrefix}CouponForm input[name="startDate"]`);
    const endDateInput = document.querySelector(`#${formPrefix}CouponForm input[name="endDate"]`);
    
    if (!startDateInput || !endDateInput) return true;
    
    const endResult = validateDate(endDateInput.value, 'End date');
    
    if (!endResult.valid) {
        showError(endDateInput, endResult.message);
        return false;
    }
    
    // Check if end date is after start date
    if (startDateInput.value) {
        const startDate = new Date(startDateInput.value);
        const endDate = new Date(endResult.value);
        
        // Set time to start of day for accurate comparison
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);
        
        if (endDate <= startDate) {
            showError(endDateInput, 'End date must be after start date');
            return false;
        }
    }
    
    clearError(endDateInput);
    return true;
}

function validateUsageLimitField(formPrefix) {
    const input = document.querySelector(`#${formPrefix}CouponForm input[name="usageLimit"]`);
    if (!input) return true;
    
    // Usage limit is optional
    if (!input.value) {
        clearError(input);
        return true;
    }
    
    const result = validateInteger(input.value, 'Usage limit', 1);
    
    if (!result.valid) {
        showError(input, result.message);
        return false;
    }
    
    clearError(input);
    return true;
}

function validateUsagePerUserField(formPrefix) {
    const usagePerUserInput = document.querySelector(`#${formPrefix}CouponForm input[name="usagePerUser"]`);
    const usageLimitInput = document.querySelector(`#${formPrefix}CouponForm input[name="usageLimit"]`);
    
    if (!usagePerUserInput) return true;
    
    const result = validateInteger(usagePerUserInput.value, 'Usage per user', 1);
    
    if (!result.valid) {
        showError(usagePerUserInput, result.message);
        return false;
    }
    
    // Check if usage per user exceeds total usage limit
    if (usageLimitInput && usageLimitInput.value) {
        const usagePerUser = result.value;
        const usageLimit = Number(usageLimitInput.value);
        
        if (usagePerUser > usageLimit) {
            showError(usagePerUserInput, 'Usage per user cannot exceed total usage limit');
            return false;
        }
    }
    
    clearError(usagePerUserInput);
    return true;
}

// FORM VALIDATION

function validateCouponForm(formPrefix) {
    let isValid = true;
    
    // Validate all fields
    if (!validateCouponCodeField(formPrefix)) isValid = false;
    if (!validateDescriptionField(formPrefix)) isValid = false;
    if (!validateDiscountTypeField(formPrefix)) isValid = false;
    if (!validateDiscountValueField(formPrefix)) isValid = false;
    if (!validateMinPurchaseField(formPrefix)) isValid = false;
    if (!validateMaxDiscountField(formPrefix)) isValid = false;
    if (!validateStartDateField(formPrefix)) isValid = false;
    if (!validateEndDateField(formPrefix)) isValid = false;
    if (!validateUsageLimitField(formPrefix)) isValid = false;
    if (!validateUsagePerUserField(formPrefix)) isValid = false;
    
    return isValid;
}

async function handleCouponFormSubmit(event, formPrefix) {
    // ALWAYS prevent default first
    event.preventDefault();
    event.stopPropagation();
    
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    
    // Disable submit button
    disableSubmitButton(submitButton, true);
    
    // Validate form
    const isValid = validateCouponForm(formPrefix);
    
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
            confirmButtonColor: '#4f46e5',
            confirmButtonText: 'Fix Errors'
        });
        
        return false;
    }
    
    // If validation passes, submit the form via fetch
    try {
        const formData = new FormData(form);
        
        // Show loading state
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Submitting...';
        
        // Determine the URL based on form type
        let url = form.action;
        if (formPrefix === 'edit') {
            const couponId = formData.get('id');
            url = `/admin/coupons/update/${couponId}`;
            formData.delete('id'); // Remove id from formData as it's in the URL
        }
        
        // Convert FormData to JSON
        const data = {};
        formData.forEach((value, key) => {
            data[key] = value;
        });
        
        const response = await fetch(url, {
            method: formPrefix === 'create' ? 'POST' : 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: result.message || (formPrefix === 'create' ? 'Coupon created successfully!' : 'Coupon updated successfully!'),
                confirmButtonColor: '#4f46e5',
                showConfirmButton: false,
                timer: 1500
            });
            
            // Reload page to show updated data
            window.location.reload();
        } else {
            // Re-enable submit button
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
            
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: result.message || 'Failed to save coupon. Please try again.',
                confirmButtonColor: '#ef4444'
            });
        }
    } catch (error) {
        console.error('Error submitting coupon:', error);
        
        // Re-enable submit button
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
        
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'An error occurred. Please try again.',
            confirmButtonColor: '#ef4444'
        });
    }
}

// DISCOUNT TYPE HANDLING

function handleDiscountTypeChange(formPrefix) {
    const discountTypeInput = document.querySelector(`#${formPrefix}DiscountType`);
    const maxDiscountInput = document.querySelector(`#${formPrefix}CouponForm input[name="maxDiscountAmount"]`);
    
    if (!discountTypeInput || !maxDiscountInput) return;
    
    const discountType = discountTypeInput.value;
    
    // Clear any existing errors
    clearError(maxDiscountInput);
    
    if (discountType === 'percentage') {
        // Enable max discount for percentage
        maxDiscountInput.disabled = false;
        maxDiscountInput.classList.remove('bg-gray-100', 'cursor-not-allowed');
        maxDiscountInput.placeholder = 'Required for percentage';
    } else {
        // Make max discount optional for fixed
        maxDiscountInput.disabled = false;
        maxDiscountInput.classList.remove('bg-gray-100', 'cursor-not-allowed');
        maxDiscountInput.placeholder = 'Optional';
    }
}

// REAL-TIME VALIDATION

function setupRealTimeValidation(formPrefix) {
    // Coupon code
    const codeInput = document.querySelector(`#${formPrefix}CouponForm input[name="name"]`);
    if (codeInput) {
        codeInput.addEventListener('blur', () => validateCouponCodeField(formPrefix));
        codeInput.addEventListener('input', (e) => {
            // Auto-convert to uppercase
            e.target.value = e.target.value.toUpperCase();
            if (codeInput.classList.contains('border-red-500')) {
                validateCouponCodeField(formPrefix);
            }
        });
    }
    
    // Description
    const descriptionInput = document.querySelector(`#${formPrefix}CouponForm input[name="description"]`);
    if (descriptionInput) {
        descriptionInput.addEventListener('blur', () => validateDescriptionField(formPrefix));
        descriptionInput.addEventListener('input', () => {
            if (descriptionInput.classList.contains('border-red-500')) {
                validateDescriptionField(formPrefix);
            }
        });
    }
    
    // Discount type
    const discountTypeInput = document.querySelector(`#${formPrefix}DiscountType`);
    if (discountTypeInput) {
        discountTypeInput.addEventListener('change', () => {
            handleDiscountTypeChange(formPrefix);
            validateDiscountTypeField(formPrefix);
            validateDiscountValueField(formPrefix);
            validateMaxDiscountField(formPrefix);
        });
    }
    
    // Discount value
    const discountValueInput = document.querySelector(`#${formPrefix}OfferPrice`);
    if (discountValueInput) {
        discountValueInput.addEventListener('blur', () => validateDiscountValueField(formPrefix));
        discountValueInput.addEventListener('input', () => {
            if (discountValueInput.classList.contains('border-red-500')) {
                validateDiscountValueField(formPrefix);
            }
        });
    }
    
    // Min purchase
    const minPurchaseInput = document.querySelector(`#${formPrefix}CouponForm input[name="minimumPrice"]`);
    if (minPurchaseInput) {
        minPurchaseInput.addEventListener('blur', () => validateMinPurchaseField(formPrefix));
        minPurchaseInput.addEventListener('input', () => {
            if (minPurchaseInput.classList.contains('border-red-500')) {
                validateMinPurchaseField(formPrefix);
            }
        });
    }
    
    // Max discount
    const maxDiscountInput = document.querySelector(`#${formPrefix}CouponForm input[name="maxDiscountAmount"]`);
    if (maxDiscountInput) {
        maxDiscountInput.addEventListener('blur', () => validateMaxDiscountField(formPrefix));
        maxDiscountInput.addEventListener('input', () => {
            if (maxDiscountInput.classList.contains('border-red-500')) {
                validateMaxDiscountField(formPrefix);
            }
        });
    }
    
    // Start date
    const startDateInput = document.querySelector(`#${formPrefix}CouponForm input[name="startDate"]`);
    if (startDateInput) {
        startDateInput.addEventListener('blur', () => validateStartDateField(formPrefix));
        startDateInput.addEventListener('change', () => {
            validateStartDateField(formPrefix);
            validateEndDateField(formPrefix);
        });
    }
    
    // End date
    const endDateInput = document.querySelector(`#${formPrefix}CouponForm input[name="endDate"]`);
    if (endDateInput) {
        endDateInput.addEventListener('blur', () => validateEndDateField(formPrefix));
        endDateInput.addEventListener('change', () => validateEndDateField(formPrefix));
    }
    
    // Usage limit
    const usageLimitInput = document.querySelector(`#${formPrefix}CouponForm input[name="usageLimit"]`);
    if (usageLimitInput) {
        usageLimitInput.addEventListener('blur', () => validateUsageLimitField(formPrefix));
        usageLimitInput.addEventListener('input', () => {
            if (usageLimitInput.classList.contains('border-red-500')) {
                validateUsageLimitField(formPrefix);
            }
            // Re-validate usage per user when usage limit changes
            validateUsagePerUserField(formPrefix);
        });
    }
    
    // Usage per user
    const usagePerUserInput = document.querySelector(`#${formPrefix}CouponForm input[name="usagePerUser"]`);
    if (usagePerUserInput) {
        usagePerUserInput.addEventListener('blur', () => validateUsagePerUserField(formPrefix));
        usagePerUserInput.addEventListener('input', () => {
            if (usagePerUserInput.classList.contains('border-red-500')) {
                validateUsagePerUserField(formPrefix);
            }
        });
    }
}

// INITIALIZATION

document.addEventListener('DOMContentLoaded', function() {
    // Setup validation for create form
    const createForm = document.getElementById('createCouponForm');
    if (createForm) {
        createForm.addEventListener('submit', async function(e) {
            await handleCouponFormSubmit(e, 'create');
        }, true); // Use capture phase to run before other handlers
        
        setupRealTimeValidation('create');
        handleDiscountTypeChange('create');
    }
    
    // Setup validation for edit form
    const editForm = document.getElementById('editCouponForm');
    if (editForm) {
        editForm.addEventListener('submit', async function(e) {
            await handleCouponFormSubmit(e, 'edit');
        }, true); // Use capture phase to run before other handlers
        
        setupRealTimeValidation('edit');
        handleDiscountTypeChange('edit');
    }
});
