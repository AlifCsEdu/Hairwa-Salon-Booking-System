<?php
// Disable error display but keep logging
ini_set('display_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', '../php_errors.log');

// Ensure no output before headers
ob_start();

// Set JSON content type
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../config/database.php';

// Log database connection status
error_log("Database connection status: " . ($conn->connect_error ? "Failed: " . $conn->connect_error : "Connected"));

// Function to safely return JSON response
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    error_log("Sending response: " . json_encode($data));
    echo json_encode($data);
    exit();
}

// Create services table if not exists
$sql = "CREATE TABLE IF NOT EXISTS services (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    duration INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    description TEXT,
    image_path VARCHAR(255) DEFAULT 'img/service-default.jpg',
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)";

if (!$conn->query($sql)) {
    error_log("Error creating services table: " . $conn->error);
    sendJsonResponse(['success' => false, 'error' => 'Database error: ' . $conn->error], 500);
}

// Create uploads directory if it doesn't exist
$uploadsDir = '../uploads/services';
if (!file_exists($uploadsDir)) {
    mkdir($uploadsDir, 0777, true);
}

try {
    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            $action = $_GET['action'] ?? null;
            
            // Check if image_path column exists
            $hasImagePath = $conn->query("SHOW COLUMNS FROM services LIKE 'image_path'")->num_rows > 0;
            error_log("Has image_path column: " . ($hasImagePath ? "Yes" : "No"));
            
            if ($action === 'getPopular') {
                try {
                    error_log("Getting popular services...");
                    
                    // Debug: Check appointment statuses
                    $statusCheck = $conn->query("SELECT DISTINCT status FROM appointments");
                    if ($statusCheck) {
                        $statuses = [];
                        while ($row = $statusCheck->fetch_assoc()) {
                            $statuses[] = $row['status'];
                        }
                        error_log("Available appointment statuses: " . implode(", ", $statuses));
                    }

                    // Get services with completed bookings in the last 30 days
                    $sql = "SELECT 
                        s.id,
                        s.name,
                        COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.id ELSE NULL END) as booking_count
                    FROM 
                        services s
                        LEFT JOIN appointments a ON s.id = a.service_id
                        AND a.datetime >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                    WHERE 
                        s.deleted = FALSE
                    GROUP BY 
                        s.id, s.name
                    ORDER BY 
                        booking_count DESC
                    LIMIT 5";
                    
                    error_log("Popular services SQL: " . $sql);
                    $result = $conn->query($sql);
                    if (!$result) {
                        error_log("SQL Error: " . $conn->error);
                        throw new Exception("Error fetching popular services: " . $conn->error);
                    }
                    
                    $services = [];
                    while ($row = $result->fetch_assoc()) {
                        error_log("Service row: " . json_encode($row));
                        $services[] = [
                            'id' => intval($row['id']),
                            'name' => $row['name'],
                            'booking_count' => intval($row['booking_count'])
                        ];
                    }
                    
                    // Debug: Log the final services array
                    error_log("Final services array: " . json_encode($services));
                    
                    header('Content-Type: application/json');
                    echo json_encode([
                        'success' => true,
                        'services' => $services
                    ]);
                    exit;
                } catch (Exception $e) {
                    error_log("Error in getPopular: " . $e->getMessage());
                    header('Content-Type: application/json');
                    http_response_code(500);
                    echo json_encode([
                        'success' => false,
                        'error' => $e->getMessage()
                    ]);
                    exit;
                }
            } else {
                // Get all services
                $sql = "SELECT id, name, duration, price, description, image_path FROM services WHERE deleted = FALSE ORDER BY name";
                
                error_log("All services SQL: " . $sql);
                $result = $conn->query($sql);
                if (!$result) {
                    error_log("Error fetching services: " . $conn->error);
                    throw new Exception("Error fetching services");
                }
                
                $services = [];
                while ($row = $result->fetch_assoc()) {
                    error_log("Processing service row: " . json_encode($row));
                    // Ensure ID is returned as integer
                    $row['id'] = intval($row['id']);
                    $row['duration'] = intval($row['duration']);
                    $row['price'] = floatval($row['price']);
                    $services[] = $row;
                }
                
                $response = ['success' => true, 'services' => $services];
                error_log("Sending JSON response: " . json_encode($response));
                header('Content-Type: application/json');
                echo json_encode($response);
                exit;
            }
            break;

        case 'POST':
            try {
                $data = json_decode(file_get_contents('php://input'), true);
                error_log("Received POST data: " . json_encode($data));
                
                if (!$data) {
                    throw new Exception('Invalid JSON data');
                }
                
                validateService($data);
                
                // Handle base64 image if provided
                $imagePath = 'img/service-default.jpg';
                if (!empty($data['image'])) {
                    $imageData = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $data['image']));
                    $imageName = uniqid() . '.jpg';
                    $imagePath = 'uploads/services/' . $imageName;
                    file_put_contents('../' . $imagePath, $imageData);
                }
                
                $stmt = $conn->prepare("INSERT INTO services (name, duration, price, description, image_path) VALUES (?, ?, ?, ?, ?)");
                $stmt->bind_param("sidss", 
                    $data['name'],
                    $data['duration'],
                    $data['price'],
                    $data['description'],
                    $imagePath
                );
                
                if (!$stmt->execute()) {
                    throw new Exception("Error creating service: " . $stmt->error);
                }
                
                sendJsonResponse([
                    'success' => true,
                    'message' => 'Service created successfully',
                    'id' => $stmt->insert_id
                ]);
            } catch (Exception $e) {
                error_log("Error in POST request: " . $e->getMessage());
                sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 400);
            }
            break;

        case 'PUT':
            try {
                error_log("Starting PUT request");
                $input = file_get_contents('php://input');
                error_log("Raw input: " . $input);
                
                $data = json_decode($input, true);
                error_log("Decoded PUT data: " . json_encode($data));
                
                if (!$data || !isset($data['id'])) {
                    throw new Exception('Invalid request data');
                }
                
                validateService($data);
                
                // Check if service exists
                $stmt = $conn->prepare("SELECT id FROM services WHERE id = ? AND deleted = FALSE");
                if (!$stmt) {
                    throw new Exception("Error preparing select statement: " . $conn->error);
                }
                
                $stmt->bind_param("i", $data['id']);
                if (!$stmt->execute()) {
                    throw new Exception("Error executing select statement: " . $stmt->error);
                }
                
                $result = $stmt->get_result();
                if ($result->num_rows === 0) {
                    throw new Exception('Service not found');
                }
                
                // Handle base64 image if provided
                $imageClause = '';
                $types = 'sids';  
                $params = [$data['name'], $data['duration'], $data['price'], $data['description']];
                
                if (!empty($data['image'])) {
                    try {
                        $imageData = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $data['image']));
                        if ($imageData === false) {
                            throw new Exception("Invalid base64 image data");
                        }
                        $imageName = uniqid() . '.jpg';
                        $imagePath = 'uploads/services/' . $imageName;
                        if (!file_put_contents('../' . $imagePath, $imageData)) {
                            throw new Exception("Failed to save image file");
                        }
                        $imageClause = ', image_path = ?';
                        $types .= 's';
                        $params[] = $imagePath;
                    } catch (Exception $e) {
                        error_log("Error processing image: " . $e->getMessage());
                        throw new Exception("Error processing image: " . $e->getMessage());
                    }
                }
                
                $sql = "UPDATE services SET name = ?, duration = ?, price = ?, description = ?" . $imageClause . " WHERE id = ? AND deleted = FALSE";
                $params[] = $data['id'];
                $types .= 'i';
                
                error_log("Update SQL: " . $sql);
                error_log("Params: " . json_encode($params));
                error_log("Types: " . $types);
                
                $stmt = $conn->prepare($sql);
                if (!$stmt) {
                    throw new Exception("Error preparing update statement: " . $conn->error);
                }
                
                $stmt->bind_param($types, ...$params);
                if (!$stmt->execute()) {
                    throw new Exception("Error updating service: " . $stmt->error);
                }
                
                sendJsonResponse(['success' => true, 'message' => 'Service updated successfully']);
            } catch (Exception $e) {
                error_log("Error in PUT request: " . $e->getMessage());
                sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 400);
            }
            break;

        case 'DELETE':
            try {
                $id = $_GET['id'] ?? null;
                error_log("Received DELETE request for ID: " . $id);
                
                if (!$id) {
                    throw new Exception('Service ID is required');
                }
                
                $stmt = $conn->prepare("UPDATE services SET deleted = TRUE WHERE id = ?");
                $stmt->bind_param("i", $id);
                
                if (!$stmt->execute()) {
                    throw new Exception("Error deleting service: " . $stmt->error);
                }
                
                sendJsonResponse(['success' => true, 'message' => 'Service deleted successfully']);
            } catch (Exception $e) {
                error_log("Error in DELETE request: " . $e->getMessage());
                sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 400);
            }
            break;

        default:
            sendJsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
    }
} catch (Exception $e) {
    error_log("Error in services.php: " . $e->getMessage());
    sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
}

function validateService($data) {
    $required = ['name', 'duration', 'price'];
    foreach ($required as $field) {
        if (!isset($data[$field])) {
            throw new Exception(ucfirst($field) . ' is required');
        }
    }
}

$conn->close();
?>
