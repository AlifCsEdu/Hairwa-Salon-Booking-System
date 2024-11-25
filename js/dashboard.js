console.log('Dashboard.js loading...');

document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard.js loaded and DOM ready');

    // Cache DOM elements
    const appointmentsTable = document.getElementById('appointments-table');
    const usersTable = document.getElementById('users-table');
    const servicesTable = document.getElementById('services-table');
    const appointmentFilter = document.getElementById('appointment-filter');
    const appointmentDateFilter = document.getElementById('appointment-date-filter');
    const userSearch = document.getElementById('user-search');

    // Load appointments data
    function loadAppointments() {
        console.log('Loading appointments...');
        const status = appointmentFilter ? appointmentFilter.value : 'all';
        const date = appointmentDateFilter ? appointmentDateFilter.value : '';
        
        const params = new URLSearchParams();
        if (status !== 'all') params.append('status', status);
        if (date) params.append('date', date);

        fetch('api/appointments.php?' + params.toString())
            .then(response => {
                if (!response.ok) throw new Error('Failed to load appointments');
                return response.json();
            })
            .then(appointments => {
                console.log('Appointments data:', appointments); // Debug log
                if (!appointmentsTable) {
                    console.error('Appointments table element not found');
                    return;
                }

                appointmentsTable.innerHTML = appointments.map(appointment => {
                    console.log('Processing appointment:', appointment); // Debug log
                    return `
                    <tr>
                        <td>${formatDateTime(appointment.datetime)}</td>
                        <td>
                            <div class="flex items-center space-x-3">
                                <div class="avatar">
                                    <div class="mask mask-squircle w-12 h-12">
                                        <img src="${appointment.customer_image || 'img/default-avatar.png'}" alt="${appointment.customer_name}">
                                    </div>
                                </div>
                                <div>
                                    <div class="font-bold">${appointment.customer_name}</div>
                                    <div class="text-sm opacity-50">${appointment.customer_email}</div>
                                </div>
                            </div>
                        </td>
                        <td>${appointment.service_names || 'No services'}</td>
                        <td>${appointment.group_size}</td>
                        <td>${formatPrice(appointment.total_price)}</td>
                        <td>
                            <span class="badge badge-${getStatusBadge(appointment.status)}">${appointment.status}</span>
                        </td>
                        <td>
                            <div class="tooltip" data-tip="${appointment.notes || 'No notes'}">
                                <i class="fas fa-sticky-note cursor-help ${appointment.notes ? 'text-primary' : 'text-gray-400'}"></i>
                            </div>
                        </td>
                        <td>
                            <div class="flex gap-2">
                                ${getAppointmentActions(appointment)}
                            </div>
                        </td>
                    </tr>
                `}).join('') || '<tr><td colspan="8" class="text-center">No appointments found</td></tr>';
            })
            .catch(error => {
                console.error('Error loading appointments:', error);
                appointmentsTable.innerHTML = '<tr><td colspan="8" class="text-center text-error">Error loading appointments</td></tr>';
            });
    }

    // Load users data
    function loadUsers() {
        console.log('Loading users...');
        fetch('api/users.php')
            .then(response => {
                if (!response.ok) throw new Error('Failed to load users');
                return response.json();
            })
            .then(users => {
                if (!usersTable) {
                    console.error('Users table element not found');
                    return;
                }

                usersTable.innerHTML = users.map(user => `
                    <tr>
                        <td>
                            <div class="avatar">
                                <div class="mask mask-squircle w-12 h-12">
                                    <img src="${user.profile_picture || 'img/default-avatar.png'}" alt="${user.username}">
                                </div>
                            </div>
                        </td>
                        <td>${user.username}</td>
                        <td>${user.email}</td>
                        <td>
                            <div class="form-control">
                                <label class="label cursor-pointer">
                                    <input type="checkbox" class="toggle toggle-primary toggle-sm" 
                                           ${user.isAdmin ? 'checked' : ''} 
                                           onchange="updateUserAdmin(${user.id}, this.checked)">
                                    <span class="label-text ml-2">${user.isAdmin ? 'Admin' : 'User'}</span>
                                </label>
                            </div>
                        </td>
                        <td>
                            <div class="flex gap-2">
                                <button onclick="editUser(${user.id})" class="btn btn-square btn-ghost btn-sm">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="deleteUser(${user.id})" class="btn btn-square btn-ghost btn-sm text-error">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('') || '<tr><td colspan="5" class="text-center">No users found</td></tr>';
            })
            .catch(error => {
                console.error('Error loading users:', error);
                usersTable.innerHTML = '<tr><td colspan="5" class="text-center text-error">Error loading users</td></tr>';
            });
    }

    // Load services data
    function loadServices() {
        console.log('Loading services...');
        fetch('api/services.php')
            .then(response => {
                if (!response.ok) throw new Error('Failed to load services');
                return response.json();
            })
            .then(services => {
                if (!servicesTable) {
                    console.error('Services table element not found');
                    return;
                }

                servicesTable.innerHTML = services.map(service => `
                    <tr>
                        <td>${service.name}</td>
                        <td>${service.duration}</td>
                        <td>${formatPrice(service.price)}</td>
                        <td>${service.description || '-'}</td>
                        <td>
                            <div class="flex gap-2">
                                <button onclick="editService(${service.id})" class="btn btn-square btn-ghost btn-sm">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="deleteService(${service.id})" class="btn btn-square btn-ghost btn-sm text-error">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('') || '<tr><td colspan="5" class="text-center">No services found</td></tr>';
            })
            .catch(error => {
                console.error('Error loading services:', error);
                servicesTable.innerHTML = '<tr><td colspan="5" class="text-center text-error">Error loading services</td></tr>';
            });
    }

    // Helper functions
    function formatDateTime(datetime) {
        return new Date(datetime).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function formatPrice(price) {
        return new Intl.NumberFormat('ms-MY', {
            style: 'currency',
            currency: 'MYR',
            minimumFractionDigits: 2
        }).format(price);
    }

    function getStatusBadge(status) {
        const badges = {
            'pending': 'warning',
            'confirmed': 'info',
            'completed': 'success',
            'cancelled': 'error'
        };
        return badges[status.toLowerCase()] || 'ghost';
    }

    function getAppointmentActions(appointment) {
        const actions = [];
        
        switch (appointment.status.toLowerCase()) {
            case 'pending':
                actions.push(`
                    <button onclick="updateAppointmentStatus(${appointment.id}, 'confirmed')" 
                            class="btn btn-success btn-xs">
                        <i class="fas fa-check"></i> Confirm
                    </button>
                    <button onclick="updateAppointmentStatus(${appointment.id}, 'cancelled')" 
                            class="btn btn-error btn-xs">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                `);
                break;
            case 'confirmed':
                actions.push(`
                    <button onclick="updateAppointmentStatus(${appointment.id}, 'completed')" 
                            class="btn btn-primary btn-xs">
                        <i class="fas fa-check-double"></i> Complete
                    </button>
                    <button onclick="updateAppointmentStatus(${appointment.id}, 'cancelled')" 
                            class="btn btn-error btn-xs">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                `);
                break;
            case 'completed':
                actions.push(`
                    <span class="text-success">
                        <i class="fas fa-check-circle"></i> Completed
                    </span>
                `);
                break;
            case 'cancelled':
                actions.push(`
                    <span class="text-error">
                        <i class="fas fa-times-circle"></i> Cancelled
                    </span>
                `);
                break;
        }
        
        return actions.join('');
    }

    // Event Listeners
    if (appointmentFilter) {
        appointmentFilter.addEventListener('change', loadAppointments);
    }

    if (appointmentDateFilter) {
        appointmentDateFilter.addEventListener('change', loadAppointments);
    }

    if (userSearch) {
        userSearch.addEventListener('input', event => {
            const searchTerm = event.target.value.toLowerCase();
            const rows = usersTable.getElementsByTagName('tr');
            
            Array.from(rows).forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });
    }

    // Load initial data
    loadAppointments();
    loadUsers();
    loadServices();

    // Register section change listener
    document.addEventListener('sectionChanged', function(e) {
        const section = e.detail.section;
        console.log('Section changed to:', section);
        
        // Load data based on the active section
        switch(section) {
            case 'appointments':
                loadAppointments();
                break;
            case 'users':
                loadUsers();
                break;
            case 'services':
                loadServices();
                break;
            case 'dashboard':
                loadAppointments();
                loadUsers();
                loadServices();
                break;
        }
    });

    // Form Elements
    const appointmentFormContainer = document.getElementById('appointment-form-container');
    const appointmentForm = document.getElementById('appointment-form');
    const toggleAppointmentFormBtn = document.getElementById('toggle-appointment-form');
    
    const userFormContainer = document.getElementById('user-form-container');
    const userForm = document.getElementById('user-form');
    const toggleUserFormBtn = document.getElementById('toggle-user-form');
    
    const serviceFormContainer = document.getElementById('service-form-container');
    const serviceForm = document.getElementById('service-form');

    console.log('Form elements initialized:', {
        appointmentFormContainer: !!appointmentFormContainer,
        appointmentForm: !!appointmentForm,
        toggleAppointmentFormBtn: !!toggleAppointmentFormBtn,
        userFormContainer: !!userFormContainer,
        userForm: !!userForm,
        toggleUserFormBtn: !!toggleUserFormBtn,
        serviceFormContainer: !!serviceFormContainer,
        serviceForm: !!serviceForm
    });

    // Form toggle functionality
    function toggleForm(formId) {
        console.log('Toggling form:', formId);
        const formContainer = document.getElementById(`${formId}-container`);
        if (formContainer) {
            formContainer.classList.toggle('hidden');
            console.log('Form container toggled');
        } else {
            console.warn('Form container not found:', formId);
        }
    }

    // Form event listeners
    if (toggleAppointmentFormBtn) {
        toggleAppointmentFormBtn.addEventListener('click', () => {
            console.log('Appointment form button clicked');
            toggleForm('appointment-form');
            loadFormData();
        });
    }

    if (toggleUserFormBtn) {
        toggleUserFormBtn.addEventListener('click', () => {
            console.log('User form button clicked');
            toggleForm('user-form');
        });
    }

    // Appointments Management
    const appointmentsTable = document.getElementById('appointments-table');
    const appointmentFilter = document.getElementById('appointment-filter');
    const appointmentDateFilter = document.getElementById('appointment-date-filter');

    function loadAppointments() {
        console.log('Loading appointments...');
        const status = appointmentFilter ? appointmentFilter.value : 'all';
        const date = appointmentDateFilter ? appointmentDateFilter.value : '';
        
        console.log('Filter values:', { status, date });
        
        const params = new URLSearchParams();
        if (status !== 'all') params.append('status', status);
        if (date) params.append('date', date);

        const url = 'api/appointments.php?' + params.toString();
        console.log('Fetching appointments from:', url);

        fetch(url)
            .then(response => {
                console.log('Appointments response status:', response.status);
                if (!response.ok) {
                    throw new Error('Failed to load appointments');
                }
                return response.json();
            })
            .then(appointments => {
                console.log('Appointments data:', appointments); // Debug log
                if (!appointmentsTable) {
                    console.error('Appointments table element not found');
                    return;
                }
                appointmentsTable.innerHTML = appointments.map(appointment => {
                    console.log('Processing appointment:', appointment); // Debug log
                    return `
                    <tr>
                        <td>${formatDateTime(appointment.datetime)}</td>
                        <td>
                            <div class="flex items-center space-x-3">
                                <div class="avatar">
                                    <div class="mask mask-squircle w-12 h-12">
                                        <img src="${appointment.customer_image || 'img/default-avatar.png'}" alt="${appointment.customer_name}">
                                    </div>
                                </div>
                                <div>
                                    <div class="font-bold">${appointment.customer_name}</div>
                                    <div class="text-sm opacity-50">${appointment.customer_email}</div>
                                </div>
                            </div>
                        </td>
                        <td>${appointment.service_names || 'No services'}</td>
                        <td>${appointment.group_size}</td>
                        <td>${formatPrice(appointment.total_price)}</td>
                        <td>
                            <span class="badge badge-${getStatusBadge(appointment.status)}">${appointment.status}</span>
                        </td>
                        <td>
                            <div class="tooltip" data-tip="${appointment.notes || 'No notes'}">
                                <i class="fas fa-sticky-note cursor-help ${appointment.notes ? 'text-primary' : 'text-gray-400'}"></i>
                            </div>
                        </td>
                        <td>
                            ${getAppointmentActions(appointment)}
                        </td>
                    </tr>
                `}).join('');
            })
            .catch(error => {
                console.error('Error loading appointments:', error);
                if (appointmentsTable) {
                    appointmentsTable.innerHTML = '<tr><td colspan="8" class="text-center text-error">Error loading appointments</td></tr>';
                }
            });
    }

    function formatDateTime(datetime) {
        return new Date(datetime).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function formatPrice(price) {
        return new Intl.NumberFormat('ms-MY', {
            style: 'currency',
            currency: 'MYR',
            minimumFractionDigits: 2
        }).format(price);
    }

    function getStatusBadge(status) {
        const badges = {
            'pending': 'warning',
            'confirmed': 'info',
            'completed': 'success',
            'cancelled': 'error'
        };
        return badges[status.toLowerCase()] || 'ghost';
    }

    function getAppointmentActions(appointment) {
        const actions = [];
        
        switch (appointment.status) {
            case 'pending':
                actions.push(`
                    <button onclick="updateAppointmentStatus(${appointment.id}, 'confirmed')" 
                            class="btn btn-success btn-xs">
                        <i class="fas fa-check"></i> Confirm
                    </button>
                    <button onclick="updateAppointmentStatus(${appointment.id}, 'cancelled')" 
                            class="btn btn-error btn-xs">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                `);
                break;
            case 'confirmed':
                actions.push(`
                    <button onclick="updateAppointmentStatus(${appointment.id}, 'completed')" 
                            class="btn btn-primary btn-xs">
                        <i class="fas fa-check-double"></i> Complete
                    </button>
                    <button onclick="updateAppointmentStatus(${appointment.id}, 'cancelled')" 
                            class="btn btn-error btn-xs">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                `);
                break;
            case 'completed':
                actions.push(`
                    <span class="text-success">
                        <i class="fas fa-check-circle"></i> Completed
                    </span>
                `);
                break;
            case 'cancelled':
                actions.push(`
                    <span class="text-error">
                        <i class="fas fa-ban"></i> Cancelled
                    </span>
                `);
                break;
        }
        
        return actions.join('');
    }

    // Users Management
    const usersTable = document.getElementById('users-table');
    let isUserFormOpen = false;

    window.addNewUser = function() {
        if (isUserFormOpen) return;
        isUserFormOpen = true;

        // Remove any existing form
        const existingForm = document.querySelector('.user-form-row');
        if (existingForm) existingForm.remove();

        // Create a new row at the top of the table
        const tbody = usersTable;
        const newRow = tbody.insertRow(0);
        newRow.className = 'user-form-row';
        newRow.innerHTML = `
            <td colspan="4">
                <form onsubmit="return saveUser(event)" class="flex gap-4 items-end">
                    <div class="form-control flex-1">
                        <label class="label">
                            <span class="label-text">Name</span>
                        </label>
                        <input type="text" name="name" placeholder="Full name" class="input input-bordered input-sm" required>
                    </div>
                    <div class="form-control flex-1">
                        <label class="label">
                            <span class="label-text">Email</span>
                        </label>
                        <input type="email" name="email" placeholder="Email address" class="input input-bordered input-sm" required>
                    </div>
                    <div class="form-control flex-1">
                        <label class="label">
                            <span class="label-text">Phone</span>
                        </label>
                        <input type="tel" name="phone" placeholder="Phone number" class="input input-bordered input-sm" required>
                    </div>
                    <div class="flex gap-2">
                        <button type="submit" class="btn btn-primary btn-sm">Save</button>
                        <button type="button" onclick="cancelUserEdit()" class="btn btn-ghost btn-sm">Cancel</button>
                    </div>
                </form>
            </td>
        `;
    };

    window.editUser = async function(id, row) {
        if (isUserFormOpen) return;
        isUserFormOpen = true;

        try {
            const response = await fetch(`api/users.php?id=${id}`);
            if (!response.ok) {
                throw new Error('Failed to fetch user');
            }
            const user = await response.json();
            
            if (!user) {
                showToast('User not found', 'error');
                return;
            }

            // Replace the row with an inline form
            const tr = row.closest('tr');
            tr.innerHTML = `
                <td colspan="4">
                    <form onsubmit="return saveUser(event, ${id})" class="flex gap-4 items-end">
                        <div class="form-control flex-1">
                            <label class="label">
                                <span class="label-text">Name</span>
                            </label>
                            <input type="text" name="name" value="${user.name}" class="input input-bordered input-sm" required>
                        </div>
                        <div class="form-control flex-1">
                            <label class="label">
                                <span class="label-text">Email</span>
                            </label>
                            <input type="email" name="email" value="${user.email}" class="input input-bordered input-sm" required>
                        </div>
                        <div class="form-control flex-1">
                            <label class="label">
                                <span class="label-text">Phone</span>
                            </label>
                            <input type="tel" name="phone" value="${user.phone}" class="input input-bordered input-sm" required>
                        </div>
                        <div class="flex gap-2">
                            <button type="submit" class="btn btn-primary btn-sm">Save</button>
                            <button type="button" onclick="cancelUserEdit()" class="btn btn-ghost btn-sm">Cancel</button>
                        </div>
                    </form>
                </td>
            `;
        } catch (error) {
            console.error('Error loading user:', error);
            showToast('Error loading user details', 'error');
            isUserFormOpen = false;
        }
    };

    window.cancelUserEdit = function() {
        isUserFormOpen = false;
        loadUsers();
    };

    window.saveUser = async function(event, id = null) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        if (id) data.id = id;
        
        try {
            const method = id ? 'PUT' : 'POST';
            const response = await fetch('api/users.php', {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save user');
            }

            showToast(id ? 'User updated successfully' : 'User created successfully', 'success');
            isUserFormOpen = false;
            loadUsers();
        } catch (error) {
            console.error('Error saving user:', error);
            showToast(error.message || 'Error saving user', 'error');
        }
        return false;
    };

    // Appointments Management
    const appointmentsTable = document.getElementById('appointments-table');
    let isAppointmentFormOpen = false;

    window.addNewAppointment = function() {
        if (isAppointmentFormOpen) return;
        isAppointmentFormOpen = true;

        // Remove any existing form
        const existingForm = document.querySelector('.appointment-form-row');
        if (existingForm) existingForm.remove();

        // Create a new row at the top of the table
        const tbody = appointmentsTable;
        const newRow = tbody.insertRow(0);
        newRow.className = 'appointment-form-row';
        newRow.innerHTML = `
            <td colspan="6">
                <form onsubmit="return saveAppointment(event)" class="flex gap-4 items-end">
                    <div class="form-control">
                        <label class="label">
                            <span class="label-text">Customer</span>
                        </label>
                        <select name="user_id" class="select select-bordered select-sm" required>
                            <option value="">Select customer</option>
                            <!-- Users will be loaded here -->
                        </select>
                    </div>
                    <div class="form-control">
                        <label class="label">
                            <span class="label-text">Service</span>
                        </label>
                        <select name="service_id" class="select select-bordered select-sm" required>
                            <option value="">Select service</option>
                            <!-- Services will be loaded here -->
                        </select>
                    </div>
                    <div class="form-control">
                        <label class="label">
                            <span class="label-text">Date</span>
                        </label>
                        <input type="date" name="date" class="input input-bordered input-sm" required>
                    </div>
                    <div class="form-control">
                        <label class="label">
                            <span class="label-text">Time</span>
                        </label>
                        <input type="time" name="time" class="input input-bordered input-sm" required>
                    </div>
                    <div class="form-control">
                        <label class="label">
                            <span class="label-text">Status</span>
                        </label>
                        <select name="status" class="select select-bordered select-sm" required>
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                    <div class="flex gap-2">
                        <button type="submit" class="btn btn-primary btn-sm">Save</button>
                        <button type="button" onclick="cancelAppointmentEdit()" class="btn btn-ghost btn-sm">Cancel</button>
                    </div>
                </form>
            </td>
        `;

        // Load users and services for the dropdowns
        loadUsersForSelect();
        loadServicesForSelect();
    };

    function loadUsersForSelect() {
        fetch('api/users.php')
            .then(response => response.json())
            .then(users => {
                const userSelect = document.querySelector('select[name="user_id"]');
                if (userSelect) {
                    userSelect.innerHTML = `
                        <option value="">Select customer</option>
                        ${users.map(user => `
                            <option value="${user.id}">${user.name}</option>
                        `).join('')}
                    `;
                }
            })
            .catch(error => console.error('Error loading users:', error));
    }

    function loadServicesForSelect() {
        fetch('api/services.php')
            .then(response => response.json())
            .then(services => {
                const serviceSelect = document.querySelector('select[name="service_id"]');
                if (serviceSelect) {
                    serviceSelect.innerHTML = `
                        <option value="">Select service</option>
                        ${services.map(service => `
                            <option value="${service.id}">${service.name} - ${formatPrice(service.price)}</option>
                        `).join('')}
                    `;
                }
            })
            .catch(error => console.error('Error loading services:', error));
    }

    window.cancelAppointmentEdit = function() {
        isAppointmentFormOpen = false;
        loadAppointments();
    };

    window.saveAppointment = async function(event, id = null) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // Combine date and time
        data.datetime = `${data.date} ${data.time}`;
        delete data.date;
        delete data.time;
        
        if (id) data.id = id;
        
        try {
            const method = id ? 'PUT' : 'POST';
            const response = await fetch('api/appointments.php', {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save appointment');
            }

            showToast(id ? 'Appointment updated successfully' : 'Appointment created successfully', 'success');
            isAppointmentFormOpen = false;
            loadAppointments();
        } catch (error) {
            console.error('Error saving appointment:', error);
            showToast(error.message || 'Error saving appointment', 'error');
        }
        return false;
    };

    // Services Management
    const servicesTable = document.getElementById('services-table');
    let isFormOpen = false; // Track if a form is currently open

    window.editService = async function(id, row) {
        if (isFormOpen) return; // Prevent multiple forms
        isFormOpen = true;

        try {
            const response = await fetch(`api/services.php?id=${id}`);
            if (!response.ok) {
                throw new Error('Failed to fetch service');
            }
            const service = await response.json();
            
            if (!service) {
                showToast('Service not found', 'error');
                return;
            }

            // Replace the row with an inline form
            const tr = row.closest('tr');
            tr.innerHTML = `
                <td colspan="4">
                    <form onsubmit="return saveService(event, ${id})" class="flex gap-4 items-end">
                        <div class="form-control flex-1">
                            <label class="label">
                                <span class="label-text">Name</span>
                            </label>
                            <input type="text" name="name" value="${service.name}" class="input input-bordered input-sm" required>
                        </div>
                        <div class="form-control">
                            <label class="label">
                                <span class="label-text">Duration (min)</span>
                            </label>
                            <input type="number" name="duration" value="${service.duration}" class="input input-bordered input-sm w-24" required>
                        </div>
                        <div class="form-control">
                            <label class="label">
                                <span class="label-text">Price (RM)</span>
                            </label>
                            <input type="number" name="price" value="${service.price}" step="0.01" class="input input-bordered input-sm w-24" required>
                        </div>
                        <div class="flex gap-2">
                            <button type="submit" class="btn btn-primary btn-sm">Save</button>
                            <button type="button" onclick="cancelEdit()" class="btn btn-ghost btn-sm">Cancel</button>
                        </div>
                    </form>
                </td>
            `;
        } catch (error) {
            console.error('Error loading service:', error);
            showToast('Error loading service details', 'error');
            isFormOpen = false;
        }
    };

    window.addNewService = function() {
        if (isFormOpen) return; // Prevent multiple forms
        isFormOpen = true;

        // Remove any existing form first
        const existingForm = document.querySelector('.service-form-row');
        if (existingForm) existingForm.remove();

        // Create a new row at the top of the table
        const tbody = servicesTable;
        const newRow = tbody.insertRow(0);
        newRow.className = 'service-form-row';
        newRow.innerHTML = `
            <td colspan="4">
                <form onsubmit="return saveService(event)" class="flex gap-4 items-end">
                    <div class="form-control flex-1">
                        <label class="label">
                            <span class="label-text">Name</span>
                        </label>
                        <input type="text" name="name" placeholder="Service name" class="input input-bordered input-sm" required>
                    </div>
                    <div class="form-control">
                        <label class="label">
                            <span class="label-text">Duration (min)</span>
                        </label>
                        <input type="number" name="duration" placeholder="Duration" class="input input-bordered input-sm w-24" required>
                    </div>
                    <div class="form-control">
                        <label class="label">
                            <span class="label-text">Price (RM)</span>
                        </label>
                        <input type="number" name="price" placeholder="Price" step="0.01" class="input input-bordered input-sm w-24" required>
                    </div>
                    <div class="flex gap-2">
                        <button type="submit" class="btn btn-primary btn-sm">Save</button>
                        <button type="button" onclick="cancelEdit()" class="btn btn-ghost btn-sm">Cancel</button>
                    </div>
                </form>
            </td>
        `;
    };

    window.cancelEdit = function() {
        isFormOpen = false;
        loadServices(); // Reload the table to its normal state
    };

    window.saveService = async function(event, id = null) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        if (id) data.id = id;
        
        try {
            const method = id ? 'PUT' : 'POST';
            const response = await fetch('api/services.php', {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save service');
            }

            showToast(id ? 'Service updated successfully' : 'Service created successfully', 'success');
            isFormOpen = false;
            loadServices(); // Refresh the table
        } catch (error) {
            console.error('Error saving service:', error);
            showToast(error.message || 'Error saving service', 'error');
        }
        return false;
    };

    window.deleteService = async function(id) {
        if (!confirm('Are you sure you want to delete this service?')) {
            return;
        }

        try {
            const response = await fetch(`api/services.php?id=${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete service');
            }

            showToast('Service deleted successfully', 'success');
            loadServices(); // Refresh the services list
        } catch (error) {
            console.error('Error deleting service:', error);
            showToast(error.message || 'Error deleting service', 'error');
        }
    };

    function loadServices() {
        console.log('Loading services...');
        fetch('api/services.php')
            .then(response => {
                console.log('Services response status:', response.status);
                if (!response.ok) {
                    throw new Error('Failed to load services');
                }
                return response.json();
            })
            .then(services => {
                console.log('Received services:', services);
                if (!servicesTable) {
                    console.error('Services table element not found');
                    return;
                }
                servicesTable.innerHTML = services.map(service => `
                    <tr>
                        <td>${service.name}</td>
                        <td>${service.duration} minutes</td>
                        <td>${formatPrice(service.price)}</td>
                        <td>
                            <div class="flex gap-2">
                                <button onclick="editService(${service.id}, this)" class="btn btn-info btn-xs">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                                <button onclick="deleteService(${service.id})" class="btn btn-error btn-xs">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('');

                // Update service select in appointment form
                const serviceSelect = document.querySelector('#appointment-form select[name="service_id"]');
                if (serviceSelect) {
                    serviceSelect.innerHTML = `
                        <option value="">Select a service</option>
                        ${services.map(service => `
                            <option value="${service.id}">${service.name} - ${formatPrice(service.price)}</option>
                        `).join('')}
                    `;
                }
            })
            .catch(error => {
                console.error('Error loading services:', error);
                showToast('Error loading services', 'error');
                servicesTable.innerHTML = '<tr><td colspan="4" class="text-center text-error">Error loading services</td></tr>';
            });
    }

    // Handle service form submission
    if (serviceForm) {
        serviceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(serviceForm);
            const data = Object.fromEntries(formData.entries());
            data.isAdmin = formData.get('isAdmin') === 'on';
            
            try {
                const response = await fetch('api/services.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                
                if (response.ok) {
                    serviceForm.reset();
                    if (serviceFormContainer) hideForm(serviceFormContainer);
                    // Refresh the services list
                    loadServices();
                }
            } catch (error) {
                console.error('Error:', error);
            }
        });
    }

    // Load users and services for appointment form
    async function loadFormData() {
        console.log('Loading form data...');
        try {
            // Load users
            const usersResponse = await fetch('api/users.php');
            const users = await usersResponse.json();
            const userSelect = document.querySelector('select[name="user_id"]');
            if (userSelect) {
                userSelect.innerHTML = '<option value="">Select a customer</option>' +
                    users.map(user => `<option value="${user.id}">${user.username} (${user.email})</option>`).join('');
            }

            // Load services
            const servicesResponse = await fetch('api/services.php');
            const services = await servicesResponse.json();
            const serviceSelect = document.querySelector('select[name="service_id"]');
            if (serviceSelect) {
                serviceSelect.innerHTML = '<option value="">Select a service</option>' +
                    services.map(service => `<option value="${service.id}">${service.name} (${formatPrice(service.price)})</option>`).join('');
            }
        } catch (error) {
            console.error('Error loading form data:', error);
            showToast('Error loading form data', 'error');
        }
    }

    // Form submission handlers
    if (appointmentForm) {
        appointmentForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('Submitting appointment form...');

            const formData = {
                user_id: parseInt(document.querySelector('select[name="user_id"]').value),
                service_id: parseInt(document.querySelector('select[name="service_id"]').value),
                datetime: document.querySelector('input[name="datetime"]').value,
                group_size: parseInt(document.querySelector('input[name="group_size"]')?.value || "1"),
                notes: document.querySelector('textarea[name="notes"]')?.value || ""
            };

            console.log('Form data:', formData);

            try {
                const response = await fetch('api/appointments.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();
                console.log('Server response:', data);

                if (data.success) {
                    showToast('Appointment created successfully', 'success');
                    appointmentForm.reset();
                    toggleForm('appointment-form');
                    loadAppointments();
                } else {
                    showToast(data.error || 'Failed to create appointment', 'error');
                }
            } catch (error) {
                console.error('Error submitting appointment:', error);
                showToast('Failed to create appointment. Please check the console for details.', 'error');
            }
        });
    }

    if (userForm) {
        userForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(userForm);
            const data = Object.fromEntries(formData.entries());
            data.isAdmin = formData.get('isAdmin') === 'on';
            
            try {
                const response = await fetch('api/users.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                
                if (response.ok) {
                    userForm.reset();
                    if (userFormContainer) hideForm(userFormContainer);
                    // Refresh the users list
                    loadUsers();
                }
            } catch (error) {
                console.error('Error:', error);
            }
        });
    }

    // Global Functions
    window.updateAppointmentStatus = function(id, status) {
        fetch('api/appointments.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id, status })
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                loadAppointments();
            }
        })
        .catch(error => console.error('Error updating appointment:', error));
    };

    window.updateUserAdmin = function(id, isAdmin) {
        fetch('api/users.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id, isAdmin, action: 'update_admin' })
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                loadUsers();
            }
        })
        .catch(error => console.error('Error updating user:', error));
    };

    window.deleteUser = function(id) {
        if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            fetch(`api/users.php?id=${id}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    loadUsers();
                }
            })
            .catch(error => console.error('Error deleting user:', error));
        }
    };

    // Form toggle functions
    function showForm(formContainer) {
        if (formContainer) {
            formContainer.classList.remove('hidden');
            // Trigger reflow to ensure animation works
            void formContainer.offsetWidth;
            formContainer.classList.add('show');
        }
    }

    function hideForm(formContainer) {
        if (formContainer) {
            formContainer.classList.remove('show');
            // Wait for animation to complete before hiding
            setTimeout(() => {
                formContainer.classList.add('hidden');
            }, 300); // Match the CSS transition duration
        }
    }

    // Toast notification function
    function showToast(message, type = 'info') {
        // Create toast container if it doesn't exist
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2';
            document.body.appendChild(toastContainer);
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `alert ${getAlertClass(type)} shadow-lg max-w-sm`;
        toast.innerHTML = `
            <div class="flex items-center gap-2">
                ${getAlertIcon(type)}
                <span>${message}</span>
            </div>
        `;

        // Add toast to container
        toastContainer.appendChild(toast);

        // Remove toast after 3 seconds
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => {
                toast.remove();
                // Remove container if empty
                if (toastContainer.children.length === 0) {
                    toastContainer.remove();
                }
            }, 300);
        }, 3000);
    }

    // Helper functions for toast
    function getAlertClass(type) {
        switch (type) {
            case 'success': return 'alert-success';
            case 'error': return 'alert-error';
            case 'warning': return 'alert-warning';
            default: return 'alert-info';
        }
    }

    function getAlertIcon(type) {
        switch (type) {
            case 'success':
                return '<i class="fas fa-check-circle"></i>';
            case 'error':
                return '<i class="fas fa-exclamation-circle"></i>';
            case 'warning':
                return '<i class="fas fa-exclamation-triangle"></i>';
            default:
                return '<i class="fas fa-info-circle"></i>';
        }
    }

    // Event listeners for filters
    if (appointmentFilter) {
        appointmentFilter.addEventListener('change', loadAppointments);
    }
    if (appointmentDateFilter) {
        appointmentDateFilter.addEventListener('change', loadAppointments);
    }
    if (usersSearch) {
        usersSearch.addEventListener('input', loadUsers);
    }

    // Logout functionality
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('user');
            window.location.href = 'index.html';
        });
    }

    // Initial load of dashboard data
    loadAppointments();
    loadUsers();
    loadServices();
});

console.log('Dashboard.js loaded!');

// Check if user is logged in and is admin
document.addEventListener('DOMContentLoaded', function() {
    checkAdminStatus();
    loadAppointments();
    setupEventListeners();
});

function checkAdminStatus() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.isAdmin) {
        window.location.href = 'login.html';
        return;
    }
    document.getElementById('adminCheck').style.display = 'none';
}

// Event Listeners
function setupEventListeners() {
    // Appointments
    document.getElementById('appointmentStatusFilter').addEventListener('change', loadAppointments);
    document.getElementById('appointmentDateFilter').addEventListener('change', loadAppointments);

    // Users
    document.getElementById('userSearchInput').addEventListener('input', debounce(loadUsers, 300));

    // Services
    document.getElementById('addServiceBtn').addEventListener('click', () => {
        document.getElementById('serviceModalTitle').textContent = 'Add New Service';
        document.getElementById('serviceModal').showModal();
    });

    document.getElementById('saveServiceBtn').addEventListener('click', saveService);

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logout);
}

// Appointments Functions
async function loadAppointments() {
    try {
        const status = document.getElementById('appointmentStatusFilter').value;
        const date = document.getElementById('appointmentDateFilter').value;
        
        let url = 'api/appointments.php';
        const params = new URLSearchParams();
        if (status !== 'all') params.append('status', status);
        if (date) params.append('date', date);
        if (params.toString()) url += '?' + params.toString();

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch appointments');
        
        const appointments = await response.json();
        const tbody = document.getElementById('appointmentsTableBody');
        tbody.innerHTML = '';

        appointments.forEach(appointment => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    ${formatDate(appointment.appointment_date)}
                    <br>
                    <span class="text-sm opacity-70">${formatTime(appointment.appointment_time)}</span>
                </td>
                <td>
                    ${appointment.client_name}
                    <br>
                    <span class="text-sm opacity-70">${appointment.email || 'No email'}</span>
                </td>
                <td>
                    ${appointment.service_names || 'No services'}
                    <br>
                    <span class="text-sm opacity-70">${appointment.duration} mins</span>
                </td>
                <td>${appointment.group_size || 1}</td>
                <td>$${calculateTotalPrice(appointment.price, appointment.group_size || 1)}</td>
                <td>${getStatusBadge(appointment.status)}</td>
                <td>
                    ${getAppointmentActions(appointment)}
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading appointments:', error);
        showToast('error', 'Failed to load appointments');
    }
}

function getStatusBadge(status) {
    const badges = {
        pending: 'badge-warning',
        confirmed: 'badge-success',
        completed: 'badge-info',
        cancelled: 'badge-error'
    };
    return `<span class="badge ${badges[status] || 'badge-ghost'}">${status}</span>`;
}

function getAppointmentActions(appointment) {
    const actions = [];
    
    if (appointment.status === 'pending') {
        actions.push(`<button onclick="updateAppointmentStatus(${appointment.id}, 'confirmed')" class="btn btn-xs btn-success">Confirm</button>`);
        actions.push(`<button onclick="updateAppointmentStatus(${appointment.id}, 'cancelled')" class="btn btn-xs btn-error">Cancel</button>`);
    } else if (appointment.status === 'confirmed') {
        actions.push(`<button onclick="updateAppointmentStatus(${appointment.id}, 'completed')" class="btn btn-xs btn-info">Complete</button>`);
        actions.push(`<button onclick="updateAppointmentStatus(${appointment.id}, 'cancelled')" class="btn btn-xs btn-error">Cancel</button>`);
    }
    
    return actions.join(' ');
}

async function updateAppointmentStatus(id, status) {
    try {
        const response = await fetch('api/appointments.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status, action: 'update_status' })
        });

        if (!response.ok) throw new Error('Failed to update status');
        
        await loadAppointments();
        showToast('success', 'Appointment status updated');
    } catch (error) {
        console.error('Error updating appointment:', error);
        showToast('error', 'Failed to update appointment status');
    }
}

// Users Functions
async function loadUsers() {
    try {
        const search = document.getElementById('userSearchInput').value;
        let url = 'api/users.php';
        if (search) url += `?search=${encodeURIComponent(search)}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch users');
        
        const users = await response.json();
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = '';

        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div class="avatar">
                        <div class="w-12 rounded-full">
                            <img src="${user.profile_picture || 'img/default-avatar.png'}" alt="Profile" />
                        </div>
                    </div>
                </td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>
                    <input type="checkbox" class="toggle toggle-primary" 
                           ${user.isAdmin ? 'checked' : ''} 
                           onchange="updateUserAdmin(${user.id}, this.checked)" />
                </td>
                <td>
                    <button onclick="deleteUser(${user.id})" class="btn btn-error btn-xs">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading users:', error);
        showToast('error', 'Failed to load users');
    }
}

async function updateUserAdmin(id, isAdmin) {
    try {
        const response = await fetch('api/users.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, isAdmin, action: 'update_admin' })
        });

        if (!response.ok) throw new Error('Failed to update user');
        
        showToast('success', 'User admin status updated');
    } catch (error) {
        console.error('Error updating user:', error);
        showToast('error', 'Failed to update user');
        loadUsers(); // Reload to reset the toggle
    }
}

async function deleteUser(id) {
    const modal = document.getElementById('deleteModal');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    
    const handleDelete = async () => {
        try {
            const response = await fetch(`api/users.php?id=${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to delete user');
            
            await loadUsers();
            showToast('success', 'User deleted successfully');
        } catch (error) {
            console.error('Error deleting user:', error);
            showToast('error', 'Failed to delete user');
        } finally {
            modal.close();
            confirmBtn.removeEventListener('click', handleDelete);
        }
    };

    confirmBtn.addEventListener('click', handleDelete);
    modal.showModal();
}

// Services Functions
async function loadServices() {
    try {
        const response = await fetch('api/services.php');
        if (!response.ok) throw new Error('Failed to fetch services');
        
        const services = await response.json();
        const tbody = document.getElementById('servicesTableBody');
        tbody.innerHTML = '';

        services.forEach(service => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${service.name}</td>
                <td>${service.duration}</td>
                <td>$${service.price}</td>
                <td>${service.description || ''}</td>
                <td>
                    <button onclick="editService(${JSON.stringify(service)})" class="btn btn-info btn-xs">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteService(${service.id})" class="btn btn-error btn-xs">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading services:', error);
        showToast('error', 'Failed to load services');
    }
}

function editService(service) {
    document.getElementById('serviceModalTitle').textContent = 'Edit Service';
    document.getElementById('serviceName').value = service.name;
    document.getElementById('serviceDuration').value = service.duration;
    document.getElementById('servicePrice').value = service.price;
    document.getElementById('serviceDescription').value = service.description || '';
    document.getElementById('serviceModal').setAttribute('data-id', service.id);
    document.getElementById('serviceModal').showModal();
}

async function saveService(event) {
    event.preventDefault();
    
    const serviceData = {
        name: document.getElementById('serviceName').value,
        duration: parseInt(document.getElementById('serviceDuration').value),
        price: parseFloat(document.getElementById('servicePrice').value),
        description: document.getElementById('serviceDescription').value
    };

    const id = document.getElementById('serviceModal').getAttribute('data-id');
    const method = id ? 'PUT' : 'POST';
    if (id) serviceData.id = id;

    try {
        const response = await fetch('api/services.php', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(serviceData)
        });

        if (!response.ok) throw new Error('Failed to save service');
        
        document.getElementById('serviceModal').close();
        await loadServices();
        showToast('success', `Service ${id ? 'updated' : 'added'} successfully`);
    } catch (error) {
        console.error('Error saving service:', error);
        showToast('error', 'Failed to save service');
    }
}

async function deleteService(id) {
    const modal = document.getElementById('deleteModal');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    
    const handleDelete = async () => {
        try {
            const response = await fetch(`api/services.php?id=${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to delete service');
            
            await loadServices();
            showToast('success', 'Service deleted successfully');
        } catch (error) {
            console.error('Error deleting service:', error);
            showToast('error', 'Failed to delete service');
        } finally {
            modal.close();
            confirmBtn.removeEventListener('click', handleDelete);
        }
    };

    confirmBtn.addEventListener('click', handleDelete);
    modal.showModal();
}

// Utility Functions
function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString();
}

function formatTime(timeStr) {
    return new Date(`1970-01-01T${timeStr}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function calculateTotalPrice(price, groupSize) {
    return (price * groupSize).toFixed(2);
}

function showToast(type, message) {
    // Implement your preferred toast notification system
    alert(message);
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

function logout() {
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}
