<?php
session_start();
require_once '../config/database.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = filter_input(INPUT_POST, 'email', FILTER_SANITIZE_EMAIL);

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'Invalid email format']);
        exit;
    }

    try {
        // Check if email exists
        $email = mysqli_real_escape_string($conn, $email);
        $query = "SELECT id FROM users WHERE email = '$email'";
        $result = mysqli_query($conn, $query);
        
        if (mysqli_num_rows($result) === 0) {
            echo json_encode(['success' => false, 'message' => 'Email not found']);
            exit;
        }

        // Generate reset token
        $token = bin2hex(random_bytes(32));
        $expires = date('Y-m-d H:i:s', strtotime('+1 hour'));

        // Store reset token
        $token = mysqli_real_escape_string($conn, $token);
        $expires = mysqli_real_escape_string($conn, $expires);
        $query = "UPDATE users SET reset_token = '$token', reset_expires = '$expires' WHERE email = '$email'";
        
        if (mysqli_query($conn, $query)) {
            // Send reset email (you'll need to configure your email settings)
            $resetLink = "http://{$_SERVER['HTTP_HOST']}/reset-password.php?token=" . $token;
            $to = $email;
            $subject = "Password Reset Request";
            $message = "Click the following link to reset your password: {$resetLink}\n\nThis link will expire in 1 hour.";
            $headers = "From: noreply@yourwebsite.com";

            if (mail($to, $subject, $message, $headers)) {
                echo json_encode(['success' => true, 'message' => 'Password reset instructions sent to your email']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Failed to send reset email']);
            }
        } else {
            throw new Exception(mysqli_error($conn));
        }
    } catch(Exception $e) {
        echo json_encode(['success' => false, 'message' => 'An error occurred']);
    }
}
?>
