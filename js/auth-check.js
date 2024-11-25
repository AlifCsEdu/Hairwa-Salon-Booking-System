// Check authentication status when page loads
document.addEventListener('DOMContentLoaded', function() {
    const userEmail = localStorage.getItem('userEmail');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    
    // Get all UI elements
    const historyLink = document.getElementById('historyLink');
    const authButtonsContainer = document.getElementById('auth-buttons');
    
    // Check if we're on a protected page
    const protectedPages = ['history.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (protectedPages.includes(currentPage) && (!userEmail || !isLoggedIn)) {
        window.location.href = 'auth.html';
        return;
    }
    
    // Update history link styling if it exists
    if (historyLink) {
        const historyIcon = document.createElement('i');
        historyIcon.className = 'fas fa-history mr-2';
        historyLink.insertBefore(historyIcon, historyLink.firstChild);
    }
    
    // Update UI based on authentication status
    if (userEmail && isLoggedIn) {
        // User is logged in
        if (historyLink) historyLink.style.display = 'block';
        
        // Update auth buttons container
        if (authButtonsContainer) {
            // Create container with fixed height
            const container = document.createElement('div');
            container.style.cssText = 'height: 40px; display: flex; align-items: center; position: relative;';
            
            // Create button
            const userBtn = document.createElement('button');
            userBtn.className = 'w-8 h-8 rounded-full bg-primary hover:bg-primary-focus text-white flex items-center justify-center';
            userBtn.style.cssText = 'cursor: pointer; min-height: unset; padding: 0;';
            userBtn.innerHTML = `<span style="font-size: 14px;">${userEmail[0].toUpperCase()}</span>`;
            
            // Create dropdown content
            const dropdown = document.createElement('div');
            dropdown.className = 'hidden';
            dropdown.style.cssText = 'position: fixed; background: white; border-radius: 0.5rem; box-shadow: 0 2px 5px rgba(0,0,0,0.1); width: 14rem; z-index: 1000;';
            dropdown.innerHTML = `
                <div style="padding: 0.75rem 1rem; border-bottom: 1px solid #eee;">
                    <div style="font-size: 0.75rem; color: #666;">Signed in as</div>
                    <div style="font-size: 0.875rem; font-weight: 500; overflow: hidden; text-overflow: ellipsis;">${userEmail}</div>
                </div>
                ${user.isAdmin === "1" || user.isAdmin === 1 ? `
                <a href="dashboard.html" style="display: block; padding: 0.5rem 1rem; color: #333; font-size: 0.875rem; text-decoration: none; hover:bg-gray-100;">
                    <i class="fas fa-tachometer-alt" style="width: 1rem; margin-right: 0.5rem;"></i>
                    Dashboard
                </a>
                ` : ''}
                <a href="#" id="logoutBtn" style="display: block; padding: 0.5rem 1rem; color: #dc2626; font-size: 0.875rem; text-decoration: none;">
                    <i class="fas fa-sign-out-alt" style="width: 1rem; margin-right: 0.5rem;"></i>
                    Logout
                </a>
            `;
            
            // Position and toggle dropdown
            let isDropdownVisible = false;
            
            userBtn.onclick = function(e) {
                e.stopPropagation();
                
                if (isDropdownVisible) {
                    dropdown.style.display = 'none';
                } else {
                    const rect = userBtn.getBoundingClientRect();
                    dropdown.style.display = 'block';
                    dropdown.style.top = (rect.bottom + 8) + 'px';
                    dropdown.style.left = (rect.right - dropdown.offsetWidth) + 'px';
                }
                
                isDropdownVisible = !isDropdownVisible;
            };
            
            // Close dropdown when clicking outside
            document.addEventListener('click', function() {
                if (isDropdownVisible) {
                    dropdown.style.display = 'none';
                    isDropdownVisible = false;
                }
            });
            
            // Prevent dropdown from closing when clicking inside
            dropdown.onclick = function(e) {
                if (!e.target.matches('#logoutBtn')) {
                    e.stopPropagation();
                }
            };
            
            // Add logout functionality
            dropdown.querySelector('#logoutBtn').onclick = function(e) {
                e.preventDefault();
                localStorage.removeItem('userEmail');
                localStorage.removeItem('user');
                localStorage.removeItem('isLoggedIn');
                window.location.href = 'auth.html';
            };
            
            // Add hover effect to menu items
            const menuItems = dropdown.querySelectorAll('a');
            menuItems.forEach(item => {
                item.onmouseenter = function() {
                    this.style.backgroundColor = '#f3f4f6';
                };
                item.onmouseleave = function() {
                    this.style.backgroundColor = 'transparent';
                };
            });
            
            // Append elements
            container.appendChild(userBtn);
            document.body.appendChild(dropdown);
            authButtonsContainer.innerHTML = '';
            authButtonsContainer.appendChild(container);
        }
    } else {
        // User is not logged in
        if (historyLink) historyLink.style.display = 'none';
        
        // Show login button
        if (authButtonsContainer) {
            const loginBtn = document.createElement('a');
            loginBtn.href = 'auth.html';
            loginBtn.className = 'text-sm px-4 py-1 rounded bg-primary hover:bg-primary-focus text-white';
            loginBtn.style.cssText = 'height: 32px; display: flex; align-items: center;';
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Login';
            
            authButtonsContainer.innerHTML = '';
            authButtonsContainer.appendChild(loginBtn);
        }
    }
});
