<?php
session_start();
require_once 'config/db.php';

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    header('Location: index.html');
    exit();
}

// Get user data
try {
    $stmt = $pdo->prepare("SELECT username, email, profile_image, created_at, last_login FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();
} catch(PDOException $e) {
    die("Error fetching user data");
}
?>
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>User Profile</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/daisyui@3.9.4/dist/full.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free/css/all.min.css">
    <link rel="stylesheet" href="styles.css">
</head>
<body class="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
    <!-- Navigation -->
    <nav class="bg-base-200 dark:bg-gray-800 shadow-lg">
        <div class="max-w-7xl mx-auto px-4">
            <div class="flex justify-between h-16">
                <div class="flex items-center">
                    <a href="dashboard.php" class="text-xl font-bold text-gray-800 dark:text-white">
                        <i class="fas fa-home"></i> Dashboard
                    </a>
                </div>
                <div class="flex items-center space-x-4">
                    <button class="theme-toggle btn btn-circle btn-ghost">
                        <i class="fas fa-sun"></i>
                    </button>
                    <div class="dropdown dropdown-end">
                        <label tabindex="0" class="btn btn-ghost btn-circle avatar">
                            <div class="w-10 rounded-full">
                                <img src="<?php echo $user['profile_image'] ?? 'https://api.dicebear.com/6.x/initials/svg?seed=' . urlencode($user['username']); ?>" />
                            </div>
                        </label>
                        <ul tabindex="0" class="mt-3 p-2 shadow menu menu-compact dropdown-content bg-base-100 dark:bg-gray-700 rounded-box w-52">
                            <li><a href="profile.php" class="active"><i class="fas fa-user"></i> Profile</a></li>
                            <li><a href="settings.php"><i class="fas fa-cog"></i> Settings</a></li>
                            <li><a href="handlers/logout.php"><i class="fas fa-sign-out-alt"></i> Logout</a></li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </nav>

    <!-- Main Content -->
    <div class="container mx-auto px-4 py-8">
        <div class="max-w-2xl mx-auto">
            <!-- Profile Card -->
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
                <!-- Cover Image -->
                <div class="h-32 bg-gradient-to-r from-primary to-secondary"></div>
                
                <!-- Profile Info -->
                <div class="relative px-6 py-8">
                    <!-- Profile Image -->
                    <div class="absolute -top-16 left-1/2 transform -translate-x-1/2">
                        <div class="w-32 h-32 rounded-full ring-4 ring-white dark:ring-gray-800 overflow-hidden">
                            <img src="<?php echo $user['profile_image'] ?? 'https://api.dicebear.com/6.x/initials/svg?seed=' . urlencode($user['username']); ?>" 
                                 alt="Profile" 
                                 class="w-full h-full object-cover" />
                        </div>
                    </div>

                    <!-- User Info -->
                    <div class="mt-16 text-center">
                        <h2 class="text-2xl font-bold text-gray-800 dark:text-white"><?php echo htmlspecialchars($user['username']); ?></h2>
                        <p class="text-gray-600 dark:text-gray-400"><?php echo htmlspecialchars($user['email']); ?></p>
                    </div>

                    <!-- Stats -->
                    <div class="grid grid-cols-2 gap-4 mt-6">
                        <div class="text-center p-4 bg-base-200 dark:bg-gray-700 rounded-lg">
                            <p class="text-sm text-gray-600 dark:text-gray-400">Member Since</p>
                            <p class="font-semibold text-gray-800 dark:text-white">
                                <?php echo date('M d, Y', strtotime($user['created_at'])); ?>
                            </p>
                        </div>
                        <div class="text-center p-4 bg-base-200 dark:bg-gray-700 rounded-lg">
                            <p class="text-sm text-gray-600 dark:text-gray-400">Last Login</p>
                            <p class="font-semibold text-gray-800 dark:text-white">
                                <?php echo $user['last_login'] ? date('M d, Y H:i', strtotime($user['last_login'])) : 'Never'; ?>
                            </p>
                        </div>
                    </div>

                    <!-- Edit Profile Button -->
                    <div class="mt-6">
                        <button class="btn btn-primary w-full" onclick="edit_profile_modal.showModal()">
                            <i class="fas fa-edit mr-2"></i> Edit Profile
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Edit Profile Modal -->
    <dialog id="edit_profile_modal" class="modal">
        <div class="modal-box">
            <h3 class="font-bold text-lg dark:text-white">Edit Profile</h3>
            <form action="handlers/update-profile.php" method="POST" enctype="multipart/form-data" class="py-4">
                <div class="form-control">
                    <label class="label">
                        <span class="label-text dark:text-white">Username</span>
                    </label>
                    <input type="text" name="username" value="<?php echo htmlspecialchars($user['username']); ?>" 
                           class="input input-bordered dark:bg-gray-700 dark:text-white" required />
                </div>
                
                <div class="form-control mt-4">
                    <label class="label">
                        <span class="label-text dark:text-white">Profile Image</span>
                    </label>
                    <input type="file" name="profile_image" accept="image/*" 
                           class="file-input file-input-bordered w-full dark:bg-gray-700 dark:text-white" />
                </div>

                <div class="modal-action">
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                    <button type="button" class="btn" onclick="edit_profile_modal.close()">Cancel</button>
                </div>
            </form>
        </div>
    </dialog>

    <script src="https://cdn.jsdelivr.net/npm/toastify-js"></script>
    <script>
        // Theme toggle
        const themeToggle = document.querySelector('.theme-toggle');
        themeToggle.addEventListener('click', function() {
            document.documentElement.classList.toggle('dark');
            const icon = this.querySelector('i');
            if (document.documentElement.classList.contains('dark')) {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
                localStorage.setItem('theme', 'dark');
            } else {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
                localStorage.setItem('theme', 'light');
            }
        });

        // Load saved theme
        if (localStorage.getItem('theme') === 'dark' || 
            (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
            themeToggle.querySelector('i').classList.replace('fa-sun', 'fa-moon');
        }
    </script>
</body>
</html>
