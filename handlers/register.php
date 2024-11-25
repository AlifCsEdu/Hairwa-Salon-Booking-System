<?php
session_start();
require_once '../config/database.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = filter_input(INPUT_POST, 'username', FILTER_SANITIZE_STRING);
    $email = filter_input(INPUT_POST, 'email', FILTER_SANITIZE_EMAIL);
    $password = $_POST['password'];

    // Validate input
    if (empty($username) || empty($email) || empty($password)) {
        echo json_encode(['success' => false, 'message' => 'Please fill all fields']);
        exit;
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'Invalid email format']);
        exit;
    }

    try {
        // Check if email already exists
        $email = mysqli_real_escape_string($conn, $email);
        $query = "SELECT id FROM users WHERE email = '$email'";
        $result = mysqli_query($conn, $query);
        
        if (mysqli_num_rows($result) > 0) {
            echo json_encode(['success' => false, 'message' => 'Email already exists']);
            exit;
        }

        // Hash password and escape username
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        $username = mysqli_real_escape_string($conn, $username);
        
        // Insert new user with isAdmin = 0 by default
        $query = "INSERT INTO users (username, email, password, isAdmin) VALUES ('$username', '$email', '$hashedPassword', 0)";
        if (mysqli_query($conn, $query)) {
            echo json_encode([
                'success' => true, 
                'message' => 'Registration successful! Please login.',
                'redirect' => 'auth.html'
            ]);
        } else {
            throw new Exception(mysqli_error($conn));
        }
        exit;
        
    } catch(Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Registration failed: ' . $e->getMessage()]);
        exit;
    }
}
?>
