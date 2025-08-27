<?php

if (!isset($_POST['lyrics_data'])) {
    http_response_code(400);
    die('Error: No lyrics data provided.');
}

// Get the folder name from the POST request, with a fallback default.
$folder_name = $_POST['folder_name'] ?? 'SyncedLyrics';

// Sanitize the folder name to make it a valid filename.
// This replaces any characters that are not allowed in filenames with an underscore.
// It also removes leading/trailing whitespace and dots to prevent directory traversal issues.
$safe_folder_name = trim(preg_replace('/[\/:*?"<>|]/', '_', $folder_name), ' .');

// If the sanitized name is empty, use a default name.
if (empty($safe_folder_name)) {
    $safe_folder_name = 'SyncedLyrics';
}

$zip_filename = $safe_folder_name . '.zip';

$lyrics_data = json_decode($_POST['lyrics_data'], true);

if (json_last_error() !== JSON_ERROR_NONE || empty($lyrics_data) || !is_array($lyrics_data)) {
    http_response_code(400);
    die('Error: Invalid or empty lyrics data.');
}

// Create a temporary file for the zip archive
$zip_file_path = tempnam(sys_get_temp_dir(), 'lyrics_zip_');
if ($zip_file_path === false) {
    http_response_code(500);
    die('Error: Cannot create temporary file.');
}
// It's good practice to ensure the file has a .zip extension
$zip_file_final_path = $zip_file_path . '.zip';
rename($zip_file_path, $zip_file_final_path);


$zip = new ZipArchive();

if ($zip->open($zip_file_final_path, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== TRUE) {
    http_response_code(500);
    die('Error: Cannot create zip file.');
}

foreach ($lyrics_data as $song_title => $synced_lyrics) {
    // Sanitize each individual filename as well
    $filename_in_zip = preg_replace('/[\/:*?"<>|]/', '_', $song_title) . '.lrc';
    $zip->addFromString($filename_in_zip, $synced_lyrics);
}

$zip->close();

// Ensure the file exists and is readable before sending headers
if (!file_exists($zip_file_final_path) || !is_readable($zip_file_final_path)) {
    http_response_code(500);
    die('Error: Zip file is not accessible.');
}

// Set headers for download
header('Content-Type: application/zip');
header('Content-Disposition: attachment; filename="' . $zip_filename . '"');
header('Content-Length: ' . filesize($zip_file_final_path));
header('Pragma: no-cache');
header('Expires: 0');
header('Connection: close');

// Clear output buffer and read the file
ob_clean();
flush();
readfile($zip_file_final_path);

// Clean up the temporary file
unlink($zip_file_final_path);

exit;
?>
