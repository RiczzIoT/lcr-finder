<?php

ini_set('max_execution_time', 1800);
ini_set('memory_limit', '512M');

require_once 'getid3/getid3.php';
require_once 'getid3/write.php';

header("Access-Control-Allow-Origin: *");

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    die('Error: Method Not Allowed.');
}

// Check para sa lahat ng data
if (!isset($_FILES['music_files'], $_POST['titles'], $_POST['artists'], $_POST['albums'], $_POST['genres'], $_POST['years'], $_POST['track_numbers'], $_POST['album_artists'], $_POST['composers'], $_POST['copyrights'], $_POST['disc_numbers'], $_POST['disc_counts'])) {
    http_response_code(400);
    die('Error: Incomplete data. Missing required metadata fields.');
}

// (Ang STAGE 1 at 2, parallel download, ay pareho lang sa huling version)
// STAGE 1: Collect artwork URLs
$artwork_urls_to_fetch = [];
foreach ($_POST['artwork_urls'] as $index => $url) {
    if ($url && filter_var($url, FILTER_VALIDATE_URL)) {
        $artwork_urls_to_fetch[$index] = $url;
    }
}
// STAGE 2: Parallel download of artworks
$artwork_data_map = [];
if (!empty($artwork_urls_to_fetch)) {
    $mh = curl_multi_init();
    $curl_handles = [];
    foreach ($artwork_urls_to_fetch as $index => $url) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
        curl_setopt($ch, CURLOPT_TIMEOUT, 20);
        curl_multi_add_handle($mh, $ch);
        $curl_handles[$index] = $ch;
    }
    $running = null;
    do {
        $status = curl_multi_exec($mh, $running);
        if ($running) { curl_multi_select($mh, 1.0); }
    } while ($running > 0 && $status == CURLM_OK);
    foreach ($curl_handles as $index => $ch) {
        $artwork_data_map[$index] = curl_multi_getcontent($ch);
        curl_multi_remove_handle($mh, $ch);
        curl_close($ch);
    }
    curl_multi_close($mh);
}


// STAGE 3: Process files and build ZIP
$zip = new ZipArchive();
$folder_name = $_POST['folder_name'] ?? 'Synced_Music';
$safe_folder_name = trim(preg_replace('/[\/:*?"<>|]/', '_', $folder_name), ' .') ?: 'Synced_Music';
$zip_filename = $safe_folder_name . '_with_LRC_and_Art.zip';
$zip_file_path = tempnam(sys_get_temp_dir(), 'artwork_zip_') . '.zip';

if ($zip->open($zip_file_path, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== TRUE) {
    http_response_code(500);
    die('Error: Cannot create zip file.');
}

foreach ($_FILES['music_files']['tmp_name'] as $index => $tmp_path) {
    set_time_limit(30);
    if ($_FILES['music_files']['error'][$index] !== UPLOAD_ERR_OK) continue;

    $tagwriter = new getid3_writetags;
    $tagwriter->filename = $tmp_path;
    $tagwriter->tagformats = array('id3v2.3');
    $tagwriter->overwrite_tags = true;
    $tagwriter->tag_encoding = 'UTF-8';

    // Ang ultimate $tag_data array
    $tag_data = [
        'title'             => [$_POST['titles'][$index] ?? ''],
        'artist'            => [$_POST['artists'][$index] ?? ''],
        'album'             => [$_POST['albums'][$index] ?? ''],
        'genre'             => [$_POST['genres'][$index] ?? ''],
        'year'              => [$_POST['years'][$index] ?? ''],
        'track_number'      => [$_POST['track_numbers'][$index] ?? ''],
        'band'              => [$_POST['album_artists'][$index] ?? ''], // Album Artist
        'composer'          => [$_POST['composers'][$index] ?? ''],
        'copyright_message' => [$_POST['copyrights'][$index] ?? ''],
    ];

    // Pagsamahin ang Disc Number at Disc Count (e.g., "1/2")
    $disc_number = $_POST['disc_numbers'][$index] ?? '';
    $disc_count = $_POST['disc_counts'][$index] ?? '';
    if (!empty($disc_number)) {
        $tag_data['part_of_a_set'] = [$disc_number . (!empty($disc_count) ? '/' . $disc_count : '')];
    }

    if (isset($artwork_data_map[$index]) && !empty($artwork_data_map[$index])) {
        $tag_data['attached_picture'][0]['data'] = $artwork_data_map[$index];
        $tag_data['attached_picture'][0]['picturetypeid'] = 3;
        $tag_data['attached_picture'][0]['description'] = 'Cover';
        $tag_data['attached_picture'][0]['mime'] = 'image/jpeg';
    }

    $tagwriter->tag_data = $tag_data;
    $tagwriter->WriteTags();

    $new_music_filename = $_POST['new_filenames'][$index];
    $lrc_filename = pathinfo($new_music_filename, PATHINFO_FILENAME) . '.lrc';
    $lyrics_content = $_POST['lyrics_data'][$index] ?? '';

    $zip->addFile($tmp_path, $new_music_filename);
    $zip->addFromString($lrc_filename, $lyrics_content);
}

set_time_limit(300); 
$zip->close();

if (!file_exists($zip_file_path) || filesize($zip_file_path) === 0) {
    http_response_code(500);
    die('Error: Zip file was not created or is empty.');
}

header('Content-Type: application/zip');
header('Content-Disposition: attachment; filename="' . $zip_filename . '"');
header('Content-Length: ' . filesize($zip_file_path));
header('Pragma: no-cache');
header('Expires: 0');
ob_clean();
flush();
readfile($zip_file_path);
unlink($zip_file_path);

exit;
?>