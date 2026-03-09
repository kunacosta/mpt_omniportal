<?php
// api_dashboard.php
// This script processes the CSV data and returns a JSON summary for the dashboard.
// It mimics the logic of the frontend DataContext.

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Path to your CSV file
$csvFile = 'data.csv'; // Ensure this file exists and is readable

if (!file_exists($csvFile)) {
    echo json_encode(['error' => 'CSV file not found']);
    exit;
}

$outlets = [];

if (($handle = fopen($csvFile, "r")) !== FALSE) {
    // Get headers
    $headers = fgetcsv($handle, 1000, ",");
    
    // Map headers to indices
    $headerMap = array_flip($headers);
    
    // Check for required columns
    $requiredColumns = ['com_unit', 'trx_amt', 'cost_amt', 'saleman_cd', 'inv_desc'];
    foreach ($requiredColumns as $col) {
        if (!isset($headerMap[$col])) {
            echo json_encode(['error' => "Missing column: $col"]);
            exit;
        }
    }

    while (($data = fgetcsv($handle, 1000, ",")) !== FALSE) {
        $code = trim($data[$headerMap['com_unit']]);
        if (empty($code)) continue;

        $revenue = floatval($data[$headerMap['trx_amt']]);
        $investment = floatval($data[$headerMap['cost_amt']]);
        $salesman = trim($data[$headerMap['saleman_cd']]) ?: 'Unknown';
        $brand = trim($data[$headerMap['inv_desc']]) ?: 'Unknown';

        if (!isset($outlets[$code])) {
            $outlets[$code] = [
                'code' => $code,
                'revenue' => 0,
                'investment' => 0,
                'salesmen' => [],
                'brands' => []
            ];
        }

        $outlets[$code]['revenue'] += $revenue;
        $outlets[$code]['investment'] += $investment;

        // Aggregate Salesman
        if (!isset($outlets[$code]['salesmen'][$salesman])) {
            $outlets[$code]['salesmen'][$salesman] = 0;
        }
        $outlets[$code]['salesmen'][$salesman] += $revenue;

        // Aggregate Brand
        if (!isset($outlets[$code]['brands'][$brand])) {
            $outlets[$code]['brands'][$brand] = 0;
        }
        $outlets[$code]['brands'][$brand] += $revenue;
    }
    fclose($handle);
}

// Format the output
$formattedOutlets = [];
foreach ($outlets as $code => $data) {
    // Sort salesmen by revenue (descending)
    arsort($data['salesmen']);
    
    // Sort brands by revenue (descending)
    arsort($data['brands']);

    $formattedOutlets[] = [
        'code' => $data['code'],
        'revenue' => $data['revenue'],
        'investment' => $data['investment'],
        'salesmen' => $data['salesmen'], // PHP associative array becomes JSON object
        'brands' => $data['brands']      // PHP associative array becomes JSON object
    ];
}

// Sort outlets by total revenue (descending)
usort($formattedOutlets, function($a, $b) {
    return $b['revenue'] <=> $a['revenue'];
});

echo json_encode($formattedOutlets);
?>
