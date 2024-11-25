<?php
require_once 'config.php';
header('Content-Type: application/json');

try {
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $sort = isset($_GET['sort']) ? $_GET['sort'] : 'date';
    $direction = isset($_GET['direction']) ? $_GET['direction'] : 'desc';
    $search = isset($_GET['search']) ? $_GET['search'] : '';
    $status = isset($_GET['status']) ? $_GET['status'] : '';
    $offset = ($page - 1) * $limit;
    
    // Validate sort column
    $allowedColumns = ['date', 'customer', 'service', 'amount', 'status'];
    if (!in_array($sort, $allowedColumns)) {
        $sort = 'date';
    }
    
    // Validate sort direction
    $direction = strtolower($direction) === 'asc' ? 'ASC' : 'DESC';
    
    // Build WHERE clause
    $where = [];
    $params = [];
    $types = '';
    
    if ($search) {
        $where[] = "(c.name LIKE ? OR s.name LIKE ?)";
        $searchParam = "%$search%";
        $params[] = $searchParam;
        $params[] = $searchParam;
        $types .= 'ss';
    }
    
    if ($status) {
        $where[] = "t.status = ?";
        $params[] = $status;
        $types .= 's';
    }
    
    $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    
    // Get total count
    $countQuery = "SELECT COUNT(*) as total 
                   FROM transactions t
                   JOIN customers c ON t.customer_id = c.id
                   JOIN services s ON t.service_id = s.id
                   $whereClause";
    
    $stmt = $conn->prepare($countQuery);
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    $stmt->execute();
    $result = $stmt->get_result();
    $total = $result->fetch_assoc()['total'];
    
    // Get transactions
    $query = "
        SELECT 
            t.id,
            t.date,
            c.name as customer,
            s.name as service,
            t.amount,
            t.status
        FROM transactions t
        JOIN customers c ON t.customer_id = c.id
        JOIN services s ON t.service_id = s.id
        $whereClause
        ORDER BY {$sort} {$direction}
        LIMIT ?, ?
    ";
    
    $stmt = $conn->prepare($query);
    if (!empty($params)) {
        $params[] = $offset;
        $params[] = $limit;
        $types .= 'ii';
        $stmt->bind_param($types, ...$params);
    } else {
        $stmt->bind_param('ii', $offset, $limit);
    }
    $stmt->execute();
    $result = $stmt->get_result();
    
    $transactions = [];
    while ($row = $result->fetch_assoc()) {
        $transactions[] = [
            'id' => $row['id'],
            'date' => $row['date'],
            'customer' => $row['customer'],
            'service' => $row['service'],
            'amount' => $row['amount'],
            'status' => $row['status']
        ];
    }
    
    echo json_encode([
        'success' => true,
        'transactions' => $transactions,
        'total' => $total,
        'page' => $page,
        'limit' => $limit,
        'pages' => ceil($total / $limit)
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
