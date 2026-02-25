
// VALIDATION HELPER FUNCTIONS

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

function validateInteger(value, fieldName, min = null) {
    if (value === '' || value === null || value === undefined) {
        return { valid: false, message: `${fieldName} is required` };
    }
    
    const num = Number(value);
    
    if (!Number.isInteger(num)) {
        return { valid: false, message: `${fieldName} must be a whole number` };
    }
    
    if (min !== null && num < min) {
        return { valid: false, message: `${fieldName} must be at least ${min}` };
    }
    
    return { valid: true, value: num };
}

function validateNumeric(value, fieldName, min = null, max = null) {
    if (value === '' || value === null || value === undefined) {
        return { valid: false, message: `${fieldName} is required` };
    }
    
    const num = Number(value);
    
    if (isNaN(num)) {
        return { valid: false, message: `${fieldName} must be a valid number` };
    }
    
    if (min !== null && num < min) {
        return { valid: false, message: `${fieldName} must be at least ${min}` };
    }
    
    if (max !== null && num > max) {
        return { valid: false, message: `${fieldName} must not exceed ${max}` };
    }
    
    return { valid: true, value: num };
}

function validateSelect(value, fieldName) {
    if (!value || value === '' || value === 'Select a category') {
        return { valid: false, message: `Please select a ${fieldName}` };
    }
    
    return { valid: true, value: value };
}

// UI HELPER FUNCTIONS

function showError(input, message) {
    // Add error class to input
    input.classList.add('border-red-500', 'focus:ring-red-500', 'focus:border-red-500');
    input.classList.remove('border-gray-300', 'focus:ring-gray-900', 'focus:border-transparent');
    
    // Find or create error message element
    let errorElement = input.parentElement.querySelector('.error-message');
    
    if (!errorElement) {
        errorElement = document.createElement('p');
        errorElement.className = 'error-message text-xs text-red-600 mt-1';
        input.parentElement.appendChild(errorElement);
    }
    
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function clearError(input) {
    // Remove error classes
    input.classList.remove('border-red-500', 'focus:ring-red-500', 'focus:border-red-500');
    input.classList.add('border-gray-300', 'focus:ring-gray-900', 'focus:border-transparent');
    
    // Hide error message
    const errorElement = input.parentElement.querySelector('.error-message');
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

function scrollToFirstError() {
    const firstError = document.querySelector('.border-red-500');
    if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstError.focus();
    }
}

function disableSubmitButton(button, isDisabled) {
    if (isDisabled) {
        button.disabled = true;
        button.classList.add('opacity-50', 'cursor-not-allowed');
        button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Validating...';
    } else {
        button.disabled = false;
        button.classList.remove('opacity-50', 'cursor-not-allowed');
        button.innerHTML = button.getAttribute('data-original-text') || 'Submit';
    }
}

// PRODUCT-LEVEL VALIDATION

function validateProductName() {
    const input = document.querySelector('input[name="productName"]');
    const result = validateString(input.value, 3, 100, 'Product name');
    
    if (!result.valid) {
        showError(input, result.message);
        return false;
    }
    
    clearError(input);
    return true;
}

function validateDescription() {
    const input = document.querySelector('textarea[name="description"]');
    const result = validateString(input.value, 10, 1000, 'Description');
    
    if (!result.valid) {
        showError(input, result.message);
        return false;
    }
    
    clearError(input);
    return true;
}

function validateCategory() {
    const input = document.querySelector('select[name="category"]');
    const result = validateSelect(input.value, 'category');
    
    if (!result.valid) {
        showError(input, result.message);
        return false;
    }
    
    clearError(input);
    return true;
}

// VARIANT-LEVEL VALIDATION

function validateVariantColor(variantElement, variantIndex) {
    // Try both new variant and existing variant selectors
    let input = variantElement.querySelector(`input[name="variants[${variantIndex}][color]"]`);
    if (!input) {
        input = variantElement.querySelector(`input[name="existingVariants[${variantIndex}][color]"]`);
    }
    if (!input) {
        // Fallback to data attribute selector
        input = variantElement.querySelector('input[data-color]');
    }
    if (!input) return true; // Skip if input doesn't exist
    
    const result = validateString(input.value, 2, 30, 'Color');
    
    if (!result.valid) {
        showError(input, result.message);
        return false;
    }
    
    clearError(input);
    return true;
}

function validateVariantStock(variantElement, variantIndex) {
    let input = variantElement.querySelector(`input[name="variants[${variantIndex}][quantity]"]`);
    if (!input) {
        input = variantElement.querySelector(`input[name="existingVariants[${variantIndex}][quantity]"]`);
    }
    if (!input) {
        input = variantElement.querySelector('input[data-stock]');
    }
    if (!input) return true;
    
    const result = validateInteger(input.value, 'Stock quantity', 0);
    
    if (!result.valid) {
        showError(input, result.message);
        return false;
    }
    
    clearError(input);
    return true;
}

function validateVariantRegularPrice(variantElement, variantIndex) {
    let input = variantElement.querySelector(`input[name="variants[${variantIndex}][regularPrice]"]`);
    if (!input) {
        input = variantElement.querySelector(`input[name="existingVariants[${variantIndex}][regularPrice]"]`);
    }
    if (!input) {
        input = variantElement.querySelector('input[data-regular]');
    }
    if (!input) return true;
    
    const result = validateNumeric(input.value, 'Regular price', 0.01);
    
    if (!result.valid) {
        showError(input, result.message);
        return false;
    }
    
    clearError(input);
    return true;
}

function validateVariantSalePrice(variantElement, variantIndex) {
    let salePriceInput = variantElement.querySelector(`input[name="variants[${variantIndex}][salePrice]"]`);
    let regularPriceInput = variantElement.querySelector(`input[name="variants[${variantIndex}][regularPrice]"]`);
    
    if (!salePriceInput) {
        salePriceInput = variantElement.querySelector(`input[name="existingVariants[${variantIndex}][salePrice]"]`);
        regularPriceInput = variantElement.querySelector(`input[name="existingVariants[${variantIndex}][regularPrice]"]`);
    }
    if (!salePriceInput) {
        salePriceInput = variantElement.querySelector('input[data-sale]');
        regularPriceInput = variantElement.querySelector('input[data-regular]');
    }
    
    if (!salePriceInput || !regularPriceInput) return true;
    
    const salePriceResult = validateNumeric(salePriceInput.value, 'Sale price', 0);
    
    if (!salePriceResult.valid) {
        showError(salePriceInput, salePriceResult.message);
        return false;
    }
    
    // Check if sale price exceeds regular price
    const salePrice = salePriceResult.value;
    const regularPrice = Number(regularPriceInput.value);
    
    if (regularPrice > 0 && salePrice > regularPrice) {
        showError(salePriceInput, 'Sale price cannot exceed regular price');
        return false;
    }
    
    clearError(salePriceInput);
    return true;
}

function validateVariant(variantElement, variantIndex) {
    let isValid = true;
    
    // Validate all variant fields
    if (!validateVariantColor(variantElement, variantIndex)) isValid = false;
    if (!validateVariantStock(variantElement, variantIndex)) isValid = false;
    if (!validateVariantRegularPrice(variantElement, variantIndex)) isValid = false;
    if (!validateVariantSalePrice(variantElement, variantIndex)) isValid = false;
    if (!validateVariantImages(variantElement, variantIndex)) isValid = false;
    
    return isValid;
}

function checkDuplicateColors() {
    const variantElements = document.querySelectorAll('.variant-item');
    const colors = [];
    let hasDuplicates = false;
    
    variantElements.forEach((variantElement, index) => {
        const colorInput = variantElement.querySelector('input[name*="[color]"]');
        if (!colorInput) return;
        
        const color = colorInput.value.trim().toLowerCase();
        
        if (color && colors.includes(color)) {
            showError(colorInput, 'This color already exists in another variant');
            hasDuplicates = true;
        } else if (color) {
            colors.push(color);
            // Clear error if it was previously a duplicate
            const errorElement = colorInput.parentElement.querySelector('.error-message');
            if (errorElement && errorElement.textContent.includes('already exists')) {
                clearError(colorInput);
            }
        }
    });
    
    return !hasDuplicates;
}

function variantHasImages(variantElement, variantIndex) {

    if (typeof window.croppedFiles !== 'undefined' && window.croppedFiles[variantIndex]) {
        if (window.croppedFiles[variantIndex].length > 0) {
            return true;
        }
    }
    
   
    const previewContainer = document.getElementById(`imagePreview${variantIndex}`);
    if (previewContainer) {
        const images = previewContainer.querySelectorAll('img');
        if (images.length > 0) {
            return true;
        }
    }
    
    
    const imageElements = variantElement.querySelectorAll('.preview-image, [class*="preview"], img[src*="blob:"], img[src*="data:image"]');
    if (imageElements.length > 0) {
        return true;
    }
    
   
    const fileInput = variantElement.querySelector(`input[type="file"][id*="${variantIndex}"]`);
    if (fileInput && fileInput.files && fileInput.files.length > 0) {
        return true;
    }
    
    return false;
}

function validateVariantImages(variantElement, variantIndex) {
    
    return true;
}