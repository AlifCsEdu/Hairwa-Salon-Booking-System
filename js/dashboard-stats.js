// Update dashboard statistics
async function updateDashboardStats() {
    try {
        console.log('Fetching dashboard statistics...');
        const response = await fetch('api/dashboard-stats.php');
        const data = await response.json();
        
        console.log('Dashboard statistics response:', data);
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to fetch dashboard statistics');
        }

        // Helper function to safely update element text content
        const updateElement = (id, value, defaultValue = '0') => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value || defaultValue;
            } else {
                console.warn(`Element with id "${id}" not found`);
            }
        };

        // Update statistics with fallback values
        const stats = data.stats || {};
        updateElement('totalBookings', stats.total_bookings);
        updateElement('totalRevenue', stats.total_revenue ? `$${stats.total_revenue}` : '$0');
        updateElement('totalCustomers', stats.total_customers);
        updateElement('avgBookingValue', stats.avg_booking_value ? `$${stats.avg_booking_value}` : '$0');
        
        // Schedule next update
        setTimeout(updateDashboardStats, 60000); // Update every minute
    } catch (error) {
        console.error('Error fetching dashboard statistics:', error);
        // Schedule retry after error
        setTimeout(updateDashboardStats, 30000); // Retry after 30 seconds on error
    }
}

// Initialize dashboard stats when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing dashboard statistics...');
    updateDashboardStats();
});
