<?php
// Prevent any output before headers
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Ensure we're sending JSON response
header('Content-Type: application/json');

// Handle CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    require_once '../config/database.php';
    
    if (!isset($conn) || !$conn) {
        throw new Exception("Database connection failed");
    }

    // Create users table if it doesn't exist
    $sql = "CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        isAdmin BOOLEAN DEFAULT FALSE,
        profile_picture VARCHAR(255)
    )";

    if (!$conn->query($sql)) {
        throw new Exception("Failed to create users table: " . $conn->error);
    }

    // Function to get base URL
    function getBaseUrl() {
        $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https://' : 'http://';
        $host = $_SERVER['HTTP_HOST'];
        $scriptDir = dirname(dirname($_SERVER['SCRIPT_NAME'])); // Go up one level from /api
        return $protocol . $host . $scriptDir;
    }

    // Create uploads directory if it doesn't exist
    $uploadDir = dirname(__DIR__) . '/uploads/profile_pictures/';
    
    // Check if parent directory exists
    $parentDir = dirname($uploadDir);
    if (!file_exists($parentDir)) {
        if (!mkdir($parentDir, 0777, true)) {
            throw new Exception("Failed to create parent directory: " . error_get_last()['message']);
        }
    }
    
    // Create profile_pictures directory
    if (!file_exists($uploadDir)) {
        if (!mkdir($uploadDir, 0777, true)) {
            throw new Exception("Failed to create directory: " . error_get_last()['message']);
        }
    }
    
    // Check directory permissions
    if (!is_writable($uploadDir)) {
        if (!chmod($uploadDir, 0777)) {
            throw new Exception("Failed to set directory permissions: " . error_get_last()['message']);
        }
    }

    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            try {
                if (isset($_GET['id'])) {
                    // Get specific user
                    $id = $_GET['id'];
                    $sql = "SELECT id, username, email, isAdmin, profile_picture FROM users WHERE id = ?";
                    $stmt = $conn->prepare($sql);
                    $stmt->bind_param("i", $id);
                    
                    if (!$stmt->execute()) {
                        throw new Exception($stmt->error);
                    }
                    
                    $result = $stmt->get_result();
                    $user = $result->fetch_assoc();
                    
                    if ($user) {
                        // Convert profile picture path to full URL if it exists
                        $baseUrl = getBaseUrl();
                        if ($user['profile_picture']) {
                            // Get the full filename with extension
                            $fullPath = $uploadDir . $user['profile_picture'];
                            if (file_exists($fullPath)) {
                                $user['profile_picture'] = $baseUrl . '/uploads/profile_pictures/' . $user['profile_picture'];
                            } else {
                                $user['profile_picture'] = null;
                            }
                        }
                        $response = ['success' => true, 'user' => $user];
                        error_log("Response: " . json_encode($response));
                        echo json_encode($response);
                    } else {
                        http_response_code(404);
                        $response = ['success' => false, 'error' => 'User not found'];
                        error_log("Response: " . json_encode($response));
                        echo json_encode($response);
                    }
                } else {
                    // Get all users
                    $sql = "SELECT id, username, email, isAdmin, profile_picture FROM users ORDER BY username ASC";
                    $result = $conn->query($sql);
                    if (!$result) {
                        throw new Exception($conn->error);
                    }
                    
                    $baseUrl = getBaseUrl();
                    $users = [];
                    while ($row = $result->fetch_assoc()) {
                        // Convert profile picture path to full URL if it exists
                        if ($row['profile_picture']) {
                            // Get the full filename with extension
                            $fullPath = $uploadDir . $row['profile_picture'];
                            if (file_exists($fullPath)) {
                                $row['profile_picture'] = $baseUrl . '/uploads/profile_pictures/' . $row['profile_picture'];
                            } else {
                                $row['profile_picture'] = null;
                            }
                        }
                        $users[] = $row;
                    }
                    
                    $response = ['success' => true, 'users' => $users];
                    error_log("Response: " . json_encode($response));
                    echo json_encode($response);
                }
                exit;
            } catch (Exception $e) {
                error_log("GET error: " . $e->getMessage());
                http_response_code(500);
                $response = ['success' => false, 'error' => $e->getMessage()];
                error_log("Response: " . json_encode($response));
                echo json_encode($response);
                exit;
            }
            break;

        case 'POST':
            try {
                // Get JSON data
                $input = file_get_contents('php://input');
                $data = json_decode($input, true);

                // Validate required fields
                if (!isset($data['username']) || !isset($data['email']) || !isset($data['password'])) {
                    http_response_code(400);
                    $response = ['error' => 'Missing required fields'];
                    error_log("Response: " . json_encode($response));
                    echo json_encode($response);
                    exit();
                }

                // Handle profile picture if provided
                $profilePicturePath = null;
                if (isset($data['profile_picture']) && !empty($data['profile_picture'])) {
                    // Extract the base64 data
                    $imageData = base64_decode($data['profile_picture']);
                    $filename = uniqid() . '.jpg';
                    $filePath = $uploadDir . $filename;
                    
                    // Save the image
                    if (file_put_contents($filePath, $imageData)) {
                        $profilePicturePath = $filename; // Store only the filename
                    } else {
                        http_response_code(500);
                        $response = ['error' => 'Failed to save profile picture'];
                        error_log("Response: " . json_encode($response));
                        echo json_encode($response);
                        exit();
                    }
                }

                // Hash the password
                $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);

                // Insert user into database
                $stmt = $conn->prepare("INSERT INTO users (username, email, password, isAdmin, profile_picture) VALUES (?, ?, ?, ?, ?)");
                if (!$stmt) {
                    throw new Exception("Failed to prepare statement: " . $conn->error);
                }

                $isAdmin = isset($data['isAdmin']) ? $data['isAdmin'] : 0;
                $stmt->bind_param("sssis", $data['username'], $data['email'], $hashedPassword, $isAdmin, $profilePicturePath);

                if ($stmt->execute()) {
                    http_response_code(201);
                    $baseUrl = getBaseUrl();
                    if ($profilePicturePath) {
                        $profilePictureUrl = $baseUrl . '/uploads/profile_pictures/' . $profilePicturePath;
                    } else {
                        $profilePictureUrl = null;
                    }
                    $response = ['success' => true, 'message' => 'User created successfully', 'profile_picture' => $profilePictureUrl];
                    error_log("Response: " . json_encode($response));
                    echo json_encode($response);
                } else {
                    // If there was an error and we uploaded a file, delete it
                    if ($profilePicturePath && file_exists($uploadDir . $profilePicturePath)) {
                        unlink($uploadDir . $profilePicturePath);
                    }
                    http_response_code(500);
                    $response = ['error' => 'Failed to create user: ' . $stmt->error];
                    error_log("Response: " . json_encode($response));
                    echo json_encode($response);
                }

                $stmt->close();
            } catch (Exception $e) {
                error_log("POST error: " . $e->getMessage());
                http_response_code(500);
                $response = ['error' => $e->getMessage()];
                error_log("Response: " . json_encode($response));
                echo json_encode($response);
            }
            break;

        case 'PUT':
            try {
                if (!isset($_GET['id'])) {
                    throw new Exception('No user ID provided');
                }
                
                $data = json_decode(file_get_contents('php://input'), true);
                
                if (isset($data['isAdmin'])) {
                    $stmt = $conn->prepare("UPDATE users SET isAdmin = ? WHERE id = ?");
                    if (!$stmt) {
                        throw new Exception("Prepare failed: " . $conn->error);
                    }
                    
                    $isAdmin = $data['isAdmin'];
                    $id = $_GET['id'];
                    
                    $stmt->bind_param("ii", $isAdmin, $id);
                    
                    if (!$stmt->execute()) {
                        throw new Exception($stmt->error);
                    }
                    
                    $response = ['success' => true];
                    error_log("Response: " . json_encode($response));
                    echo json_encode($response);
                } else {
                    throw new Exception('No valid update data provided');
                }
            } catch (Exception $e) {
                error_log("PUT error: " . $e->getMessage());
                http_response_code(500);
                $response = ['error' => $e->getMessage()];
                error_log("Response: " . json_encode($response));
                echo json_encode($response);
            }
            break;

        case 'DELETE':
            try {
                if (!isset($_GET['id'])) {
                    throw new Exception('No user ID provided');
                }

                $id = $_GET['id'];
                
                // Get user's profile picture path before deleting
                $stmt = $conn->prepare("SELECT profile_picture FROM users WHERE id = ?");
                $stmt->bind_param("i", $id);
                $stmt->execute();
                $result = $stmt->get_result();
                $user = $result->fetch_assoc();

                // Delete the user
                $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
                $stmt->bind_param("i", $id);
                
                if (!$stmt->execute()) {
                    throw new Exception($stmt->error);
                }

                // Delete profile picture file if it exists
                if ($user && $user['profile_picture']) {
                    $filePath = $uploadDir . $user['profile_picture'];
                    if (file_exists($filePath)) {
                        unlink($filePath);
                    }
                }

                $response = ['success' => true];
                error_log("Response: " . json_encode($response));
                echo json_encode($response);
            } catch (Exception $e) {
                error_log("DELETE error: " . $e->getMessage());
                http_response_code(500);
                $response = ['error' => $e->getMessage()];
                error_log("Response: " . json_encode($response));
                echo json_encode($response);
            }
            break;

        default:
            http_response_code(405);
            $response = ['error' => 'Method not allowed'];
            error_log("Response: " . json_encode($response));
            echo json_encode($response);
            break;
    }
} catch (Exception $e) {
    error_log("API error: " . $e->getMessage());
    http_response_code(500);
    $response = ['error' => $e->getMessage()];
    error_log("Response: " . json_encode($response));
    echo json_encode($response);
}

$conn->close();
?>
