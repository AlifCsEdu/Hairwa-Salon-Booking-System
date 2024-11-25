let services = [];

async function loadServices() {
    try {
        const response = await fetch('api/services.php');
        if (!response.ok) {
            throw new Error('Failed to fetch services');
        }
        
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Failed to load services');
        }
        
        services = data.services || [];
        console.log('Loaded services:', services);  // Debug log
        displayServices();
    } catch (error) {
        console.error('Error loading services:', error);
        showToast('error', `Failed to load services: ${error.message}`);
    }
}

function displayServices() {
    // Try to find the services container (for index.html)
    const servicesContainer = document.getElementById('services-container');
    // Try to find the services table body (for dashboard.html)
    const servicesTableBody = document.getElementById('servicesTableBody');

    if (!services || !Array.isArray(services)) {
        console.error('Invalid services data:', services);
        return;
    }

    console.log('Displaying services for:', servicesContainer ? 'index.html' : 'dashboard.html');  // Debug log

    if (servicesContainer) {
        // Grid layout for index.html
        servicesContainer.innerHTML = services.map(service => {
            // Ensure all properties exist with default values
            const safeService = {
                name: service.name || 'Unnamed Service',
                price: service.price || 0,
                image_path: service.image_path || 'img/service-default.jpg'
            };
            
            return `
                <div class="col-lg-4 col-md-4 col-sm-6">
                    <div class="price-item">
                        <div class="price-img">
                            <img src="${escapeHtml(safeService.image_path)}" alt="${escapeHtml(safeService.name)}" onerror="this.src='img/service-default.jpg'">
                        </div>
                        <div class="price-text">
                            <h2>${escapeHtml(safeService.name)}</h2>
                            <h3>RM ${parseFloat(safeService.price).toFixed(2)}</h3>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } else if (servicesTableBody) {
        // Table layout for dashboard.html
        servicesTableBody.innerHTML = services.map(service => {
            // Ensure all properties exist with default values
            const safeService = {
                name: service.name || 'Unnamed Service',
                duration: service.duration || 0,
                price: service.price || 0,
                description: service.description || '',
                image_path: service.image_path || 'img/service-default.jpg',
                id: service.id
            };
            
            return `
                <tr>
                    <td>
                        <div class="flex items-center space-x-3">
                            <div class="avatar">
                                <div class="mask mask-squircle w-12 h-12">
                                    <img src="${escapeHtml(safeService.image_path)}" alt="${escapeHtml(safeService.name)}" onerror="this.src='img/service-default.jpg'" />
                                </div>
                            </div>
                            <div>
                                <div class="font-bold">${escapeHtml(safeService.name)}</div>
                            </div>
                        </div>
                    </td>
                    <td>${escapeHtml(String(safeService.duration))}</td>
                    <td>RM ${parseFloat(safeService.price).toFixed(2)}</td>
                    <td>${escapeHtml(safeService.description)}</td>
                    <td>
                        <div class="flex gap-2">
                            <button class="btn btn-sm btn-ghost text-info" onclick="editService(${safeService.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-ghost text-error" onclick="deleteService(${safeService.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    } else {
        console.error('Neither services container nor table body found');
    }
}

function validateServiceForm(formData) {
    const errors = [];
    
    if (!formData.name || formData.name.trim().length === 0) {
        errors.push('Service name is required');
    }
    
    if (!formData.duration || formData.duration < 1) {
        errors.push('Duration must be at least 1 minute');
    }
    
    if (!formData.price || formData.price < 0) {
        errors.push('Price must be a positive number');
    }
    
    return errors;
}

function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) {
        return '';
    }
    
    // Convert to string if it's not already
    unsafe = String(unsafe);
    
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function handleImageUpload(input) {
    return new Promise((resolve, reject) => {
        if (!input.files || !input.files[0]) {
            resolve(null);
            return;
        }

        const file = input.files[0];
        if (!file.type.startsWith('image/')) {
            reject(new Error('Please select an image file'));
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Error reading file'));
        reader.readAsDataURL(file);
    });
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.showModal();
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.close();
    }
}

async function createService(event) {
    event.preventDefault();
    
    try {
        const form = event.target;
        const formData = {
            name: form.serviceName.value,
            duration: parseInt(form.serviceDuration.value),
            price: parseFloat(form.servicePrice.value),
            description: form.serviceDescription.value
        };

        const errors = validateServiceForm(formData);
        if (errors.length > 0) {
            showToast('error', errors.join('\n'));
            return;
        }

        // Handle image upload
        try {
            formData.image = await handleImageUpload(form.serviceImage);
        } catch (error) {
            showToast('error', error.message);
            return;
        }

        const response = await fetch('api/services.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Failed to create service');
        }

        showToast('success', 'Service created successfully');
        form.reset();
        closeModal('addServiceModal');
        loadServices();
    } catch (error) {
        console.error('Error creating service:', error);
        showToast('error', error.message);
    }
}

async function editService(serviceId) {
    try {
        // Convert serviceId to number since it might be coming as a string
        serviceId = parseInt(serviceId);
        console.log('Looking for service with ID:', serviceId);
        console.log('Available services:', services);
        
        const service = services.find(s => parseInt(s.id) === serviceId);
        if (!service) {
            throw new Error('Service not found');
        }

        // Populate the edit form
        const form = document.getElementById('editServiceForm');
        form.dataset.serviceId = serviceId;
        form.serviceName.value = service.name || '';
        form.serviceDuration.value = service.duration || '';
        form.servicePrice.value = service.price || '';
        form.serviceDescription.value = service.description || '';

        // Show current image
        const currentImage = document.getElementById('currentServiceImage');
        if (currentImage) {
            currentImage.src = service.image_path || 'img/service-default.jpg';
            currentImage.style.display = 'block';
        }

        // Open the modal
        openModal('editServiceModal');
    } catch (error) {
        console.error('Error editing service:', error);
        showToast('error', error.message);
    }
}

async function updateService(event) {
    event.preventDefault();
    
    try {
        const form = event.target;
        const serviceId = parseInt(form.dataset.serviceId);
        
        const formData = {
            id: serviceId,
            name: form.serviceName.value,
            duration: parseInt(form.serviceDuration.value),
            price: parseFloat(form.servicePrice.value),
            description: form.serviceDescription.value
        };

        const errors = validateServiceForm(formData);
        if (errors.length > 0) {
            showToast('error', errors.join('\n'));
            return;
        }

        // Handle image upload
        try {
            formData.image = await handleImageUpload(form.serviceImage);
        } catch (error) {
            showToast('error', error.message);
            return;
        }

        const response = await fetch('api/services.php', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Failed to update service');
        }

        showToast('success', 'Service updated successfully');
        form.reset();
        closeModal('editServiceModal');
        loadServices();
    } catch (error) {
        console.error('Error updating service:', error);
        showToast('error', error.message);
    }
}

async function deleteService(serviceId) {
    try {
        if (!confirm('Are you sure you want to delete this service?')) {
            return;
        }

        const response = await fetch(`api/services.php?id=${serviceId}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Failed to delete service');
        }

        showToast('success', 'Service deleted successfully');
        loadServices();
    } catch (error) {
        console.error('Error deleting service:', error);
        showToast('error', error.message);
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', loadServices);

// Handle form submissions
const addServiceForm = document.getElementById('addServiceForm');
if (addServiceForm) {
    addServiceForm.addEventListener('submit', createService);
}

const editServiceForm = document.getElementById('editServiceForm');
if (editServiceForm) {
    editServiceForm.addEventListener('submit', updateService);
}
