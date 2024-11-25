// Wait for DOM to be loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeSidebar();
    setupNavigation();
});

// Initialize sidebar
function initializeSidebar() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const mobileSidebarToggle = document.getElementById('mobileSidebarToggle');
    const sidebar = document.getElementById('sidebar');
    
    // Load saved state
    const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (isCollapsed) {
        sidebar.classList.add('collapsed');
    }
    
    // Desktop sidebar toggle
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
        });
    }

    // Mobile sidebar toggle
    if (mobileSidebarToggle) {
        mobileSidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
        });
    }

    // Close mobile sidebar when clicking outside
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 1023) {
            if (!sidebar.contains(e.target) && (!mobileSidebarToggle || !mobileSidebarToggle.contains(e.target))) {
                sidebar.classList.remove('mobile-open');
            }
        }
    });
}

// Setup navigation
function setupNavigation() {
    const menuItems = document.querySelectorAll('.menu a[data-section]');
    const sections = document.querySelectorAll('main section');
    
    function showSection(sectionId) {
        sections.forEach(section => {
            if (section.id === sectionId) {
                section.classList.remove('hidden');
                // Trigger a custom event when a section becomes visible
                const event = new CustomEvent('sectionVisible', { 
                    detail: { sectionId, section } 
                });
                document.dispatchEvent(event);
            } else {
                section.classList.add('hidden');
            }
        });
        
        menuItems.forEach(item => {
            if (item.dataset.section === sectionId) {
                item.classList.add('active', 'bg-base-200');
            } else {
                item.classList.remove('active', 'bg-base-200');
            }
        });
    }
    
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = item.dataset.section;
            showSection(sectionId);
            
            // Close mobile sidebar after selection
            if (window.innerWidth <= 1023) {
                const sidebar = document.getElementById('sidebar');
                if (sidebar) {
                    sidebar.classList.remove('mobile-open');
                }
            }
        });
    });
    
    // Show default section
    showSection('dashboard');
}

// Chart.js default configuration
Chart.defaults.color = '#4B5563';
Chart.defaults.backgroundColor = '#ffffff';
Chart.defaults.borderColor = '#e5e7eb';

// Appointments functions
async function loadAppointments() {
    try {
        const response = await fetch('api/appointments.php?action=getTodayStats');
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('upcomingCount').textContent = data.upcoming || 0;
            document.getElementById('completedCount').textContent = data.completed || 0;
        }
    } catch (error) {
        console.error('Error loading appointments:', error);
    }
}

// Popular services functions
async function loadPopularServices() {
    try {
        const container = document.getElementById('popularServices');
        if (!container) {
            console.error('Popular services container not found');
            return;
        }

        console.log('Fetching popular services...');
        const response = await fetch('api/services.php?action=getPopular');
        const data = await response.json();
        
        console.log('Popular services response:', data);
        
        if (data.success) {
            if (!Array.isArray(data.services) || data.services.length === 0) {
                container.innerHTML = `
                    <div class="text-sm text-center py-4">
                        No completed bookings in the last 30 days
                    </div>
                `;
                return;
            }

            container.innerHTML = data.services.map(service => `
                <div class="flex items-center justify-between">
                    <span class="text-sm">${service.name || 'Unknown Service'}</span>
                    <span class="text-sm font-medium">${service.booking_count || 0} bookings</span>
                </div>
            `).join('');
        } else {
            console.error('Failed to load popular services:', data.error);
            container.innerHTML = `
                <div class="text-sm text-center text-error py-4">
                    Failed to load popular services
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading popular services:', error);
        const container = document.getElementById('popularServices');
        if (container) {
            container.innerHTML = `
                <div class="text-sm text-center text-error py-4">
                    Error loading popular services
                </div>
            `;
        }
    }
}

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-MY', {
        style: 'currency',
        currency: 'MYR'
    }).format(amount);
}

function formatDate(date) {
    return new Date(date).toLocaleDateString();
}

function getStatusColor(status) {
    const colors = {
        'pending': 'bg-yellow-100 text-yellow-800',
        'completed': 'bg-green-100 text-green-800',
        'cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status.toLowerCase()] || 'bg-gray-100 text-gray-800';
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
