<?php
header('Content-Type: application/json');
set_time_limit(120);

// --- API Endpoints ---
$offline_api_host = '127.0.0.1';
$offline_api_port = 3300;
$offline_api_url = 'http://' . $offline_api_host . ':' . $offline_api_port . '/api/search'; 
$online_api_url = 'https://lrclib.net/api/search';

function is_server_online($host, $port, $timeout = 1) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "http://{$host}:{$port}/");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, $timeout); 
    curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
    $response = curl_exec($ch);
    curl_close($ch);
    return $response !== false;
}

/**
 * FINAL FUNCTION: Kinukuha na ang lahat ng posibleng metadata.
 */
function fetch_metadata_from_itunes($artist, $title) {
    $itunes_api_url = 'https://itunes.apple.com/search';
    $term = urlencode("$artist $title");
    $request_url = "$itunes_api_url?term=$term&entity=song&limit=1&media=music";
    
    $ch = curl_init($request_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $response_json = curl_exec($ch);
    curl_close($ch);

    if ($response_json) {
        $data = json_decode($response_json, true);
        if (($data['resultCount'] > 0) && isset($data['results'][0])) {
            $result = $data['results'][0];
            $release_year = isset($result['releaseDate']) ? date('Y', strtotime($result['releaseDate'])) : null;

            return [
                'artwork' => isset($result['artworkUrl100']) ? str_replace('100x100bb.jpg', '600x600bb.jpg', $result['artworkUrl100']) : null,
                'genre' => $result['primaryGenreName'] ?? null,
                'year' => $release_year,
                'track_number' => $result['trackNumber'] ?? null,
                'album_artist' => $result['collectionArtistName'] ?? $result['artistName'] ?? null,
                'composer' => $result['artistName'] ?? null, // Often the artist is also the main composer
                'copyright' => $result['copyright'] ?? null,
                'disc_number' => $result['discNumber'] ?? null,
                'disc_count' => $result['discCount'] ?? null,
            ];
        }
    }
    return null;
}

function process_found_results($results_array) {
     $file_results = [];
     foreach ($results_array as $result) {
         $lyrics_content = $result['syncedLyrics'] ?? $result['plainLyrics'] ?? '';
         if (!empty($lyrics_content)) {
            $file_results[] = [
                'artist' => $result['artistName'] ?? 'Unknown Artist',
                'title' => $result['trackName'] ?? 'Unknown Title',
                'album' => $result['albumName'] ?? 'Unknown Album',
                'duration' => $result['duration'] ?? 0,
                'lyrics' => $lyrics_content,
                'status' => isset($result['syncedLyrics']) && !empty($result['syncedLyrics']) ? 'synced' : 'plain',
                'artwork' => null, 'genre' => null, 'year' => null, 'track_number' => null,
                'album_artist' => null, 'composer' => null, 'copyright' => null,
                'disc_number' => null, 'disc_count' => null
            ];
         }
    }
    return $file_results;
}

// (Ang Main Logic (POST/GET) ay pareho lang sa huling version, walang pagbabago)
// --- Main Logic ---
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $json_data = file_get_contents('php://input');
    $data = json_decode($json_data, true);
    $track_objects = isset($data['tracks']) ? $data['tracks'] : [];

    if (empty($track_objects)) {
        echo json_encode([]);
        exit;
    }

    $found_lyrics_collection = [];
    $songs_for_online_fallback = [];
    $is_local_server_online = is_server_online($offline_api_host, $offline_api_port);

    if ($is_local_server_online) {
        $mh = curl_multi_init();
        $curl_handles = [];
        foreach ($track_objects as $track) {
            $baseName = $track['baseName'];
            list($artist, $title) = strpos($baseName, ' - ') !== false ? array_map('trim', explode(' - ', $baseName, 2)) : ['', $baseName];
            $search_query = !empty($artist) ? "$artist $title" : $title;
            $request_url = $offline_api_url . '?' . http_build_query(['q' => $search_query]);
            $ch = curl_init($request_url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 15);
            curl_multi_add_handle($mh, $ch);
            $curl_handles[$baseName] = $ch;
        }
        $running = null;
        do { curl_multi_exec($mh, $running); curl_multi_select($mh); } while ($running > 0);
        foreach ($track_objects as $track) {
            $baseName = $track['baseName'];
            $ch = $curl_handles[$baseName];
            $response_json = curl_multi_getcontent($ch);
            $results = $response_json ? json_decode($response_json, true) : null;
            if (!empty($results) && is_array($results)) {
                $file_results = process_found_results($results);
                if (!empty($file_results)) {
                     $found_lyrics_collection[$baseName] = ['status' => 'found', 'results' => $file_results];
                } else { $songs_for_online_fallback[] = $track; }
            } else { $songs_for_online_fallback[] = $track; }
            curl_multi_remove_handle($mh, $ch);
            curl_close($ch);
        }
        curl_multi_close($mh);
    } else {
        $songs_for_online_fallback = $track_objects;
    }
    if (!empty($songs_for_online_fallback)) {
        $mh_online = curl_multi_init();
        $curl_handles_online = [];
        foreach ($songs_for_online_fallback as $track) {
            $baseName = $track['baseName'];
            list($artist, $title) = strpos($baseName, ' - ') !== false ? array_map('trim', explode(' - ', $baseName, 2)) : ['', $baseName];
            $search_query = !empty($artist) ? "$artist $title" : $title;
            $request_url = $online_api_url . '?' . http_build_query(['q' => $search_query]);
            $ch_online = curl_init($request_url);
            curl_setopt($ch_online, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch_online, CURLOPT_TIMEOUT, 20);
            curl_multi_add_handle($mh_online, $ch_online);
            $curl_handles_online[$baseName] = $ch_online;
        }
        $running_online = null;
        do { curl_multi_exec($mh_online, $running_online); curl_multi_select($mh_online); } while ($running_online > 0);
        foreach ($songs_for_online_fallback as $track) {
            $baseName = $track['baseName'];
            $ch_online = $curl_handles_online[$baseName];
            $response_json = curl_multi_getcontent($ch_online);
            $results = $response_json ? json_decode($response_json, true) : null;
            if (!empty($results) && is_array($results)) {
                 $file_results = process_found_results($results);
                 if (!empty($file_results)) {
                    $found_lyrics_collection[$baseName] = ['status' => 'found', 'results' => $file_results];
                 } else { $found_lyrics_collection[$baseName] = ['status' => 'not_found']; }
            } else { $found_lyrics_collection[$baseName] = ['status' => 'not_found']; }
            curl_multi_remove_handle($mh_online, $ch_online);
            curl_close($ch_online);
        }
        curl_multi_close($mh_online);
    }

    if(!empty($found_lyrics_collection)){
        foreach($found_lyrics_collection as $baseName => &$data) {
            if ($data['status'] === 'found' && !empty($data['results'])) {
                $best_match = $data['results'][0];
                $itunes_metadata = fetch_metadata_from_itunes($best_match['artist'], $best_match['title']);
                if ($itunes_metadata) {
                    foreach($data['results'] as &$result_item) {
                        $result_item = array_merge($result_item, $itunes_metadata);
                    }
                }
            }
        }
        unset($data);
        unset($result_item);
    }

    echo json_encode($found_lyrics_collection);

} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $query = isset($_GET['q']) ? trim($_GET['q']) : '';
    if (empty($query)) { echo json_encode([]); exit; }
    
    $results = null;
    if (is_server_online($offline_api_host, $offline_api_port)) {
        $ch_off = curl_init($offline_api_url . '?' . http_build_query(['q' => $query]));
        curl_setopt($ch_off, CURLOPT_RETURNTRANSFER, true); $response = curl_exec($ch_off);
        $results = $response ? json_decode($response, true) : null; curl_close($ch_off);
    }
    if(empty($results)){
        $ch_on = curl_init($online_api_url . '?' . http_build_query(['q' => $query]));
        curl_setopt($ch_on, CURLOPT_RETURNTRANSFER, true); $response = curl_exec($ch_on);
        $results = $response ? json_decode($response, true) : null; curl_close($ch_on);
    }
    if (!empty($results) && is_array($results)) {
        foreach ($results as &$result) {
            $itunes_metadata = fetch_metadata_from_itunes($result['artistName'] ?? '', $result['trackName'] ?? '');
            if($itunes_metadata) {
                $result = array_merge($result, $itunes_metadata);
            }
        }
        unset($result); 
    }
    echo json_encode($results ? $results : []);
}
?>