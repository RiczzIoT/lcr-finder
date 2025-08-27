<?php
// Ilagay dito ang tamang path papunta sa database mo
$dbPath = 'C:/Users/ricar/OneDrive/Documents/lrclib/db.sqlite3';

try {
    // Kumonekta sa SQLite database
    $db = new SQLite3($dbPath, SQLITE3_OPEN_READONLY);
    echo "<h1>Successfully connected to the database!</h1>";

    // --- BINAGO: Ito na ang bagong query na may JOIN ---
    $query = "
        SELECT
            t.name AS track_name,
            t.artist_name,
            l.synced_lyrics
        FROM
            tracks_fts AS fts
        JOIN
            tracks AS t ON fts.rowid = t.id
        LEFT JOIN
            lyrics AS l ON t.id = l.track_id
        WHERE
            tracks_fts MATCH 'love' -- Palitan mo ito ng kantang gusto mong hanapin
        LIMIT 20;
    ";

    $results = $db->query($query);

    // Ipakita ang resulta sa isang table
    echo "<table border='1' cellpadding='5' cellspacing='0' style='width: 100%; border-collapse: collapse;'>";
    echo "<tr style='background-color: #333; color: #fff;'><th>Track Name</th><th>Artist Name</th><th>Synced Lyrics</th></tr>";

    $count = 0;
    while ($row = $results->fetchArray(SQLITE3_ASSOC)) {
        $bgColor = ($count % 2 == 0) ? '#f2f2f2' : '#ffffff';
        echo "<tr style='background-color: {$bgColor};'>";
        echo "<td>" . htmlspecialchars($row['track_name']) . "</td>";
        echo "<td>" . htmlspecialchars($row['artist_name']) . "</td>";
        // Gagamit tayo ng <pre> para ma-preserve ang line breaks ng lyrics
        echo "<td><pre style='white-space: pre-wrap; word-wrap: break-word;'>" . htmlspecialchars($row['synced_lyrics'] ?? 'No lyrics found') . "</pre></td>";
        echo "</tr>";
        $count++;
    }

    echo "</table>";

    // Isara ang koneksyon
    $db->close();

} catch (Exception $e) {
    // Kung may error sa pag-connect
    die("Error connecting to database: " . $e->getMessage());
}
?>