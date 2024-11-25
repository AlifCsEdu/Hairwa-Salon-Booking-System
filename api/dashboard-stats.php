<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';

try {
    // Get total appointments for current month
    $currentMonth = date('Y-m');
    $totalQuery = "SELECT COUNT(*) as total FROM appointments WHERE DATE_FORMAT(datetime, '%Y-%m') = ?";
    $stmt = $conn->prepare($totalQuery);
    $stmt->bind_param("s", $currentMonth);
    $stmt->execute();
    $totalResult = $stmt->get_result();
    $totalAppointments = $totalResult->fetch_assoc()['total'];

    // Get pending appointments
    $pendingQuery = "SELECT COUNT(*) as pending FROM appointments WHERE status = 'pending'";
    $pendingResult = $conn->query($pendingQuery);
    $pendingAppointments = $pendingResult->fetch_assoc()['pending'];

    // Get today's upcoming appointments (only confirmed)
    $today = date('Y-m-d');
    $todayQuery = "SELECT COUNT(*) as today FROM appointments 
                   WHERE DATE(datetime) = ? 
                   AND status = 'confirmed'";
    $stmt = $conn->prepare($todayQuery);
    $stmt->bind_param("s", $today);
    $stmt->execute();
    $todayResult = $stmt->get_result();
    $todayAppointments = $todayResult->fetch_assoc()['today'];

    // Get today's completed appointments
    $completedQuery = "SELECT COUNT(*) as completed FROM appointments 
                      WHERE DATE(datetime) = ? 
                      AND status = 'completed'";
    $stmt = $conn->prepare($completedQuery);
    $stmt->bind_param("s", $today);
    $stmt->execute();
    $completedResult = $stmt->get_result();
    $completedAppointments = $completedResult->fetch_assoc()['completed'];

    // Get monthly revenue
    $revenueQuery = "SELECT COALESCE(SUM(total_price), 0) as revenue FROM appointments 
                     WHERE DATE_FORMAT(datetime, '%Y-%m') = ? 
                     AND status != 'cancelled'";
    $stmt = $conn->prepare($revenueQuery);
    $stmt->bind_param("s", $currentMonth);
    $stmt->execute();
    $revenueResult = $stmt->get_result();
    $monthlyRevenue = $revenueResult->fetch_assoc()['revenue'];

    // Get last month's revenue for comparison
    $lastMonth = date('Y-m', strtotime('-1 month'));
    $stmt = $conn->prepare($revenueQuery);
    $stmt->bind_param("s", $lastMonth);
    $stmt->execute();
    $lastMonthResult = $stmt->get_result();
    $lastMonthRevenue = $lastMonthResult->fetch_assoc()['revenue'];

    // Calculate revenue change percentage
    $revenueChange = 0;
    if ($lastMonthRevenue > 0) {
        $revenueChange = (($monthlyRevenue - $lastMonthRevenue) / $lastMonthRevenue) * 100;
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'totalAppointments' => $totalAppointments,
            'pendingAppointments' => $pendingAppointments,
            'todayAppointments' => $todayAppointments,
            'completedAppointments' => $completedAppointments,
            'monthlyRevenue' => $monthlyRevenue,
            'revenueChange' => round($revenueChange, 1)
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching dashboard statistics: ' . $e->getMessage()
    ]);
}
