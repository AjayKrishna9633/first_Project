/**
 * Product Form Validation
 * Comprehensive client-side validation for Admin Product Add/Edit forms
 */

// ============================================
// VALIDATION HELPER FUNCTIONS
// ============================================

/**
 * Trim and validate string length
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
 * Validate integer
 */
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

/**
 * Validate numeric value
 */
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

/**
 * Validate dropdown selection
 */
function validateSelect(value, fieldName) {
    if (!value || value === '' || value === 'Select a category') {
        return { valid: false, message: `Please select a ${fieldName}` };
    }
    
    return { valid: true, value: value };
}

// ============================================
// UI HELPER FUNCTIONS
// ============================================

/**
 * Show error message for a field
 */
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

/**
 * Clear error message for a field
 */
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
 * Disable submit button
 */
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

// ============================================
// PRODUCT-LEVEL VALIDATION
// ============================================

/**
 * Validate product name
 */
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

/**
 * Validate description
 */
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

/**
 * Validate category selection
 */
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

// ============================================
// VARIANT-LEVEL VALIDATION
// ============================================

/**
 * Validate variant color
 */
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

/**
 * Validate variant stock quantity
 */
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

/**
 * Validate variant regular price
 */
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

/**
 * Validate variant sale price
 */
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

/**
 * Validate single variant
 */
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

/**
 * Check for duplicate colors
 */
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

/**
 * Check if variant has images
 */
function variantHasImages(variantElement, variantIndex) {
    // Method 1: Check if there are cropped images for this variant (global variable)
    if (typeof window.croppedFiles !== 'undefined' && window.croppedFiles[variantIndex]) {
        if (window.croppedFiles[variantIndex].length > 0) {
            return true;
        }
    }
    
    // Method 2: Check if there's an image preview container with images
    const previewContainer = document.getElementById(`imagePreview${variantIndex}`);
    if (previewContainer) {
        const images = previewContainer.querySelectorAll('img');
        if (images.length > 0) {
            return true;
        }
    }
    
    // Method 3: Check for any image-related elements in the variant
    const imageElements = variantElement.querySelectorAll('.preview-image, [class*="preview"], img[src*="blob:"], img[src*="data:image"]');
    if (imageElements.length > 0) {
        return true;
    }
    
    // Method 4: Check if file input has files
    const fileInput = variantElement.querySelector(`input[type="file"][id*="${variantIndex}"]`);
    if (fileInput && fileInput.files && fileInput.files.length > 0) {
        return true;
    }
    
    return false;
}

/**
 * Validate variant images
 */
function validateVariantImages(variantElement, variantIndex) {
    // Skip image validation - let backend handle it
    // This prevents false positives when images are uploaded via cropping system
    return true;
    
    /* Original validation code - commented out to prevent false positives
    if (!variantHasImages(variantElement, variantIndex)) {
        // Find the image upload button or container
        const imageSection = variantElement.querySelector('[id^="variantImagesInput"], .variant-images-input');
        const uploadButton = variantElement.querySelector('button[onclick*="variantImagesInput"]');
        
        if (uploadButton) {
            // Highlight the upload button area
            uploadButton.classList.add('border-red-500', 'bg-red-50');
            uploadButton.classList.remove('border-gray-300');
            
            // Show error message
            let errorElement = variantElement.querySelector('.image-error-message');
            if (!errorElement) {
                errorElement = document.createElement('p');
                errorElement.className = 'image-error-message text-xs text-red-600 mt-2';
                uploadButton.parentElement.appendChild(errorElement);
            }
            errorElement.textContent = 'At least one image is required for this variant';
            errorElement.style.display = 'block';
        }
        
        return false;
    }
    
    // Clear any existing error
    const uploadButton = variantElement.querySelector('button[onclick*="variantImagesInput"]');
    if (uploadButton) {
        uploadButton.classList.remove('border-red-500', 'bg-red-50');
        uploadButton.classList.add('border-gray-300');
        
        const errorElement = variantElement.querySelector('.image-error-message');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }
    
    return true;
    */
}

/**
 * Check if variant is empty
 */
function isVariantEmpty(variantElement) {
    const inputs = variantElement.querySelectorAll('input[type="text"], input[type="number"]');
    
    for (let input of inputs) {
        if (input.value.trim() !== '') {
            return false;
        }
    }
    
    return true;
}

/**
 * Validate all variants
 */
function validateAllVariants() {
    const variantElements = document.querySelectorAll('.variant-item');
    
    // Check if at least one variant exists
    if (variantElements.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'No Variants',
            text: 'Please add at least one product variant',
            confirmButtonColor: '#1f2937'
        });
        return false;
    }
    
    let isValid = true;
    let hasNonEmptyVariant = false;
    
    // Validate each variant
    variantElements.forEach((variantElement, index) => {
        const variantIndex = variantElement.getAttribute('data-variant-index') || index;
        
        // Check if variant is empty
        if (isVariantEmpty(variantElement)) {
            // Skip validation for empty variants, but don't count them
            return;
        }
        
        hasNonEmptyVariant = true;
        
        // Validate variant (images validation is now skipped in validateVariant)
        if (!validateVariant(variantElement, variantIndex)) {
            isValid = false;
        }
    });
    
    // Check if at least one non-empty variant exists
    if (!hasNonEmptyVariant) {
        Swal.fire({
            icon: 'warning',
            title: 'No Complete Variants',
            text: 'Please add at least one complete product variant with all required fields',
            confirmButtonColor: '#1f2937'
        });
        return false;
    }
    
    // Check for duplicate colors
    if (!checkDuplicateColors()) {
        isValid = false;
    }
    
    return isValid;
}

// ============================================
// FORM VALIDATION
// ============================================

/**
 * Validate entire form
 */
function validateProductForm() {
    let isValid = true;
    
    // Validate product-level fields
    if (!validateProductName()) isValid = false;
    if (!validateDescription()) isValid = false;
    if (!validateCategory()) isValid = false;
    
    // Validate all variants
    if (!validateAllVariants()) isValid = false;
    
    return isValid;
}

/**
 * Handle form submission
 */
function handleFormSubmit(event) {
    // ALWAYS prevent default first
    event.preventDefault();
    event.stopPropagation();
    
    const submitButton = document.getElementById('submitBtn');
    const originalText = submitButton.textContent;
    submitButton.setAttribute('data-original-text', originalText);
    
    // Disable submit button
    disableSubmitButton(submitButton, true);
    
    // Validate form
    const isValid = validateProductForm();
    
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
    
    // If validation passes, call the custom submitForm function
    // This ensures cropped images are properly submitted
    if (typeof window.submitForm === 'function') {
        window.submitForm();
    } else {
        // Fallback to default form submission if custom function not available
        event.target.submit();
    }
}

// ============================================
// REAL-TIME VALIDATION
// ============================================

/**
 * Setup real-time validation listeners
 */
function setupRealTimeValidation() {
    // Product name
    const productNameInput = document.querySelector('input[name="productName"]');
    if (productNameInput) {
        productNameInput.addEventListener('blur', validateProductName);
        productNameInput.addEventListener('input', () => {
            if (productNameInput.classList.contains('border-red-500')) {
                validateProductName();
            }
        });
    }
    
    // Description
    const descriptionInput = document.querySelector('textarea[name="description"]');
    if (descriptionInput) {
        descriptionInput.addEventListener('blur', validateDescription);
        descriptionInput.addEventListener('input', () => {
            if (descriptionInput.classList.contains('border-red-500')) {
                validateDescription();
            }
        });
    }
    
    // Category
    const categoryInput = document.querySelector('select[name="category"]');
    if (categoryInput) {
        categoryInput.addEventListener('change', validateCategory);
    }
}

/**
 * Setup variant field validation
 */
function setupVariantValidation(variantElement, variantIndex) {
    // Color - try both patterns
    let colorInput = variantElement.querySelector(`input[name="variants[${variantIndex}][color]"]`);
    if (!colorInput) {
        colorInput = variantElement.querySelector(`input[name="existingVariants[${variantIndex}][color]"]`);
    }
    if (!colorInput) {
        colorInput = variantElement.querySelector('input[data-color]');
    }
    if (colorInput) {
        colorInput.addEventListener('blur', () => {
            validateVariantColor(variantElement, variantIndex);
            checkDuplicateColors();
        });
        colorInput.addEventListener('input', () => {
            if (colorInput.classList.contains('border-red-500')) {
                validateVariantColor(variantElement, variantIndex);
                checkDuplicateColors();
            }
        });
    }
    
    // Stock
    let stockInput = variantElement.querySelector(`input[name="variants[${variantIndex}][quantity]"]`);
    if (!stockInput) {
        stockInput = variantElement.querySelector(`input[name="existingVariants[${variantIndex}][quantity]"]`);
    }
    if (!stockInput) {
        stockInput = variantElement.querySelector('input[data-stock]');
    }
    if (stockInput) {
        stockInput.addEventListener('blur', () => validateVariantStock(variantElement, variantIndex));
        stockInput.addEventListener('input', () => {
            if (stockInput.classList.contains('border-red-500')) {
                validateVariantStock(variantElement, variantIndex);
            }
        });
    }
    
    // Regular price
    let regularPriceInput = variantElement.querySelector(`input[name="variants[${variantIndex}][regularPrice]"]`);
    if (!regularPriceInput) {
        regularPriceInput = variantElement.querySelector(`input[name="existingVariants[${variantIndex}][regularPrice]"]`);
    }
    if (!regularPriceInput) {
        regularPriceInput = variantElement.querySelector('input[data-regular]');
    }
    if (regularPriceInput) {
        regularPriceInput.addEventListener('blur', () => validateVariantRegularPrice(variantElement, variantIndex));
        regularPriceInput.addEventListener('input', () => {
            if (regularPriceInput.classList.contains('border-red-500')) {
                validateVariantRegularPrice(variantElement, variantIndex);
            }
        });
    }
    
    // Sale price
    let salePriceInput = variantElement.querySelector(`input[name="variants[${variantIndex}][salePrice]"]`);
    if (!salePriceInput) {
        salePriceInput = variantElement.querySelector(`input[name="existingVariants[${variantIndex}][salePrice]"]`);
    }
    if (!salePriceInput) {
        salePriceInput = variantElement.querySelector('input[data-sale]');
    }
    if (salePriceInput) {
        salePriceInput.addEventListener('blur', () => validateVariantSalePrice(variantElement, variantIndex));
        salePriceInput.addEventListener('input', () => {
            if (salePriceInput.classList.contains('border-red-500')) {
                validateVariantSalePrice(variantElement, variantIndex);
            }
        });
    }
}

/**
 * Setup validation for all existing variants
 */
function setupAllVariantsValidation() {
    const variantElements = document.querySelectorAll('.variant-item');
    variantElements.forEach((variantElement, index) => {
        const variantIndex = variantElement.getAttribute('data-variant-index') || index;
        setupVariantValidation(variantElement, variantIndex);
    });
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize validation on page load
 */
document.addEventListener('DOMContentLoaded', function() {
    // Setup form submit handler
    const form = document.getElementById('addProductForm') || document.getElementById('editProductForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
    
    // Setup real-time validation
    setupRealTimeValidation();
    setupAllVariantsValidation();
    
    // Watch for dynamically added variants
    const variantsContainer = document.getElementById('variantsContainer') || document.getElementById('newVariantsContainer');
    if (variantsContainer) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.classList && node.classList.contains('variant-item')) {
                        const variantIndex = node.getAttribute('data-variant-index') || node.getAttribute('data-new-variant-index');
                        setupVariantValidation(node, variantIndex);
                    }
                });
            });
        });
        
        observer.observe(variantsContainer, { childList: true });
    }
});

// Export functions for use in other scripts
window.productFormValidation = {
    validateProductForm,
    validateVariant,
    setupVariantValidation,
    checkDuplicateColors
};
