// Initialize users array
let users = [];

async function loadUsers(searchQuery = '') {
    try {
        const response = await fetch(`api/users.php${searchQuery ? `?search=${searchQuery}` : ''}`);
        console.log('Response status:', response.status);
        
        const responseText = await response.text();
        console.log('Raw response:', responseText);
        
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error('Failed to parse JSON:', e);
            throw new Error('Invalid JSON response from server');
        }
        
        console.log('Parsed data:', data);
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to load users');
        }

        if (!data.users || !Array.isArray(data.users)) {
            console.error('Invalid users data:', data);
            throw new Error('Received invalid users data from server');
        }

        users = data.users;
        displayUsers();
    } catch (error) {
        console.error('Error loading users:', error);
        showToast('error', error.message || 'Failed to load users');
    }
}

function displayUsers() {
    console.log('Displaying users:', users);
    const usersTableBody = document.getElementById('usersTableBody');
    if (!usersTableBody) {
        console.error('Users table body not found');
        return;
    }

    if (!Array.isArray(users)) {
        console.error('Users data is not an array:', users);
        return;
    }

    usersTableBody.innerHTML = users.map(user => `
        <tr>
            <td>
                <div class="flex items-center space-x-3">
                    <div class="avatar">
                        <div class="mask mask-squircle w-12 h-12">
                            <img src="${user.profile_picture || 'img/default-avatar.png'}" 
                                 alt="${user.username}"
                                 onerror="this.src='img/default-avatar.png'"
                                 class="w-full h-full object-cover" />
                        </div>
                    </div>
                </div>
            </td>
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td>
                <label class="label cursor-pointer justify-start">
                    <input type="checkbox" class="toggle toggle-primary"
                        ${parseInt(user.isAdmin) === 1 ? 'checked' : ''}
                        onchange="toggleAdminStatus(${user.id}, this.checked)"
                    />
                </label>
            </td>
            <td>
                <button class="btn btn-sm btn-error" onclick="deleteUser(${user.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function toggleAdminStatus(userId, isChecked) {
    try {
        console.log(`Toggling admin status for user ${userId} to ${isChecked}`);
        
        const response = await fetch(`api/users.php?id=${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                isAdmin: isChecked ? 1 : 0
            })
        });

        console.log('Response status:', response.status);

        const responseText = await response.text();
        console.log('Raw response:', responseText);
        
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error('Failed to parse JSON:', e);
            throw new Error('Invalid JSON response from server');
        }
        
        console.log('Parsed data:', data);
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to update user');
        }

        showToast('success', 'User updated successfully');
        await loadUsers(); // Reload the list to reflect changes
    } catch (error) {
        console.error('Error updating user:', error);
        showToast('error', error.message);
        // Revert the checkbox
        const checkbox = document.querySelector(`input[onchange*="toggleAdminStatus(${userId}"]`);
        if (checkbox) checkbox.checked = !isChecked;
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
        const response = await fetch(`api/users.php?id=${userId}`, {
            method: 'DELETE'
        });

        console.log('Response status:', response.status);

        const responseText = await response.text();
        console.log('Raw response:', responseText);
        
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error('Failed to parse JSON:', e);
            throw new Error('Invalid JSON response from server');
        }
        
        console.log('Parsed data:', data);
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to delete user');
        }

        showToast('success', 'User deleted successfully');
        await loadUsers(); // Reload the list to reflect changes
    } catch (error) {
        console.error('Error deleting user:', error);
        showToast('error', error.message);
    }
}

async function createUser() {
    try {
        const usernameInput = document.querySelector('#newUsername');
        const emailInput = document.querySelector('#newEmail');
        const passwordInput = document.querySelector('#newPassword');
        const isAdminInput = document.querySelector('#newIsAdmin');
        const profilePictureInput = document.querySelector('#newProfilePicture');

        if (!usernameInput || !emailInput || !passwordInput || !isAdminInput) {
            throw new Error('Required form fields not found');
        }

        const userData = {
            username: usernameInput.value.trim(),
            email: emailInput.value.trim(),
            password: passwordInput.value,
            isAdmin: isAdminInput.checked ? 1 : 0
        };

        // Handle profile picture if selected
        if (profilePictureInput && profilePictureInput.files && profilePictureInput.files[0]) {
            const file = profilePictureInput.files[0];
            const reader = new FileReader();
            
            // Convert file to base64
            const base64Image = await new Promise((resolve, reject) => {
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            
            userData.profile_picture = base64Image;
        }

        const response = await fetch('api/users.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        const responseText = await response.text();
        console.log('Raw response:', responseText);
        
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error('Failed to parse JSON:', e);
            throw new Error('Invalid JSON response from server');
        }
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to create user');
        }

        showToast('success', 'User created successfully');
        
        // Close modal and reset form
        const modal = document.querySelector('#addUserModal');
        if (modal) {
            modal.close();
            
            // Reset form fields
            usernameInput.value = '';
            emailInput.value = '';
            passwordInput.value = '';
            isAdminInput.checked = false;
            if (profilePictureInput) {
                profilePictureInput.value = '';
            }
        }
        
        // Reload users list
        await loadUsers();
    } catch (error) {
        console.error('Error creating user:', error);
        showToast('error', error.message || 'Failed to create user');
    }
}

function switchProfilePictureInput(type) {
    const fileContainer = document.getElementById('fileInputContainer');
    const urlContainer = document.getElementById('urlInputContainer');
    const fileTab = document.getElementById('fileTab');
    const urlTab = document.getElementById('urlTab');

    if (type === 'file') {
        fileContainer.classList.remove('hidden');
        urlContainer.classList.add('hidden');
        fileTab.classList.add('tab-active');
        urlTab.classList.remove('tab-active');
    } else {
        fileContainer.classList.add('hidden');
        urlContainer.classList.remove('hidden');
        fileTab.classList.remove('tab-active');
        urlTab.classList.add('tab-active');
    }
}

// Load users when the page loads
document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    
    // Add search event listener
    const searchInput = document.querySelector('#userSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleUserSearch);
    }
});

// Search functionality
let searchTimeout;
function handleUserSearch(event) {
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    searchTimeout = setTimeout(() => {
        loadUsers(event.target.value);
    }, 300);
}
