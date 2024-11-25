// Initialize charts
let overviewAppointmentChart;
let overviewRevenueChart;

// Format currency
function formatCurrency(amount) {
    return 'RM ' + parseFloat(amount).toFixed(2);
}

// Format time
function formatTime(time) {
    return new Date('2000-01-01 ' + time).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

// Load dashboard overview data
function loadDashboardOverview() {
    fetch('api/dashboard-overview.php')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateOverviewAppointmentDistribution(data.appointmentDistribution);
                updatePopularServices(data.popularServices);
                updateUpcomingAppointments(data.upcomingAppointments);
                updateRecentActivity(data.recentActivity);
                updateOverviewRevenueChart(data.revenueData);
            }
        })
        .catch(error => {
            console.error('Error loading dashboard overview:', error);
            showToast('error', 'Failed to load dashboard data');
        });
}

// Update appointment distribution chart
function updateOverviewAppointmentDistribution(data) {
    const ctx = document.getElementById('appointmentDistChart');
    if (!ctx) return;

    if (overviewAppointmentChart) {
        overviewAppointmentChart.destroy();
    }

    const timeLabels = data.map(slot => {
        const hour = slot.hour % 12 || 12;
        const minutes = slot.half_hour === 0 ? '00' : '30';
        const ampm = slot.hour < 12 ? 'AM' : 'PM';
        return `${hour}:${minutes} ${ampm}`;
    });

    overviewAppointmentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: timeLabels,
            datasets: [{
                label: 'Appointments',
                data: data.map(slot => slot.count),
                backgroundColor: 'rgba(227, 194, 100, 0.5)',
                borderColor: '#e3c264',
                borderWidth: 1,
                barThickness: 15
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    },
                    title: {
                        display: true,
                        text: 'Number of Concurrent Appointments'
                    }
                },
                x: {
                    ticks: {
                        autoSkip: false,
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const appointments = data[index].appointments;
                    if (appointments && appointments.length > 0) {
                        showAppointmentDetails(timeLabels[index], appointments);
                    }
                }
            },
            plugins: {
                title: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    bodySpacing: 4,
                    bodyFont: {
                        size: 12
                    },
                    callbacks: {
                        title: (items) => items[0]?.label || '',
                        label: (context) => {
                            const index = context.dataIndex;
                            const appointments = data[index].appointments;
                            if (!appointments || appointments.length === 0) {
                                return 'No appointments';
                            }

                            const lines = [];
                            lines.push(`${appointments.length} concurrent appointment${appointments.length !== 1 ? 's' : ''}`);
                            appointments.forEach((apt) => {
                                lines.push(`${apt.customer_name} • ${apt.service_name} (${apt.start_time}-${apt.end_time})`);
                            });

                            return lines;
                        }
                    },
                    bodyAlign: 'left',
                    titleAlign: 'center'
                }
            }
        }
    });

    // Add custom CSS for tooltip max height
    const style = document.createElement('style');
    style.textContent = `
        .chartjs-tooltip {
            max-height: 200px;
            overflow-y: auto;
        }
    `;
    document.head.appendChild(style);
}

// Create modal HTML if it doesn't exist
function createAppointmentModal() {
    if (!document.getElementById('appointmentDetailsModal')) {
        const modal = document.createElement('dialog');
        modal.id = 'appointmentDetailsModal';
        modal.className = 'modal';
        
        modal.innerHTML = `
            <div class="modal-box">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold" id="modalTitle"></h3>
                    <form method="dialog">
                        <button class="btn btn-ghost btn-sm btn-circle">
                            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </form>
                </div>
                <div id="modalContent"></div>
            </div>
            <form method="dialog" class="modal-backdrop">
                <button>close</button>
            </form>
        `;
        
        document.body.appendChild(modal);
    }
}

// Show modal with appointment details
function showAppointmentDetails(timeSlot, appointments) {
    createAppointmentModal();
    const modal = document.getElementById('appointmentDetailsModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    
    modalTitle.textContent = `${timeSlot} • ${appointments.length} Appointment${appointments.length !== 1 ? 's' : ''}`;
    
    let contentHTML = '<div class="space-y-4">';
    
    appointments.forEach((apt, index) => {
        contentHTML += `
            <div class="card bg-base-200 p-4">
                <div class="flex items-center justify-between mb-2">
                    <div class="font-semibold">${apt.customer_name}</div>
                    <div class="text-sm opacity-70">#${index + 1}</div>
                </div>
                <div class="space-y-2">
                    <div class="flex items-center text-sm">
                        <svg class="h-4 w-4 opacity-70 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span class="opacity-70">${apt.service_name}</span>
                    </div>
                    <div class="flex items-center text-sm">
                        <svg class="h-4 w-4 opacity-70 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span class="opacity-70">${apt.start_time} - ${apt.end_time} (${apt.duration} mins)</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    contentHTML += '</div>';
    modalContent.innerHTML = contentHTML;
    modal.showModal();
}

// Update popular services section
function updatePopularServices(services) {
    const container = document.getElementById('popularServices');
    if (!container) return;

    if (services && services.length > 0) {
        container.innerHTML = services.map(service => `
            <div class="flex items-center justify-between p-3 hover:bg-[#e3c264]/5 rounded-lg border border-[#e3c264]/20">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-[#e3c264]/10 flex items-center justify-center">
                        <i class="fas fa-star text-[#e3c264]"></i>
                    </div>
                    <div>
                        <h4 class="font-medium service-name">${service.service_name}</h4>
                        <p class="text-sm opacity-70"><span class="booking-count">${service.booking_count}</span> bookings</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="font-medium">${formatCurrency(service.revenue || 0)}</p>
                </div>
            </div>
        `).join('');
    } else {
        container.innerHTML = '<p class="text-center opacity-70">No popular services data available</p>';
    }
}

// Update upcoming appointments section
function updateUpcomingAppointments(appointments) {
    const container = document.getElementById('todaySchedule');
    if (!container) return;

    if (!appointments || appointments.length === 0) {
        container.innerHTML = '<div class="text-center py-4 text-base-content/70">No upcoming appointments today</div>';
        return;
    }

    container.innerHTML = appointments.map(appointment => `
        <div class="flex items-center justify-between p-3 hover:bg-[#e3c264]/5 rounded-lg border border-[#e3c264]/10">
            <div class="flex items-center gap-4">
                <div class="text-sm font-semibold">${formatTime(appointment.time)}</div>
                <div>
                    <div class="font-medium">${appointment.customer_name}</div>
                    <div class="text-sm opacity-70">${appointment.service_names}</div>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <span class="badge badge-${appointment.status === 'confirmed' ? 'success' : 'warning'}">${appointment.status}</span>
                <span class="badge badge-ghost">${appointment.group_size} pax</span>
            </div>
        </div>
    `).join('');
}

// Update recent activity section
function updateRecentActivity(activities) {
    const container = document.getElementById('recentActivity');
    if (!container) return;

    if (!activities || activities.length === 0) {
        container.innerHTML = '<div class="text-center py-4 text-base-content/70">No recent activity</div>';
        return;
    }

    container.innerHTML = activities.map(activity => `
        <div class="flex items-center gap-4 p-3 hover:bg-[#e3c264]/5 rounded-lg border border-[#e3c264]/10">
            <div class="w-8 h-8 rounded-full bg-[#e3c264]/10 flex items-center justify-center">
                <i class="fas fa-calendar-check text-[#e3c264]"></i>
            </div>
            <div class="flex-1">
                <div class="font-medium">${activity.customer_name}</div>
                <div class="text-sm opacity-70">
                    ${activity.description}
                    <span class="text-[#e3c264]">${activity.booking_time}</span>
                </div>
                <div class="text-xs opacity-50">Appointment: ${activity.formatted_time}</div>
            </div>
        </div>
    `).join('');
}

// Update revenue chart
function updateOverviewRevenueChart(data) {
    const ctx = document.getElementById('overviewRevenueChart');
    if (!ctx) return;

    const dates = data.map(d => new Date(d.date).toLocaleDateString());
    const revenues = data.map(d => d.revenue);

    if (overviewRevenueChart) {
        overviewRevenueChart.destroy();
    }

    overviewRevenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Revenue',
                data: revenues,
                borderColor: 'rgba(0, 87, 31, 1)',
                backgroundColor: 'rgba(0, 87, 31, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => formatCurrency(value)
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Revenue (Last 7 Days)'
                },
                tooltip: {
                    callbacks: {
                        label: context => formatCurrency(context.raw)
                    }
                }
            }
        }
    });
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    loadDashboardOverview();
    // Refresh every 5 minutes
    setInterval(loadDashboardOverview, 5 * 60 * 1000);
});
