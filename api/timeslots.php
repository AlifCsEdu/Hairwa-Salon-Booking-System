<?php
error_reporting(E_ALL); // Enable error reporting for debugging
ini_set('display_errors', 1);
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    // Get date from query string
    $date = isset($_GET['date']) ? $_GET['date'] : null;

    if (!$date) {
        throw new Exception('Date parameter is required');
    }

    // Set timezone to Asia/Kuala_Lumpur
    date_default_timezone_set('Asia/Kuala_Lumpur');

    // Database connection
    $servername = "localhost";
    $username = "root";
    $password = "";
    $dbname = "hairwa_db";

    $conn = new mysqli($servername, $username, $password, $dbname);

    if ($conn->connect_error) {
        throw new Exception('Database connection failed: ' . $conn->connect_error);
    }

    // Debug: Check table structure
    $result = $conn->query("DESCRIBE appointments");
    if ($result) {
        error_log("Appointments table structure:");
        while ($row = $result->fetch_assoc()) {
            error_log(print_r($row, true));
        }
    }

    // Get all appointments for the selected date (only pending and confirmed)
    $sql = "SELECT 
                a.datetime as appointment_time,
                s.duration,
                a.status 
            FROM appointments a
            JOIN services s ON a.service_id = s.id
            WHERE DATE(datetime) = ?
            AND a.status IN ('pending', 'confirmed')  
            ORDER BY a.datetime";

    // Debug info
    error_log("SQL Query: " . $sql);
    error_log("Date parameter: " . $date);

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception('Prepare failed: ' . $conn->error);
    }

    $stmt->bind_param("s", $date);
    if (!$stmt->execute()) {
        throw new Exception('Execute failed: ' . $stmt->error);
    }

    $result = $stmt->get_result();
    if (!$result) {
        throw new Exception('Get result failed: ' . $stmt->error);
    }

    $occupiedTimeSlots = [];

    // For each appointment, mark the time slots as occupied
    while ($row = $result->fetch_assoc()) {
        error_log("Processing appointment: " . print_r($row, true));
        
        $appointmentTime = new DateTime($row['appointment_time']);
        $duration = intval($row['duration']);
        
        error_log("Appointment time: " . $appointmentTime->format('Y-m-d H:i:s'));
        error_log("Duration: " . $duration);
        
        // Calculate end time
        $endTime = clone $appointmentTime;
        $endTime->modify("+{$duration} minutes");
        
        // Mark all 15-minute slots within the appointment duration as occupied
        $currentSlot = clone $appointmentTime;
        while ($currentSlot < $endTime) {
            $timeSlot = $currentSlot->format('H:i');
            $occupiedTimeSlots[] = [
                'time' => $timeSlot,
                'status' => $row['status']
            ];
            error_log("Added occupied slot: " . $timeSlot);
            $currentSlot->modify('+15 minutes');
        }
    }

    $stmt->close();
    $conn->close();

    error_log("Final occupied slots: " . print_r($occupiedTimeSlots, true));
    echo json_encode($occupiedTimeSlots);

} catch (Exception $e) {
    error_log("Timeslots API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage(),
        'date' => $date ?? 'not set',
        'sql' => $sql ?? 'not set'
    ]);
}
?>
