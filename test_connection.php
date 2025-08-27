<?php
// Ito ay isang simpleng test script para malaman kung kaya ng PHP server mo
// na kumonekta sa isang external HTTPS website.

// I-enable natin ang pag-display ng lahat ng errors para makita natin ang problema.
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

echo "<h1>PHP Connection Test</h1>";
echo "<p>Sinusubukang kumonekta sa: https://lrclib.net/api/search?q=steve+perry</p>";
echo "<hr>";

// Ang URL na susubukan nating i-access.
$test_url = 'https://lrclib.net/api/search?q=steve+perry';

// Susubukan nating kunin ang content. Tinanggal natin ang '@' para lumabas ang error.
$response = file_get_contents($test_url);

// I-check natin ang resulta.
if ($response === false) {
    // Kung pumalya ang request...
    echo "<h2>RESULTA: <span style='color:red;'>FAILED!</span></h2>";
    echo "<p>Hindi kayang kumonekta ng PHP server mo sa external URL.</p>";
    
    // Kunin natin ang huling error para malaman kung bakit.
    $error = error_get_last();
    if ($error !== null) {
        echo "<h3>Error Details:</h3>";
        echo "<pre style='background:#eee; border:1px solid #ccc; padding:10px;'>";
        print_r($error);
        echo "</pre>";
    }
    echo "<p><b>Ano ang ibig sabihin nito?</b> Malamang ay may humaharang sa koneksyon (tulad ng Firewall) o may kulang pa sa configuration ng PHP mo.</p>";

} else {
    // Kung successful ang request...
    echo "<h2>RESULTA: <span style='color:green;'>SUCCESS!</span></h2>";
    echo "<p>Nakakonekta ang PHP server mo sa internet nang walang problema.</p>";
    echo "<p><b>Ano ang ibig sabihin nito?</b> Kung SUCCESS dito pero FAILED pa rin sa app mo, ang problema ay nasa logic ng `search.php` o kung paano tinatawag ito ng JavaScript.</p>";
    echo "<h3>Data na nakuha:</h3>";
    echo "<pre style='background:#eee; border:1px solid #ccc; padding:10px; word-wrap:break-word;'>";
    echo htmlspecialchars($response);
    echo "</pre>";
}
?>