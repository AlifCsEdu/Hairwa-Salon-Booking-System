<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';
date_default_timezone_set('Asia/Kuala_Lumpur');

try {
    // Appointment Distribution (9 AM to 7 PM in 30-minute intervals)
    $sql = "SELECT 
                a.datetime as start_time,
                DATE_ADD(a.datetime, INTERVAL s.duration MINUTE) as end_time,
                s.duration,
                a.customer_name,
                s.name as service_name
            FROM appointments a
            JOIN services s ON a.service_id = s.id
            WHERE DATE(a.datetime) = CURDATE()
            AND HOUR(a.datetime) BETWEEN 9 AND 19
            AND a.status != 'cancelled'
            ORDER BY a.datetime";
    $result = $conn->query($sql);
    
    // Initialize all 30-minute slots with 0
    $appointmentDistribution = [];
    for ($hour = 9; $hour <= 19; $hour++) {
        for ($half = 0; $half < 2; $half++) {
            $appointmentDistribution[] = [
                'hour' => $hour,
                'half_hour' => $half,
                'count' => 0,
                'appointments' => []
            ];
        }
    }
    
    // Fill in counts for each time slot that an appointment spans
    while ($row = $result->fetch_assoc()) {
        $start = strtotime($row['start_time']);
        $end = strtotime($row['end_time']);
        
        // Create appointment info
        $appointmentInfo = [
            'customer_name' => $row['customer_name'],
            'service_name' => $row['service_name'],
            'start_time' => date('h:i A', $start),
            'end_time' => date('h:i A', $end),
            'duration' => $row['duration']
        ];
        
        // Loop through each 30-minute slot between start and end time
        for ($time = $start; $time < $end; $time += 30 * 60) {
            $slot_hour = (int)date('G', $time);
            $slot_minute = (int)date('i', $time);
            $slot_half = floor($slot_minute / 30);
            
            // Only count slots during business hours
            if ($slot_hour >= 9 && $slot_hour <= 19) {
                foreach ($appointmentDistribution as &$slot) {
                    if ($slot['hour'] == $slot_hour && $slot['half_hour'] == $slot_half) {
                        $slot['count']++;
                        $slot['appointments'][] = $appointmentInfo;
                        break;
                    }
                }
            }
        }
    }

    // Popular Services (Last 30 days)
    $sql = "SELECT 
                s.name as service_name,
                COUNT(a.id) as booking_count,
                SUM(a.total_price) as revenue
            FROM appointments a
            JOIN services s ON FIND_IN_SET(s.name, a.service_names)
            WHERE a.datetime >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            AND a.status != 'cancelled'
            GROUP BY s.name
            ORDER BY booking_count DESC
            LIMIT 4";
    $result = $conn->query($sql);
    $popularServices = [];
    while ($row = $result->fetch_assoc()) {
        $popularServices[] = [
            'service_name' => $row['service_name'],
            'booking_count' => intval($row['booking_count']),
            'revenue' => floatval($row['revenue'])
        ];
    }

    // Today's Upcoming Appointments
    $sql = "SELECT 
                a.*,
                TIME(a.datetime) as time,
                a.service_names,
                a.group_size
            FROM appointments a
            WHERE DATE(a.datetime) = CURDATE()
            AND TIME(a.datetime) >= CURTIME()
            AND a.status != 'cancelled'
            ORDER BY a.datetime
            LIMIT 5";
    $result = $conn->query($sql);
    $upcomingAppointments = [];
    while ($row = $result->fetch_assoc()) {
        $upcomingAppointments[] = [
            'id' => intval($row['id']),
            'customer_name' => $row['customer_name'],
            'status' => $row['status'],
            'datetime' => $row['datetime'],
            'time' => $row['time'],
            'service_names' => $row['service_names'],
            'group_size' => intval($row['group_size'])
        ];
    }

    // Recent Activity (Last 24 hours)
    $sql = "SELECT 
                'appointment' as type,
                id,
                customer_name,
                status,
                datetime,
                created_at,
                'New appointment booked' as description
            FROM appointments
            ORDER BY created_at DESC
            LIMIT 10";
    $result = $conn->query($sql);
    $recentActivity = [];
    
    while ($row = $result->fetch_assoc()) {
        $appointment_time = strtotime($row['datetime']);
        $current_time = time();
        
        // Format the time based on whether it's a future or past appointment
        if ($appointment_time > $current_time) {
            // Future appointment
            $days_until = floor(($appointment_time - $current_time) / (60 * 60 * 24));
            if ($days_until == 0) {
                // Today
                $formatted_time = 'Today at ' . date('h:i A', $appointment_time);
            } else if ($days_until == 1) {
                // Tomorrow
                $formatted_time = 'Tomorrow at ' . date('h:i A', $appointment_time);
            } else {
                // Future date
                $formatted_time = date('d/m/Y h:i A', $appointment_time);
            }
        } else {
            // Past appointment
            $diff_minutes = round(($current_time - $appointment_time) / 60);
            if ($diff_minutes < 1) {
                $formatted_time = 'Just now';
            } else if ($diff_minutes < 60) {
                $formatted_time = $diff_minutes . ' minute' . ($diff_minutes == 1 ? '' : 's') . ' ago';
            } else if (date('Y-m-d', $appointment_time) === date('Y-m-d')) {
                $formatted_time = date('h:i A', $appointment_time);
            } else {
                $formatted_time = date('d/m/Y h:i A', $appointment_time);
            }
        }
        
        // Calculate how long ago the appointment was booked
        $created_time = strtotime($row['created_at']);
        $booking_diff_minutes = round(($current_time - $created_time) / 60);
        
        if ($booking_diff_minutes < 1) {
            $booking_time = 'Just now';
        } else if ($booking_diff_minutes < 60) {
            $booking_time = $booking_diff_minutes . ' minute' . ($booking_diff_minutes == 1 ? '' : 's') . ' ago';
        } else if (date('Y-m-d', $created_time) === date('Y-m-d')) {
            $booking_time = 'Today at ' . date('h:i A', $created_time);
        } else {
            $booking_time = date('d/m/Y h:i A', $created_time);
        }
        
        $recentActivity[] = [
            'type' => $row['type'],
            'id' => intval($row['id']),
            'customer_name' => $row['customer_name'],
            'status' => $row['status'],
            'timestamp' => $row['datetime'],
            'formatted_time' => $formatted_time,
            'booking_time' => $booking_time,
            'description' => $row['description'],
            'debug_info' => [
                'appointment_time' => $row['datetime'],
                'created_at' => $row['created_at'],
                'current_time' => date('Y-m-d H:i:s'),
                'is_future' => $appointment_time > $current_time,
                'time_diff' => $appointment_time - $current_time
            ]
        ];
    }

    // Last 7 Days Revenue
    $sql = "SELECT 
                DATE(datetime) as date,
                SUM(total_price) as revenue
            FROM appointments
            WHERE datetime >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            AND status IN ('completed', 'confirmed')
            GROUP BY DATE(datetime)
            ORDER BY date";
    $result = $conn->query($sql);
    $revenueData = [];
    while ($row = $result->fetch_assoc()) {
        $revenueData[] = [
            'date' => $row['date'],
            'revenue' => floatval($row['revenue'])
        ];
    }

    echo json_encode([
        'success' => true,
        'appointmentDistribution' => $appointmentDistribution,
        'popularServices' => $popularServices,
        'upcomingAppointments' => $upcomingAppointments,
        'recentActivity' => $recentActivity,
        'revenueData' => $revenueData
    ]);

} catch (Exception $e) {
    error_log("Error in dashboard-overview.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

$conn->close();
?>
