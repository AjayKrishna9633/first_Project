/**
 * Simple Return Projection - Just validates and disables button if needed
 */

(function() {
    let projections = {};

    /**
     * Initialize
     */
    async function init() {
        const orderContainer = document.querySelector('[data-order-id]');
        if (!orderContainer) return;

        const orderId = orderContainer.getAttribute('data-order-id');
        const orderStatus = orderContainer.getAttribute('data-order-status');

        if (orderStatus !== 'delivered') return;

        try {
            const response = await fetch(`/orders/${orderId}/return-projections`);
            const data = await response.json();

            if (data.success) {
                projections = data.projections;
                updateReturnButtons();
            }
        } catch (error) {
            console.error('Error fetching projections:', error);
        }
    }

    /**
     * Update return buttons based on projections
     */
    function updateReturnButtons() {
        for (const itemId in projections) {
            const projection = projections[itemId];
            const itemContainer = document.querySelector(`[data-item-id="${itemId}"]`);
            if (!itemContainer) continue;

            const placeholder = itemContainer.querySelector('.return-projection-placeholder');
            if (!placeholder) continue;

            // Clear loading text
            placeholder.innerHTML = '';

            if (!projection.success || !projection.isReturnAllowed) {
                // BLOCKED - Show disabled button with tooltip
                const wrapper = document.createElement('div');
                wrapper.style.cssText = 'display:inline-flex;align-items:center;gap:6px;';
                
                const btn = document.createElement('button');
                btn.className = 'text-gray-400 text-sm';
                btn.disabled = true;
                btn.style.cursor = 'not-allowed';
                btn.innerHTML = '<i class="fas fa-ban mr-1"></i>Return Item';
                
                const icon = document.createElement('i');
                icon.className = 'fas fa-info-circle text-yellow-400';
                icon.style.cursor = 'help';
                icon.title = projection.blockMessage || 'Cannot return this item individually';
                
                wrapper.appendChild(btn);
                wrapper.appendChild(icon);
                placeholder.appendChild(wrapper);
            } else {
                // ALLOWED - Show normal button using existing function
                const btn = document.createElement('button');
                btn.className = 'text-orange-400 hover:text-orange-300 text-sm';
                btn.innerHTML = '<i class="fas fa-undo mr-1"></i>Return Item';
                btn.onclick = function() {
                    // Use the existing requestItemReturn function from the page
                    const orderId = document.querySelector('[data-order-id]').getAttribute('data-order-id');
                    if (typeof requestItemReturn === 'function') {
                        // Intercept to use validated endpoint
                        requestItemReturnValidated(orderId, itemId, projection);
                    }
                };
                placeholder.appendChild(btn);
            }
        }
    }

    /**
     * Request item return with validation
     */
    async function requestItemReturnValidated(orderId, itemId, projection) {
        const { value: formValues } = await Swal.fire({
            title: 'Request Item Return',
            html: `
                <div class="text-left">
                    <p class="text-sm text-gray-600 mb-4">You are requesting a return for this specific item only.</p>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Reason for Return:</label>
                    <select id="itemReturnReason" class="w-full p-2 border border-gray-300 rounded-lg mb-4">
                        <option value="">Select a reason</option>
                        <option value="DEFECTIVE">Defective product</option>
                        <option value="DAMAGED_SHIPPING">Damaged during shipping</option>
                        <option value="WRONG_ITEM">Wrong item received</option>
                        <option value="NO_LONGER_NEEDED">No longer needed</option>
                        <option value="BETTER_PRICE">Found better price elsewhere</option>
                        <option value="ORDERED_MISTAKE">Ordered by mistake</option>
                        <option value="LATE_ARRIVAL">Late arrival</option>
                        <option value="OTHER">Other</option>
                    </select>
                    
                    <label class="block text-sm font-medium text-gray-700 mb-2">Additional Notes:</label>
                    <textarea id="itemReturnNotes" class="w-full p-2 border border-gray-300 rounded-lg" rows="3" 
                        placeholder="Please provide additional details..."></textarea>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Submit Return Request',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#ea580c',
            preConfirm: () => {
                const reason = document.getElementById('itemReturnReason').value;
                const notes = document.getElementById('itemReturnNotes').value;
                
                if (!reason) {
                    Swal.showValidationMessage('Please select a reason for return');
                    return false;
                }
                
                return { reason, notes };
            }
        });

        if (formValues) {
            try {
                const response = await fetch('/orders/return/item-request-validated', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        orderId: orderId,
                        itemId: itemId,
                        returnReason: formValues.reason,
                        returnNotes: formValues.notes
                    })
                });

                const result = await response.json();

                if (result.success) {
                    Swal.fire('Success!', result.message, 'success').then(() => {
                        location.reload();
                    });
                } else {
                    Swal.fire('Error', result.message, 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                Swal.fire('Error', 'Failed to submit item return request', 'error');
            }
        }
    }

    // Auto-initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
