<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';

// Set timezone to Asia/Kuala_Lumpur
date_default_timezone_set('Asia/Kuala_Lumpur');

// Enable error reporting but don't display errors
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Enable error logging
ini_set('log_errors', 1);
ini_set('error_log', 'c:/xampp/htdocs/Meow3/spatemp/api/appointments_error.log');

try {
    $currentDate = date('Y-m-d');
    $firstDayOfMonth = date('Y-m-01');
    $lastDayOfMonth = date('Y-m-t');

    // Get total appointments for this month
    $sql = "SELECT COUNT(*) as total FROM appointments WHERE DATE(datetime) BETWEEN ? AND ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $firstDayOfMonth, $lastDayOfMonth);
    $stmt->execute();
    $result = $stmt->get_result();
    $total = $result->fetch_assoc()['total'];

    // Get pending appointments
    $sql = "SELECT COUNT(*) as pending FROM appointments WHERE status = 'Pending'";
    $result = $conn->query($sql);
    $pending = $result->fetch_assoc()['pending'];

    // Get upcoming appointments for today
    $sql = "SELECT COUNT(*) as upcoming FROM appointments WHERE DATE(datetime) = ? AND status = 'Confirmed'";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $currentDate);
    $stmt->execute();
    $result = $stmt->get_result();
    $upcoming = $result->fetch_assoc()['upcoming'];

    // Get completed appointments for today
    $sql = "SELECT COUNT(*) as completed FROM appointments WHERE DATE(datetime) = ? AND status = 'Completed'";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $currentDate);
    $stmt->execute();
    $result = $stmt->get_result();
    $completed = $result->fetch_assoc()['completed'];

    // Debug logging
    error_log("Stats - Total: $total, Pending: $pending, Upcoming: $upcoming, Completed: $completed");

    echo json_encode([
        'success' => true,
        'data' => [
            'total' => intval($total),
            'pending' => intval($pending),
            'upcoming' => intval($upcoming),
            'completed' => intval($completed)
        ]
    ]);
} catch (Exception $e) {
    error_log("Error in appointment-stats.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

$conn->close();
?>
