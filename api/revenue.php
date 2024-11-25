<?php
require_once 'config.php';
header('Content-Type: application/json');

try {
    $timeframe = isset($_GET['timeframe']) ? $_GET['timeframe'] : 'today';
    $startDate = '';
    $endDate = date('Y-m-d');
    
    switch ($timeframe) {
        case 'today':
            $startDate = date('Y-m-d');
            break;
        case 'week':
            $startDate = date('Y-m-d', strtotime('-7 days'));
            break;
        case 'month':
            $startDate = date('Y-m-d', strtotime('-30 days'));
            break;
        case 'year':
            $startDate = date('Y-m-d', strtotime('-365 days'));
            break;
        default:
            throw new Exception('Invalid timeframe');
    }
    
    // Get current period revenue
    $stmt = $conn->prepare("
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE date BETWEEN ? AND ?
        AND status = 'completed'
    ");
    $stmt->bind_param("ss", $startDate, $endDate);
    $stmt->execute();
    $result = $stmt->get_result();
    $currentPeriod = $result->fetch_assoc()['total'];
    
    // Get previous period revenue
    $previousStartDate = date('Y-m-d', strtotime($startDate . ' -' . (strtotime($endDate) - strtotime($startDate)) . ' seconds'));
    $previousEndDate = date('Y-m-d', strtotime($endDate . ' -' . (strtotime($endDate) - strtotime($startDate)) . ' seconds'));
    
    $stmt = $conn->prepare("
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE date BETWEEN ? AND ?
        AND status = 'completed'
    ");
    $stmt->bind_param("ss", $previousStartDate, $previousEndDate);
    $stmt->execute();
    $result = $stmt->get_result();
    $previousPeriod = $result->fetch_assoc()['total'];
    
    // Calculate percentage change
    $percentChange = $previousPeriod > 0 ? 
        round((($currentPeriod - $previousPeriod) / $previousPeriod) * 100, 1) : 
        100;
    
    echo json_encode([
        'success' => true,
        'total' => $currentPeriod,
        'change' => $percentChange,
        'timeframe' => $timeframe
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
