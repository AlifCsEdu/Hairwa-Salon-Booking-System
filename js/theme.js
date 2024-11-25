// Theme functions
function updateTheme(isDark) {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    // Update checkbox state
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.checked = isDark;
    }
    
    updateChartColors();
}

function updateChartColors() {
    try {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#e5e7eb' : '#374151';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const primaryColor = isDark ? '#00571f' : '#e3c264';
        const secondaryColor = isDark ? '#e3c264' : '#00571f';

        // Update each chart if it exists and is initialized
        const charts = {
            'bookingsChart': window.bookingsChart,
            'revenueChart': window.revenueChart,
            'customersChart': window.customersChart
        };

        Object.entries(charts).forEach(([chartName, chart]) => {
            if (!chart || !chart.data || !chart.data.datasets) {
                console.log(`Chart ${chartName} not initialized yet, skipping color update`);
                return;
            }

            // Update chart options
            if (chart.options && chart.options.scales) {
                // Update X axis
                if (chart.options.scales.x) {
                    chart.options.scales.x.grid.color = gridColor;
                    chart.options.scales.x.ticks.color = textColor;
                }
                // Update Y axis
                if (chart.options.scales.y) {
                    chart.options.scales.y.grid.color = gridColor;
                    chart.options.scales.y.ticks.color = textColor;
                }
            }

            // Update legend colors
            if (chart.options && chart.options.plugins && chart.options.plugins.legend) {
                chart.options.plugins.legend.labels = chart.options.plugins.legend.labels || {};
                chart.options.plugins.legend.labels.color = textColor;
            }

            // Update dataset colors
            chart.data.datasets.forEach((dataset, index) => {
                if (dataset.type === 'bar') {
                    dataset.backgroundColor = isDark ? '#1f2937' : '#e5e7eb';
                    dataset.hoverBackgroundColor = isDark ? '#374151' : '#d1d5db';
                } else {
                    // Line charts
                    dataset.borderColor = index === 0 ? primaryColor : secondaryColor;
                    dataset.backgroundColor = `${index === 0 ? primaryColor : secondaryColor}33`;
                    dataset.pointBackgroundColor = index === 0 ? primaryColor : secondaryColor;
                    dataset.pointHoverBackgroundColor = index === 0 ? primaryColor : secondaryColor;
                }
            });

            chart.update('none');
        });
    } catch (error) {
        console.error('Error updating chart colors:', error);
    }
}

// Initialize theme handling
document.addEventListener('DOMContentLoaded', function() {
    try {
        console.log('Initializing theme...');
        
        // Set initial theme based on saved preference or system preference
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
        
        console.log('Initial theme:', initialTheme);
        updateTheme(initialTheme === 'dark');

        // Add theme toggle button listener
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            console.log('Theme toggle button found');
            themeToggle.addEventListener('change', function() {
                console.log('Theme toggle changed, checked:', this.checked);
                updateTheme(this.checked);
            });
        } else {
            console.warn('Theme toggle button not found');
        }

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
            if (!localStorage.getItem('theme')) {
                updateTheme(e.matches);
            }
        });
    } catch (error) {
        console.error('Error initializing theme:', error);
    }
});
