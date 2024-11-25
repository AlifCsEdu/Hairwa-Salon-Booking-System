<?php
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

// Set timezone to Asia/Kuala_Lumpur
date_default_timezone_set('Asia/Kuala_Lumpur');

// Enable error reporting but don't display errors
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Enable error logging
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/appointments_error.log');

try {
    switch($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            if (isset($_GET['customer_email'])) {
                $email = $_GET['customer_email'];
                $sql = "SELECT a.*, s.name as service_name, s.price as service_price 
                        FROM appointments a 
                        LEFT JOIN services s ON a.service_id = s.id 
                        WHERE a.customer_email = ? 
                        ORDER BY a.datetime DESC";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("s", $email);
                $stmt->execute();
                $result = $stmt->get_result();
            } else if (isset($_GET['date'])) {
                $date = $_GET['date'];
                $sql = "SELECT a.*, s.name as service_name, s.price as service_price 
                        FROM appointments a 
                        LEFT JOIN services s ON a.service_id = s.id 
                        WHERE DATE(a.datetime) = ? 
                        ORDER BY a.datetime";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("s", $date);
                $stmt->execute();
                $result = $stmt->get_result();
            } else {
                $sql = "SELECT a.*, s.name as service_name, s.price as service_price 
                        FROM appointments a 
                        LEFT JOIN services s ON a.service_id = s.id 
                        ORDER BY a.datetime DESC";
                $result = $conn->query($sql);
            }
            
            if (!$result) {
                throw new Exception("Error fetching appointments: " . $conn->error);
            }
            
            $appointments = [];
            while ($row = $result->fetch_assoc()) {
                $appointments[] = $row;
            }
            
            echo json_encode([
                'success' => true,
                'appointments' => $appointments
            ]);
            break;

        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            error_log("Received booking data: " . json_encode($data));
            
            if (!$data) {
                throw new Exception("Invalid request data");
            }

            // Get service ID and name
            $serviceId = $data['service_id'] ?? null;
            if (!$serviceId) {
                throw new Exception("No service selected");
            }

            // Get service duration and price from services table
            $stmt = $conn->prepare("SELECT duration, price, name FROM services WHERE id = ?");
            $stmt->bind_param("i", $serviceId);
            if (!$stmt->execute()) {
                throw new Exception("Error fetching service details: " . $stmt->error);
            }
            $result = $stmt->get_result();
            $service = $result->fetch_assoc();
            $serviceDuration = $service['duration'];
            $basePrice = $service['price'];
            $serviceName = $service['name'];

            // Calculate total price based on group size
            $groupSize = intval($data['group_size']);
            $totalPrice = $basePrice * $groupSize;

            // Create a DateTime object, explicitly treating the input as KL timezone
            $klTimezone = new DateTimeZone('Asia/Kuala_Lumpur');
            $appointmentDateTime = DateTime::createFromFormat('Y-m-d H:i', $data['datetime'], $klTimezone);
            
            if (!$appointmentDateTime) {
                throw new Exception("Invalid datetime format");
            }
            
            // Format the datetime in SQL format while preserving the KL timezone
            $formattedDateTime = $appointmentDateTime->format('Y-m-d H:i:s');
            
            error_log("Original datetime: " . $data['datetime']);
            error_log("Parsed datetime: " . $appointmentDateTime->format('Y-m-d H:i:s e'));
            error_log("Formatted datetime for DB: " . $formattedDateTime);

            $sql = "INSERT INTO appointments (
                customer_name,
                customer_email,
                customer_phone,
                service_id,
                datetime,
                group_size,
                status,
                service_names,
                total_price,
                service_durations
            ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)";

            $stmt = $conn->prepare($sql);
            if (!$stmt) {
                throw new Exception("Error preparing appointment insert: " . $conn->error);
            }

            error_log("Debug - Service Details: " . json_encode([
                'service_id' => $serviceId,
                'service_name' => $serviceName,
                'duration' => $serviceDuration,
                'base_price' => $basePrice,
                'group_size' => $groupSize,
                'total_price' => $totalPrice,
                'datetime' => $formattedDateTime
            ]));

            $stmt->bind_param(
                "sssisssdi",
                $data['customer_name'],
                $data['customer_email'],
                $data['customer_phone'],
                $serviceId,
                $formattedDateTime,
                $groupSize,
                $serviceName,
                $totalPrice,
                $serviceDuration
            );

            if (!$stmt->execute()) {
                throw new Exception("Error creating appointment: " . $stmt->error);
            }

            $appointmentId = $conn->insert_id;
            error_log("Created appointment with ID: " . $appointmentId);

            echo json_encode([
                'success' => true,
                'message' => 'Appointment created successfully',
                'appointment_id' => $appointmentId
            ]);
            break;

        case 'PUT':
            $id = $_GET['id'] ?? null;
            if (!$id) {
                throw new Exception('Appointment ID required');
            }
            
            $data = json_decode(file_get_contents('php://input'), true);
            if (!$data) {
                throw new Exception("Invalid JSON data");
            }
            
            if (isset($data['status'])) {
                $sql = "UPDATE appointments SET status = ? WHERE id = ?";
                $stmt = $conn->prepare($sql);
                if (!$stmt) {
                    throw new Exception("Error preparing status update: " . $conn->error);
                }
                
                $stmt->bind_param("si", $data['status'], $id);
                if (!$stmt->execute()) {
                    throw new Exception("Error updating status: " . $stmt->error);
                }
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Status updated successfully'
                ]);
            } else {
                throw new Exception("No status provided");
            }
            break;

        case 'GET':
            $action = $_GET['action'] ?? null;
            if ($action === 'getTodayStats') {
                try {
                    $today = date('Y-m-d');
                    $now = date('H:i:s');
                    
                    // Get upcoming appointments
                    $stmt = $conn->prepare("
                        SELECT COUNT(*) as count
                        FROM appointments
                        WHERE DATE(datetime) = ?
                        AND TIME(datetime) > ?
                        AND status = 'confirmed'
                    ");
                    $stmt->bind_param("ss", $today, $now);
                    $stmt->execute();
                    $result = $stmt->get_result();
                    $upcoming = $result->fetch_assoc()['count'];
                    
                    // Get completed appointments
                    $stmt = $conn->prepare("
                        SELECT COUNT(*) as count
                        FROM appointments
                        WHERE DATE(datetime) = ?
                        AND TIME(datetime) <= ?
                        AND status = 'completed'
                    ");
                    $stmt->bind_param("ss", $today, $now);
                    $stmt->execute();
                    $result = $stmt->get_result();
                    $completed = $result->fetch_assoc()['count'];
                    
                    echo json_encode([
                        'success' => true,
                        'upcoming' => $upcoming,
                        'completed' => $completed
                    ]);
                } catch (Exception $e) {
                    echo json_encode([
                        'success' => false,
                        'message' => $e->getMessage()
                    ]);
                }
                exit;
            }
            break;
    }
} catch (Exception $e) {
    error_log("Error in appointments.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

$conn->close();
?>
