document.addEventListener('DOMContentLoaded', function() {
    // Debug Mode
    const DEBUG = true;
    function debug(...args) {
        if (DEBUG) console.log(...args);
    }

    // Theme Toggle
    const themeToggle = document.getElementById('themeToggle');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    const storedTheme = localStorage.getItem('theme');

    // Set initial theme
    if (storedTheme === 'dark' || (!storedTheme && prefersDark.matches)) {
        document.documentElement.classList.add('dark');
        themeToggle.querySelector('i').classList.replace('fa-moon', 'fa-sun');
    }

    // Theme toggle handler
    themeToggle.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        const isDark = document.documentElement.classList.contains('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        themeToggle.querySelector('i').classList.replace(
            isDark ? 'fa-moon' : 'fa-sun',
            isDark ? 'fa-sun' : 'fa-moon'
        );
        debug('Theme updated:', isDark ? 'dark' : 'light');
    });

    // Tab Switching
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.dataset.tab;
            const isRegister = tab === 'register';
            
            // Update active states
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Move indicator
            const indicator = document.querySelector('.tab-indicator');
            indicator.style.transform = isRegister ? 'translateX(calc(100% + 0.5rem))' : 'translateX(0)';
            
            // Show/hide forms with slide animation
            const loginForm = document.getElementById('loginForm');
            const registerForm = document.getElementById('registerForm');
            
            if (isRegister) {
                loginForm.style.display = 'none';
                registerForm.style.display = 'block';
                registerForm.classList.add('slide-from-right');
            } else {
                registerForm.style.display = 'none';
                loginForm.style.display = 'block';
                loginForm.classList.add('slide-from-left');
            }
        });
    });

    // Password Visibility Toggle
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            const type = input.type === 'password' ? 'text' : 'password';
            input.type = type;
            this.querySelector('i').classList.toggle('fa-eye');
            this.querySelector('i').classList.toggle('fa-eye-slash');
            debug('Password visibility toggled');
        });
    });

    // Password Strength (Optional)
    const passwordInputs = document.querySelectorAll('.password-input');
    passwordInputs.forEach(input => {
        input.addEventListener('input', function() {
            if (this.value) {
                const result = zxcvbn(this.value);
                const strengthBar = this.parentElement.parentElement.querySelector('.password-strength-bar');
                const strengthText = this.parentElement.parentElement.querySelector('.password-strength');
                
                // Update strength bar
                const strengthPercentage = (result.score + 1) * 20;
                strengthBar.style.width = strengthPercentage + '%';
                
                // Update strength text
                const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
                strengthText.textContent = strengthLabels[result.score];
                
                // Update colors
                const colors = [
                    'bg-red-500',
                    'bg-orange-500',
                    'bg-yellow-500',
                    'bg-blue-500',
                    'bg-green-500'
                ];
                
                strengthBar.className = 'password-strength-bar h-full transition-all duration-300 ' + colors[result.score];
            }
        });
    });

    // Forgot Password Modal
    const forgotPasswordBtn = document.querySelector('.forgot-password');
    const forgotPasswordModal = document.getElementById('forgot_password_modal');

    forgotPasswordBtn.addEventListener('click', () => {
        forgotPasswordModal.showModal();
    });

    // Form Submissions
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            try {
                // If it's the registration form, show a gentle warning for weak passwords
                if (form.action.includes('register.php')) {
                    const passwordInput = form.querySelector('input[name="password"]');
                    if (passwordInput) {
                        const result = zxcvbn(passwordInput.value);
                        if (result.score < 3) {
                            const proceed = confirm("Your password is relatively weak. It's recommended to use a stronger password. Would you like to continue anyway?");
                            if (!proceed) {
                                return;
                            }
                        }
                    }
                }

                const formData = new FormData(this);
                const response = await fetch(this.action, {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                
                if (data.success) {
                    // Store user data in localStorage BEFORE showing toast
                    if (data.user) {
                        localStorage.setItem('userEmail', data.user.email);
                        localStorage.setItem('user', JSON.stringify(data.user));
                        localStorage.setItem('isLoggedIn', 'true');
                    }
                    
                    showToast(data.message, 'success');
                    
                    if (data.redirect) {
                        window.location.href = data.redirect;
                    }
                } else {
                    showToast(data.message, 'error');
                }
            } catch (error) {
                showToast('An error occurred. Please try again.', 'error');
                console.error('Form submission error:', error);
            }
        });
    });

    // Toast Notification Helper
    function showToast(message, type = 'info') {
        const colors = {
            success: 'linear-gradient(to right, #10B981, #059669)',
            error: 'linear-gradient(to right, #EF4444, #DC2626)',
            info: 'linear-gradient(to right, #3B82F6, #2563EB)'
        };

        const icons = {
            success: '✓',
            error: '✕',
            info: 'ℹ'
        };

        Toastify({
            text: `<div class="flex items-center gap-2">
                    <span class="toast-icon">${icons[type]}</span>
                    <span>${message}</span>
                   </div>`,
            duration: 3000,
            gravity: "top",
            position: "center",
            stopOnFocus: true,
            escapeMarkup: false,
            style: {
                background: colors[type],
                borderRadius: '12px',
                padding: '16px 24px',
                fontFamily: 'Inter, sans-serif',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                maxWidth: '400px',
                margin: '16px auto',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center'
            },
            className: 'toast-message'
        }).showToast();
    }

    // Initial debug info
    debug('Theme toggle found:', !!themeToggle);
    debug('Tab buttons found:', document.querySelectorAll('.tab-button').length);
    debug('Password toggles found:', document.querySelectorAll('.toggle-password').length);
});
