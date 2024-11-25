document.addEventListener('DOMContentLoaded', function() {
    // Quick auth check
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // Redirect if not admin
    if (!isLoggedIn || (user.isAdmin !== "1" && user.isAdmin !== 1)) {
        window.location.href = 'auth.html';
        return;
    }

    // Update user info
    const userInfoContainer = document.getElementById('user-info');
    if (userInfoContainer) {
        userInfoContainer.innerHTML = `
            <span class="text-primary">
                <i class="fas fa-user-shield me-1"></i>
                Admin: ${user.username}
            </span>
        `;
    }

    // Setup logout handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Clear local storage
            localStorage.clear();
            sessionStorage.clear();
            
            // Clear any cookies
            document.cookie.split(";").forEach(function(c) { 
                document.cookie = c.replace(/^ +/, "")
                    .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
            });
            
            // Redirect to login page
            window.location.href = 'auth.html';
        });
    }

    // Load initial data
    if (typeof loadAppointments === 'function') loadAppointments();
});
