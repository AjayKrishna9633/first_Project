
    async function toggleBlock(userId, isActive, event) {
        // Determine the action based on current state
        const action = isActive ? 'unblock' : 'block';
        const confirmMessage = isActive 
            ? 'Are you sure you want to unblock this user?' 
            : 'Are you sure you want to block this user?';
        
        // Show SweetAlert confirmation dialog
        const result = await Swal.fire({
            title: 'Confirm Action',
            text: confirmMessage,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#1f2937',
            cancelButtonColor: '#6b7280',
            confirmButtonText: isActive ? 'Yes, unblock!' : 'Yes, block!',
            cancelButtonText: 'Cancel'
        });

        if (!result.isConfirmed) {
            // User cancelled - revert the toggle switch
            if (event && event.target) {
                event.target.checked = !event.target.checked;
            }
            return;
        }

        try {
            const response = await fetch(`/admin/customers/toggle-block/${userId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                // Show success message
                await Swal.fire({
                    title: 'Success!',
                    text: data.message,
                    icon: 'success',
                    confirmButtonColor: '#1f2937'
                });
                location.reload();
            } else {
                await Swal.fire({
                    title: 'Error!',
                    text: data.message || 'Failed to update user status',
                    icon: 'error',
                    confirmButtonColor: '#1f2937'
                });
                // Revert the toggle on error
                if (event && event.target) {
                    event.target.checked = !event.target.checked;
                }
            }
        } catch (error) {
            console.error('Error:', error);
            await Swal.fire({
                title: 'Error!',
                text: 'An error occurred. Please try again.',
                icon: 'error',
                confirmButtonColor: '#1f2937'
            });
            // Revert the toggle on error
            if (event && event.target) {
                event.target.checked = !event.target.checked;
            }
        }
    }