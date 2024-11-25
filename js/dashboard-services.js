let services = [];

async function loadServices() {
    try {
        const response = await fetch('api/services.php');
        if (!response.ok) throw new Error('Failed to fetch services');
        
        services = await response.json();
        displayServices();
    } catch (error) {
        console.error('Error loading services:', error);
        showToast('error', 'Failed to load services');
    }
}

function displayServices() {
    const servicesTableBody = document.getElementById('servicesTableBody');
    if (!servicesTableBody) {
        console.error('Services table body not found');
        return;
    }

    servicesTableBody.innerHTML = services.map(service => `
        <tr>
            <td>${service.name}</td>
            <td>${service.duration}</td>
            <td>$${service.price}</td>
            <td>${service.description}</td>
            <td>
                <div class="flex gap-2">
                    <button class="btn btn-sm btn-primary" onclick="editService(${service.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-error" onclick="deleteService(${service.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function addService(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const serviceData = Object.fromEntries(formData.entries());

    try {
        const response = await fetch('api/services.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(serviceData)
        });

        if (!response.ok) throw new Error('Failed to add service');
        
        showToast('success', 'Service added successfully');
        document.getElementById('serviceModal').close();
        event.target.reset();
        await loadServices();
    } catch (error) {
        console.error('Error adding service:', error);
        showToast('error', 'Failed to add service');
    }
}

async function editService(serviceId) {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    const modal = document.getElementById('serviceModal');
    const form = modal.querySelector('form');
    
    // Populate form fields
    form.elements['name'].value = service.name;
    form.elements['description'].value = service.description;
    form.elements['duration'].value = service.duration;
    form.elements['price'].value = service.price;
    form.dataset.serviceId = serviceId;

    modal.showModal();
}

async function updateService(event) {
    event.preventDefault();
    
    const form = event.target;
    const serviceId = form.dataset.serviceId;
    const formData = new FormData(form);
    const serviceData = Object.fromEntries(formData.entries());

    try {
        const response = await fetch(`api/services.php?id=${serviceId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(serviceData)
        });

        if (!response.ok) throw new Error('Failed to update service');
        
        showToast('success', 'Service updated successfully');
        document.getElementById('serviceModal').close();
        await loadServices();
    } catch (error) {
        console.error('Error updating service:', error);
        showToast('error', 'Failed to update service');
    }
}

async function deleteService(serviceId) {
    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
        const response = await fetch(`api/services.php?id=${serviceId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete service');
        
        showToast('success', 'Service deleted successfully');
        await loadServices();
    } catch (error) {
        console.error('Error deleting service:', error);
        showToast('error', 'Failed to delete service');
    }
}

async function createService() {
    try {
        const formData = new FormData();
        const name = document.getElementById('newServiceName').value;
        const duration = document.getElementById('newServiceDuration').value;
        const price = document.getElementById('newServicePrice').value;
        const description = document.getElementById('newServiceDescription').value;
        const serviceImage = document.getElementById('newServiceImage').files[0];

        // Create the data object
        const serviceData = {
            name: name,
            duration: parseInt(duration),
            price: parseFloat(price),
            description: description
        };

        // If there's an image, read it as base64
        if (serviceImage) {
            const reader = new FileReader();
            reader.readAsDataURL(serviceImage);
            await new Promise((resolve, reject) => {
                reader.onload = () => {
                    serviceData.image = reader.result;
                    resolve();
                };
                reader.onerror = reject;
            });
        }

        const response = await fetch('api/services.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(serviceData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create service');
        }

        const result = await response.json();
        showToast('success', 'Service created successfully');
        document.getElementById('addServiceModal').close();
        
        // Reset form
        document.getElementById('newServiceName').value = '';
        document.getElementById('newServiceDuration').value = '';
        document.getElementById('newServicePrice').value = '';
        document.getElementById('newServiceDescription').value = '';
        document.getElementById('newServiceImage').value = '';
        
        await loadServices(); // Reload the services list
    } catch (error) {
        console.error('Error creating service:', error);
        showToast('error', error.message);
    }
}

// Event Listeners
document.getElementById('addServiceBtn')?.addEventListener('click', () => {
    const modal = document.getElementById('serviceModal');
    const form = modal.querySelector('form');
    form.reset();
    delete form.dataset.serviceId;
    modal.showModal();
});

document.getElementById('serviceModal')?.querySelector('form')?.addEventListener('submit', event => {
    event.preventDefault();
    const form = event.target;
    if (form.dataset.serviceId) {
        updateService(event);
    } else {
        addService(event);
    }
});

// Load services on page load
loadServices();
