let appointments = [];

async function loadAppointments() {
    try {
        const response = await fetch('api/appointments.php');
        if (!response.ok) throw new Error('Failed to fetch appointments');
        
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Failed to load appointments');
        }
        
        appointments = data.appointments || [];
        updateDateFilter();
        displayAppointments();
    } catch (error) {
        console.error('Error loading appointments:', error);
        showToast('error', 'Failed to load appointments');
    }
}

function updateDateFilter() {
    const dateFilter = document.getElementById('appointmentDateFilter');
    
    // Get unique dates from appointments
    const uniqueDates = [...new Set(appointments.map(appointment => {
        // Create date in KL timezone
        const date = new Date(appointment.datetime + ' UTC+8');
        return date.toISOString().split('T')[0];
    }))].sort();
    
    // Keep the first option (All Dates)
    dateFilter.innerHTML = '<option value="">All Dates</option>';
    
    // Add options for each unique date
    uniqueDates.forEach(date => {
        const formattedDate = new Date(date + 'T00:00:00+08:00').toLocaleDateString();
        const option = document.createElement('option');
        option.value = date;
        option.textContent = formattedDate;
        dateFilter.appendChild(option);
    });
}

function formatDateTime(datetimeStr) {
    // Create date in KL timezone
    const datetime = new Date(datetimeStr + ' UTC+8');
    const date = datetime.toLocaleDateString();
    const time = datetime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return { date, time };
}

function filterAppointments() {
    const statusFilter = document.getElementById('appointmentStatusFilter').value;
    const dateFilter = document.getElementById('appointmentDateFilter').value;
    
    return appointments.filter(appointment => {
        // Status filter
        if (statusFilter !== 'all' && appointment.status !== statusFilter) {
            return false;
        }
        
        // Date filter
        if (dateFilter) {
            // Create date in KL timezone for comparison
            const appointmentDate = new Date(appointment.datetime + ' UTC+8').toISOString().split('T')[0];
            if (appointmentDate !== dateFilter) {
                return false;
            }
        }
        
        return true;
    });
}

function displayAppointments() {
    const appointmentsTableBody = document.getElementById('appointmentsTableBody');
    if (!appointmentsTableBody) {
        console.error('Appointments table body not found');
        return;
    }

    const filteredAppointments = filterAppointments();
    
    appointmentsTableBody.innerHTML = filteredAppointments.map(appointment => {
        const { date, time } = formatDateTime(appointment.datetime);
        console.log('Rendering appointment:', appointment); // Debug log
        return `
            <tr>
                <td>${date} ${time}</td>
                <td>${appointment.customer_name || 'N/A'}</td>
                <td>${appointment.customer_email || 'N/A'}</td>
                <td>${appointment.customer_phone || 'N/A'}</td>
                <td>${appointment.service_names || 'No services'}</td>
                <td>${appointment.service_durations || 0} mins</td>
                <td>${appointment.group_size || 1}</td>
                <td>RM ${parseFloat(appointment.total_price || 0).toFixed(2)}</td>
                <td>
                    <span class="badge ${getStatusBadgeClass(appointment.status)}">
                        ${appointment.status || 'pending'}
                    </span>
                </td>
                <td>
                    <div class="flex gap-2">
                        ${getActionButtons(appointment)}
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Show message if no appointments found
    if (filteredAppointments.length === 0) {
        appointmentsTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    No appointments found matching the selected filters
                </td>
            </tr>
        `;
    }
}

function getStatusBadgeClass(status) {
    switch(status) {
        case 'confirmed': return 'badge-success';
        case 'pending': return 'badge-warning';
        case 'cancelled': return 'badge-error';
        case 'completed': return 'badge-info';
        default: return 'badge-ghost';
    }
}

function getActionButtons(appointment) {
    let buttons = '';
    
    if (appointment.status === 'pending') {
        buttons += `
            <button onclick="updateAppointmentStatus(${appointment.id}, 'confirmed')" 
                    class="btn btn-xs btn-success">
                Confirm
            </button>
        `;
    }
    
    if (appointment.status !== 'cancelled' && appointment.status !== 'completed') {
        buttons += `
            <button onclick="updateAppointmentStatus(${appointment.id}, 'cancelled')" 
                    class="btn btn-xs btn-error">
                Cancel
            </button>
        `;
    }
    
    if (appointment.status === 'confirmed') {
        buttons += `
            <button onclick="updateAppointmentStatus(${appointment.id}, 'completed')" 
                    class="btn btn-xs btn-info">
                Complete
            </button>
        `;
    }
    
    return buttons;
}

async function updateAppointmentStatus(appointmentId, status) {
    try {
        const response = await fetch(`api/appointments.php?id=${appointmentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status })
        });

        if (!response.ok) throw new Error('Failed to update appointment status');
        
        await loadAppointments();
        showToast('success', 'Appointment status updated successfully');
    } catch (error) {
        console.error('Error updating appointment status:', error);
        showToast('error', 'Failed to update appointment status');
    }
}

// Add new appointment
async function addAppointment(event) {
    event.preventDefault();
    const form = event.target;
    
    const appointmentData = {
        customer_name: form.customer_name.value,
        service_names: form.service_names.value,
        appointment_date: form.appointment_date.value,
        appointment_time: form.appointment_time.value,
        notes: form.notes.value || ''
    };

    try {
        const response = await fetch('api/appointments.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(appointmentData)
        });

        if (!response.ok) throw new Error('Failed to create appointment');
        
        form.reset();
        await loadAppointments();
        showToast('success', 'Appointment created successfully');
    } catch (error) {
        console.error('Error creating appointment:', error);
        showToast('error', 'Failed to create appointment');
    }
}

// Load services into the dropdown
async function loadServicesForDropdown() {
    console.log('Loading services...');
    try {
        const response = await fetch('api/services.php');
        console.log('Services API response:', response);
        if (!response.ok) {
            throw new Error(`Failed to fetch services: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Services data:', data);
        
        const serviceSelect = document.getElementById('newService');
        if (!serviceSelect) {
            throw new Error('Service select element not found');
        }
        
        // Clear existing options
        serviceSelect.innerHTML = '<option value="">Select a service</option>';
        
        // Add each service to the dropdown
        if (!data.services || !Array.isArray(data.services)) {
            throw new Error('Invalid services data received');
        }
        
        for (let i = 0; i < data.services.length; i++) {
            const service = data.services[i];
            const option = document.createElement('option');
            option.value = service.id;
            option.textContent = `${service.name} - RM ${service.price} (${service.duration} mins)`;
            serviceSelect.appendChild(option);
        }
        
        console.log(`Added ${data.services.length} services to dropdown`);
    } catch (error) {
        console.error('Error loading services:', error);
        showToast('error', 'Failed to load services');
    }
}

// Create new appointment
async function createAppointment() {
    try {
        const customerName = document.getElementById('newCustomerName').value;
        const customerEmail = document.getElementById('newCustomerEmail').value;
        const customerPhone = document.getElementById('newCustomerPhone').value;
        const serviceId = document.getElementById('newService').value;
        const appointmentDate = document.getElementById('newAppointmentDate').value;
        const appointmentTime = document.getElementById('newAppointmentTime').value;
        const groupSize = parseInt(document.getElementById('newGroupSize').value) || 1;

        if (!serviceId) {
            showToast('error', 'Please select a service');
            return;
        }

        // Get the selected service details
        const serviceOption = document.getElementById('newService').selectedOptions[0];
        const serviceName = serviceOption.textContent.split(' - ')[0];

        const datetime = `${appointmentDate} ${appointmentTime}`;
        
        const appointmentData = {
            customer_name: customerName,
            customer_email: customerEmail,
            customer_phone: customerPhone,
            service_id: parseInt(serviceId),
            datetime: datetime,
            group_size: groupSize
        };

        console.log('Creating appointment with data:', appointmentData);

        const response = await fetch('api/appointments.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(appointmentData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create appointment');
        }

        const result = await response.json();
        showToast('success', 'Appointment created successfully');
        document.getElementById('addAppointmentModal').close();
        
        // Reset form
        document.getElementById('newCustomerName').value = '';
        document.getElementById('newCustomerEmail').value = '';
        document.getElementById('newCustomerPhone').value = '';
        document.getElementById('newService').value = '';
        document.getElementById('newAppointmentDate').value = '';
        document.getElementById('newAppointmentTime').value = '';
        document.getElementById('newGroupSize').value = '1';
        
        await loadAppointments(); // Reload the appointments list
    } catch (error) {
        console.error('Error creating appointment:', error);
        showToast('error', error.message);
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Load initial data
    loadAppointments();
    
    // Add modal event listeners
    const modal = document.getElementById('addAppointmentModal');
    if (modal) {
        console.log('Found appointment modal, adding event listeners');
        modal.addEventListener('show', () => {
            console.log('Modal show event triggered');
            loadServicesForDropdown();
        });
        
        const addAppointmentBtn = document.querySelector('button[onclick="document.getElementById(\'addAppointmentModal\').showModal()"]');
        if (addAppointmentBtn) {
            console.log('Found add appointment button');
            addAppointmentBtn.addEventListener('click', () => {
                console.log('Add appointment button clicked');
                loadServicesForDropdown();
            });
        }
    }
});

// Event listeners for filters
document.getElementById('appointmentStatusFilter').addEventListener('change', displayAppointments);
document.getElementById('appointmentDateFilter').addEventListener('change', displayAppointments);
