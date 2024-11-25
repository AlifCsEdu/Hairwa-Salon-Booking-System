// Global state
const state = {
    selectedServices: new Set(),
    selectedDate: null,
    selectedTime: null,
    selectedStaff: null,
    groupSize: 1,
    totalPrice: 0,
    user: null,
    calendar: null,
    customerDetails: null
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Page loaded, initializing...');
    
    // Initialize date picker with today's date
    const today = new Date();
    const datePicker = document.getElementById('appointment-date');
    if (datePicker) {
        datePicker.valueAsDate = today;
        datePicker.min = today.toISOString().split('T')[0];
    }

    // Initialize calendar
    initializeCalendar();
    
    // Initialize group size handler
    initializeGroupSize();
    
    // Add event listener for the book appointment button
    const bookBtn = document.getElementById('book-appointment-btn');
    if (bookBtn) {
        bookBtn.addEventListener('click', handleBookAppointment);
    }

    // Load services last to ensure DOM is ready
    await loadServices();
});

// Load available services from the database
async function loadServices() {
    try {
        console.log('Fetching services...');
        const response = await fetch('api/services.php');
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch services: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Parsed data:', data);
        
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid response format');
        }

        if (!data.success) {
            throw new Error(data.error || 'Failed to load services');
        }

        if (!Array.isArray(data.services)) {
            throw new Error('Services data is not an array');
        }
        
        const services = data.services;
        console.log('Processing services:', services);
        
        const servicesGrid = document.getElementById('services-grid');
        if (!servicesGrid) {
            console.error('Services grid element not found');
            return;
        }

        servicesGrid.innerHTML = services.map(service => {
            // Ensure all properties exist with default values
            const safeService = {
                id: service.id || 0,
                name: service.name || 'Unnamed Service',
                price: service.price || 0,
                duration: service.duration || 0,
                description: service.description || '',
                image_path: service.image_path || 'img/service-default.jpg'
            };
            
            return `
                <div class="card bg-base-100 shadow-xl service-card hover:shadow-2xl transition-all cursor-pointer" 
                     onclick="toggleService(${safeService.id}, '${safeService.name}', ${safeService.price}, ${safeService.duration})">
                    <div class="card-body">
                        <div class="flex justify-between items-start">
                            <div>
                                <h3 class="card-title text-lg">${safeService.name}</h3>
                                <p class="text-sm opacity-70 mt-1">${safeService.description}</p>
                            </div>
                            <div class="flex flex-col items-end">
                                <div class="badge badge-primary mb-2 service-duration">
                                    <i class="fas fa-clock mr-1"></i> ${safeService.duration} mins
                                </div>
                                <p class="text-lg font-bold">RM ${parseFloat(safeService.price).toFixed(2)}</p>
                            </div>
                        </div>
                        <div class="absolute top-4 right-4 opacity-0 transition-opacity duration-200 selected-indicator">
                            <i class="fas fa-check-circle text-2xl text-primary"></i>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        if (services.length === 0) {
            servicesGrid.innerHTML = '<div class="col-span-2 text-center py-12 text-gray-500">No services available</div>';
        }
    } catch (error) {
        console.error('Error in loadServices:', error);
        const servicesGrid = document.getElementById('services-grid');
        if (servicesGrid) {
            servicesGrid.innerHTML = `
                <div class="col-span-2 text-center py-12">
                    <div class="text-red-500 mb-4">${error.message}</div>
                    <button onclick="loadServices()" class="btn btn-primary">
                        <i class="fas fa-sync-alt mr-2"></i> Retry
                    </button>
                </div>
            `;
        }
        showToast('error', 'Failed to load services. Please try again.');
    }
}

// Check login status and pre-fill user details if logged in
function checkLoginStatus() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.id) {
        state.user = user;
        // Pre-fill user details
        document.getElementById('customer-name').value = user.username || '';
        document.getElementById('customer-email').value = user.email || '';
        
        // Disable pre-filled fields
        document.getElementById('customer-name').disabled = true;
        document.getElementById('customer-email').disabled = true;
    }
}

// Initialize FullCalendar
function initializeCalendar() {
    const calendarEl = document.getElementById('calendar');
    
    // Force a reflow before initialization
    calendarEl.style.display = 'none';
    calendarEl.offsetHeight; // Force reflow
    calendarEl.style.display = 'block';
    
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        height: 'auto',
        expandRows: true,
        handleWindowResize: true,
        initialDate: new Date(), // Force current date
        headerToolbar: {
            start: 'prev',
            center: 'title',
            end: 'next'
        },
        firstDay: 0,
        fixedWeekCount: false,
        showNonCurrentDates: true,
        dayMaxEvents: true,
        selectable: true,
        unselectAuto: false,
        selectConstraint: {
            start: new Date().toISOString().split('T')[0],
            end: '2025-01-01'
        },
        selectAllow: function(selectInfo) {
            return selectInfo.start >= new Date();
        },
        dateClick: function(info) {
            const clickedDate = info.date;
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (clickedDate >= today && !info.dayEl.classList.contains('fc-day-disabled')) {
                // Remove previous selection
                document.querySelectorAll('.fc-day-selected').forEach(el => {
                    el.classList.remove('fc-day-selected');
                });
                
                // Add selection to clicked date
                info.dayEl.classList.add('fc-day-selected');
                
                state.selectedDate = clickedDate;
                loadTimeSlots(clickedDate);
            }
        },
        dayCellDidMount: function(info) {
            // Disable Tuesdays
            if (info.date.getDay() === 2) {
                info.el.classList.add('fc-day-disabled');
            }
            
            // Disable past dates
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (info.date < today) {
                info.el.classList.add('fc-day-disabled');
            }
        }
    });
    
    calendar.render();
    
    // Force another reflow after render
    const gridEl = calendarEl.querySelector('.fc-scrollgrid');
    if (gridEl) {
        gridEl.style.display = 'none';
        gridEl.offsetHeight; // Force reflow
        gridEl.style.display = 'grid';
    }
    
    state.calendar = calendar;
}

// Update the selected date display
function updateSelectedDateDisplay(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('selected-date-display').textContent = date.toLocaleDateString('en-US', options);
}

// Toggle service selection
function toggleService(id, name, price, duration) {
    const index = Array.from(state.selectedServices).findIndex(s => s.id === id);
    const servicesGrid = document.getElementById('services-grid');
    
    // Remove selected-service class from all cards
    servicesGrid.querySelectorAll('.service-card').forEach(card => {
        card.classList.remove('selected-service');
        card.querySelector('.selected-indicator').style.opacity = '0';
    });

    if (index === -1) {
        // Select new service
        state.selectedServices.clear(); // Clear previous selection since we only allow one service
        state.selectedServices.add({ id, name, price, duration });
        
        // Add selected-service class to the clicked card
        const selectedCard = servicesGrid.querySelector(`[onclick*="toggleService(${id},"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected-service');
            selectedCard.querySelector('.selected-indicator').style.opacity = '1';
        }
    } else {
        // Deselect service
        state.selectedServices.clear();
    }
    
    updateTotalPrice();
    
    // Update the next button state
    const nextBtn = document.querySelector('[onclick*="nextStep(2)"]');
    if (nextBtn) {
        nextBtn.disabled = state.selectedServices.size === 0;
    }
}

// Update total price based on selected services and group size
function updateTotalPrice() {
    state.totalPrice = Array.from(state.selectedServices).reduce((total, service) => total + service.price, 0) * state.groupSize;
    const priceElements = document.querySelectorAll('.total-price');
    priceElements.forEach(el => {
        el.textContent = `RM ${state.totalPrice}`;
    });
}

// Load available time slots for selected date
async function loadTimeSlots(date) {
    if (!date) return;

    try {
        const timeSlotsContainer = document.getElementById('time-slots');
        timeSlotsContainer.innerHTML = `
            <div class="col-span-2 flex justify-center py-8">
                <div class="loading loading-spinner loading-lg text-primary"></div>
            </div>
        `;
        
        // Format date in KL timezone
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        
        const response = await fetch(`api/timeslots.php?date=${formattedDate}`);
        const occupiedTimeSlots = await response.json();
        
        if (!response.ok) {
            throw new Error(occupiedTimeSlots.error || 'Failed to load time slots');
        }
        
        if (occupiedTimeSlots.error) {
            throw new Error(occupiedTimeSlots.error);
        }

        // If data is not an array, make it an empty array
        const occupiedSlots = Array.isArray(occupiedTimeSlots) ? occupiedTimeSlots : [];

        // Update the date display
        const dateDisplay = document.getElementById('selected-date-display');
        dateDisplay.textContent = date.toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        // Generate time slots from 9 AM to 6 PM, every 15 minutes
        const startHour = 9;
        const endHour = 18;
        let availableSlots = false;
        
        timeSlotsContainer.innerHTML = ''; // Clear existing slots
        
        // Create a date object for the selected date
        const baseDate = new Date(date);
        baseDate.setHours(startHour, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(endHour, 0, 0, 0);
        
        while (baseDate <= endDate) {
            const time = baseDate.toLocaleTimeString('en-US', { 
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).slice(0, 5); // Get just HH:mm format
            
            // Find if slot is occupied and get its status
            const occupiedSlot = occupiedSlots.find(slot => slot.time === time);
            const isOccupied = !!occupiedSlot;
            const isSelected = state.selectedTime === time;
            
            if (!isOccupied) {
                availableSlots = true;
            }
            
            // Format time in 12-hour format
            const formattedTime = baseDate.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
            
            const slot = document.createElement('button');
            slot.type = 'button';
            slot.className = `btn btn-outline no-animation h-14 relative flex flex-col items-center justify-center gap-1 
                ${isOccupied ? 'occupied' : ''} 
                ${isSelected ? 'btn-primary' : ''}`;
            
            // Status icon based on status
            const statusIcon = isOccupied ? 
                (occupiedSlot.status === 'confirmed' ? 
                    '<i class="fas fa-check-circle text-xl"></i>' : 
                    '<i class="fas fa-clock text-xl"></i>') 
                : '';
            
            slot.innerHTML = `
                <div class="time-text">
                    <i class="fas fa-clock text-sm opacity-70"></i>
                    <span class="font-normal">${formattedTime}</span>
                </div>
                ${isOccupied ? `<div class="status-icon">${statusIcon}</div>` : ''}
            `;
            
            // Only add click handler if not occupied
            if (!isOccupied) {
                slot.onclick = () => {
                    // Remove selection from all slots
                    document.querySelectorAll('button[type="button"]').forEach(s => {
                        s.classList.remove('btn-primary');
                    });
                    // Add selection to clicked slot
                    slot.classList.add('btn-primary');
                    selectTimeSlot(time);
                };
            }
            
            if (isOccupied) {
                slot.title = `This time slot has a ${occupiedSlot.status} booking`;
            }
            
            timeSlotsContainer.appendChild(slot);
            
            // Add 15 minutes
            baseDate.setMinutes(baseDate.getMinutes() + 15);
        }
        
        // If no slots are available
        if (!availableSlots) {
            timeSlotsContainer.innerHTML = `
                <div class="col-span-2 text-center py-12">
                    <div class="text-base-content/70 text-lg mb-2">No time slots available</div>
                    <div class="text-base-content/50">Please select another date</div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading time slots:', error);
        const timeSlotsContainer = document.getElementById('time-slots');
        timeSlotsContainer.innerHTML = `
            <div class="col-span-2 text-center py-12">
                <div class="text-error text-lg mb-4">${error.message}</div>
                <button onclick="loadTimeSlots(state.selectedDate)" class="btn btn-primary gap-2">
                    <i class="fas fa-sync-alt"></i>
                    Try Again
                </button>
            </div>
        `;
    }
}

// Select a time slot
function selectTimeSlot(time) {
    state.selectedTime = time;
    
    // Update the continue button state
    const continueBtn = document.querySelector('#step2 .btn-primary');
    if (continueBtn) {
        continueBtn.disabled = !time;
    }
}

// Initialize group size handler
function initializeGroupSize() {
    const groupSizeSelect = document.getElementById('group-size');
    groupSizeSelect.addEventListener('change', function() {
        state.groupSize = parseInt(this.value);
        updateTotalPrice();
    });
}

// Navigation between steps
function nextStep(step) {
    if (!validateStep(step - 1)) return;
    
    // Hide all steps
    document.querySelectorAll('[id^="step"]').forEach(el => {
        el.classList.remove('step-active');
        el.classList.add('step-inactive');
    });

    // Show current step
    const currentStep = document.getElementById(`step${step}`);
    if (currentStep) {
        currentStep.classList.remove('step-inactive');
        currentStep.classList.add('step-active');
    }

    // Update progress bar
    document.querySelectorAll('.step').forEach((el, index) => {
        if (index < step) {
            el.classList.add('step-primary');
        } else {
            el.classList.remove('step-primary');
        }
    });

    // Special handling for confirmation step
    if (step === 4) {
        updateConfirmationSummary();
    }
}

// Go back to previous step
function prevStep(step) {
    nextStep(step);
}

// Validate each step before proceeding
function validateStep(currentStep) {
    try {
        switch(currentStep) {
            case 1:
                if (state.selectedServices.size === 0) {
                    showToast('error', 'Please select at least one service');
                    return false;
                }
                break;
            case 2:
                if (!state.selectedDate) {
                    showToast('error', 'Please select a date');
                    return false;
                }
                if (!state.selectedTime) {
                    showToast('error', 'Please select a time slot');
                    return false;
                }
                break;
            case 3:
                const nameInput = document.getElementById('customer-name');
                const emailInput = document.getElementById('customer-email');
                const phoneInput = document.getElementById('customerPhone');
                const notesInput = document.getElementById('booking-notes');

                if (!nameInput || !nameInput.value.trim()) {
                    showToast('error', 'Please enter your name');
                    return false;
                }
                if (!emailInput || !emailInput.value.trim()) {
                    showToast('error', 'Please enter your email');
                    return false;
                }
                if (!phoneInput || !phoneInput.value.trim()) {
                    showToast('error', 'Please enter your phone number');
                    return false;
                }

                // Store customer details in state
                state.customerDetails = {
                    name: nameInput.value.trim(),
                    email: emailInput.value.trim(),
                    phone: phoneInput.value.trim(),
                    notes: notesInput ? notesInput.value.trim() : ''
                };
                break;
            case 4:
                // No validation needed for confirmation step
                break;
        }
        return true;
    } catch (error) {
        console.error('Validation error:', error);
        showToast('error', 'An error occurred during validation. Please try again.');
        return false;
    }
}

// Update confirmation summary
function updateConfirmationSummary() {
    try {
        const selectedService = Array.from(state.selectedServices)[0];
        if (!selectedService) {
            console.error('No service selected');
            return;
        }

        // Format date in a readable format
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const formattedDate = state.selectedDate ? state.selectedDate.toLocaleDateString('en-US', dateOptions) : 'Not selected';
        
        // Format time
        const formattedTime = state.selectedTime || 'Not selected';

        // Update services section
        const confirmationServices = document.getElementById('confirmation-services');
        if (confirmationServices) {
            confirmationServices.innerHTML = `
                <div class="flex justify-between items-center">
                    <span>${selectedService.name} (x${state.groupSize})</span>
                    <span class="font-semibold">RM ${(selectedService.price * state.groupSize).toFixed(2)}</span>
                </div>
            `;
        }

        // Update date & time section
        const confirmationDateTime = document.getElementById('confirmation-datetime');
        if (confirmationDateTime) {
            confirmationDateTime.innerHTML = `
                <div class="space-y-2">
                    <div class="flex justify-between">
                        <span>Date:</span>
                        <span>${formattedDate}</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Time:</span>
                        <span>${formattedTime}</span>
                    </div>
                </div>
            `;
        }

        // Update price section
        const confirmationPrice = document.getElementById('confirmation-price');
        if (confirmationPrice) {
            confirmationPrice.innerHTML = `RM ${state.totalPrice.toFixed(2)}`;
        }

        // Update customer details section
        const confirmationDetails = document.getElementById('confirmation-details');
        if (confirmationDetails) {
            confirmationDetails.innerHTML = `
                <div class="space-y-2">
                    <div class="flex justify-between">
                        <span>Name:</span>
                        <span>${state.customerDetails?.name || 'Not provided'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Email:</span>
                        <span>${state.customerDetails?.email || 'Not provided'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Phone:</span>
                        <span>${state.customerDetails?.phone || 'Not provided'}</span>
                    </div>
                    ${state.customerDetails?.notes ? `
                    <div class="mt-2">
                        <span class="font-semibold">Notes:</span>
                        <p class="mt-1">${state.customerDetails.notes}</p>
                    </div>
                    ` : ''}
                </div>
            `;
        }
    } catch (error) {
        console.error('Error updating confirmation summary:', error);
        showToast('error', 'Failed to update confirmation summary');
    }
}

// Submit the booking
async function submitBooking() {
    try {
        // We only support one service at a time based on the appointments.php implementation
        if (Array.from(state.selectedServices).length === 0) {
            throw new Error('Please select a service');
        }

        const service = Array.from(state.selectedServices)[0]; // Get the first selected service
        
        // Format date in KL timezone (UTC+8)
        const year = state.selectedDate.getFullYear();
        const month = String(state.selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(state.selectedDate.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        
        const formData = {
            customer_name: document.getElementById('customer-name').value,
            customer_email: document.getElementById('customer-email').value,
            customer_phone: document.getElementById('customerPhone').value,
            service_id: service.id,
            datetime: `${formattedDate} ${state.selectedTime}`,
            group_size: state.groupSize
        };

        console.log('Submitting appointment with datetime:', formData.datetime);
        
        const response = await fetch('api/appointments.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('success', 'Booking confirmed successfully!');
            // Redirect to index page
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        } else {
            throw new Error(result.error || 'Failed to submit booking');
        }
    } catch (error) {
        showToast('error', error.message || 'Failed to submit booking');
        console.error('Error submitting booking:', error);
    }
}

// Helper function to validate email
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Helper function to validate phone number
function validatePhone(phone) {
    // Malaysian phone number pattern (10-11 digits)
    const pattern = /^01[0-9]{1}[0-9]{6,7}$/;
    return pattern.test(phone);
}

document.getElementById('customerPhone').addEventListener('input', function(e) {
    const phoneError = document.getElementById('phoneError');
    const phone = e.target.value;
    
    if (phone.length > 0) {
        if (!validatePhone(phone)) {
            phoneError.textContent = 'Please enter a valid Malaysian phone number (10-11 digits)';
            e.target.setCustomValidity('Invalid phone number format');
        } else {
            phoneError.textContent = '';
            e.target.setCustomValidity('');
        }
    } else {
        phoneError.textContent = '';
        e.target.setCustomValidity('');
    }
});

// Show toast message
function showToast(type, message) {
    const toast = document.getElementById('toast-message');
    toast.className = `alert alert-${type === 'error' ? 'error' : 'success'}`;
    toast.querySelector('span').textContent = message;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

function handleBookAppointment() {
    nextStep(4);
}
