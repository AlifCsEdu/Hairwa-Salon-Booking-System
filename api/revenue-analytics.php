<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', '../logs/php_errors.log');

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';

try {
    // Validate database connection
    if (!isset($conn) || $conn->connect_error) {
        throw new Exception("Database connection failed: " . ($conn->connect_error ?? "Connection not established"));
    }

    $timeframe = $_GET['timeframe'] ?? 'monthly';
    $date = $_GET['date'] ?? date('Y-m');
    
    // Validate date format
    if (!preg_match('/^\d{4}-\d{2}(-\d{2})?$/', $date)) {
        throw new Exception("Invalid date format. Expected YYYY-MM or YYYY-MM-DD");
    }
    
    // Format date parts based on timeframe
    $year = substr($date, 0, 4);
    $month = substr($date, 5, 2);
    
    error_log("Revenue Analytics Debug - Timeframe: $timeframe, Date: $date, Year: $year, Month: $month");
    
    // Base query for different timeframes
    switch($timeframe) {
        case 'daily':
            $groupBy = "DATE(datetime)";
            $dateFormat = "%d/%m/%Y";
            $startDate = "$year-$month-01";
            $endDate = date('Y-m-t', strtotime($startDate));
            break;
        case 'weekly':
            $groupBy = "YEARWEEK(datetime)";
            $dateFormat = "Week %v, %Y";
            $startDate = "$year-01-01";
            $endDate = "$year-12-31";
            break;
        case 'yearly':
            $groupBy = "YEAR(datetime)";
            $dateFormat = "%Y";
            $startDate = "$year-01-01";
            $endDate = "$year-12-31";
            break;
        default: // monthly
            $groupBy = "DATE_FORMAT(datetime, '%Y-%m')";
            $dateFormat = "%M %Y";
            $startDate = "$year-01-01";
            $endDate = "$year-12-31";
    }
    
    // Get revenue data for chart
    $chartQuery = "SELECT 
        DATE_FORMAT(datetime, ?) as period,
        COALESCE(SUM(total_price), 0) as revenue,
        COUNT(*) as appointments
        FROM appointments 
        WHERE datetime BETWEEN ? AND ?
        AND status IN ('completed', 'confirmed', 'pending')
        GROUP BY period
        ORDER BY period";
 
    $stmt = $conn->prepare($chartQuery);
    if (!$stmt) {
        throw new Exception("Failed to prepare chart query: " . $conn->error);
    }
    
    $stmt->bind_param("sss", $dateFormat, $startDate, $endDate);
    if (!$stmt->execute()) {
        throw new Exception("Failed to execute chart query: " . $stmt->error);
    }
    
    $chartResult = $stmt->get_result();
    error_log("Revenue Analytics Debug - Chart Query: " . str_replace('?', "'$dateFormat', '$startDate', '$endDate'", $chartQuery));
    
    // Initialize arrays for chart data
    $periods = [];
    $revenue = [];
    $appointments = [];
    
    while($row = $chartResult->fetch_assoc()) {
        $periods[] = $row['period'];
        $revenue[] = floatval($row['revenue']);
        $appointments[] = intval($row['appointments']);
    }
    
    error_log("Revenue Analytics Debug - Data counts: Periods: " . count($periods) . ", Revenue: " . count($revenue) . ", Appointments: " . count($appointments));
    
    // Get total revenue and comparison
    $totalQuery = "SELECT 
        COALESCE(SUM(total_price), 0) as total,
        COUNT(*) as count,
        COALESCE(SUM(total_price) / NULLIF(COUNT(*), 0), 0) as average
        FROM appointments 
        WHERE datetime BETWEEN ? AND ?
        AND status IN ('completed', 'confirmed', 'pending')";
    
    $stmt = $conn->prepare($totalQuery);
    if (!$stmt) {
        throw new Exception("Failed to prepare total query: " . $conn->error);
    }
    
    $stmt->bind_param("ss", $startDate, $endDate);
    if (!$stmt->execute()) {
        throw new Exception("Failed to execute total query: " . $stmt->error);
    }
    
    $totalResult = $stmt->get_result();
    $totals = $totalResult->fetch_assoc();
    
    // Get most popular services
    $serviceQuery = "SELECT 
        s.name as service_name,
        COUNT(a.id) as booking_count,
        SUM(a.total_price) as revenue
        FROM appointments a
        JOIN services s ON FIND_IN_SET(s.name, a.service_names)
        WHERE a.datetime BETWEEN ? AND ?
        AND a.status IN ('completed', 'confirmed', 'pending')
        GROUP BY s.name
        ORDER BY booking_count DESC
        LIMIT 3";
    
    $stmt = $conn->prepare($serviceQuery);
    if (!$stmt) {
        throw new Exception("Failed to prepare service query: " . $conn->error);
    }
    
    $stmt->bind_param("ss", $startDate, $endDate);
    if (!$stmt->execute()) {
        throw new Exception("Failed to execute service query: " . $stmt->error);
    }
    
    $serviceResult = $stmt->get_result();
    $popularServices = [];
    while ($row = $serviceResult->fetch_assoc()) {
        $popularServices[] = [
            'service_name' => $row['service_name'],
            'booking_count' => intval($row['booking_count']),
            'revenue' => floatval($row['revenue'])
        ];
    }
    
    // Get recent transactions with service names
    $transactionQuery = "SELECT 
        a.datetime,
        a.total_price,
        a.status,
        a.customer_name,
        a.service_names
        FROM appointments a
        WHERE a.datetime BETWEEN ? AND ?
        AND status IN ('completed', 'confirmed', 'pending')
        ORDER BY a.datetime DESC
        LIMIT 10";
    
    $stmt = $conn->prepare($transactionQuery);
    if (!$stmt) {
        throw new Exception("Failed to prepare transaction query: " . $conn->error);
    }
    
    $stmt->bind_param("ss", $startDate, $endDate);
    if (!$stmt->execute()) {
        throw new Exception("Failed to execute transaction query: " . $stmt->error);
    }
    
    $transactionResult = $stmt->get_result();
    $transactions = [];
    while($row = $transactionResult->fetch_assoc()) {
        $transactions[] = $row;
    }
    
    // Calculate percentage change from previous period
    $comparison = [
        'percentage' => 0
    ];
    
    if (!empty($revenue)) {
        $currentTotal = array_sum($revenue);
        $comparison['percentage'] = $currentTotal > 0 ? round(($currentTotal - ($totals['total'] ?? 0)) / $currentTotal * 100, 1) : 0;
    }
    
    $response = [
        'success' => true,
        'periods' => $periods,
        'revenue' => $revenue,
        'appointments' => $appointments,
        'totals' => [
            'revenue' => floatval($totals['total'] ?? 0),
            'count' => intval($totals['count'] ?? 0),
            'average' => floatval($totals['average'] ?? 0)
        ],
        'comparison' => $comparison,
        'popularService' => $popularServices[0] ?? null,
        'popularServices' => $popularServices,
        'transactions' => $transactions
    ];
    
    error_log("Revenue Analytics Debug - Final Response: " . json_encode($response));
    echo json_encode($response);

} catch (Exception $e) {
    error_log("Revenue Analytics Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred while processing your request: ' . $e->getMessage()
    ]);
}
