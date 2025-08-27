<?php 
include '../includes/version.php'; 
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manual Search - LRC Finder Pro</title>
    <script src="../assets/js/tailwindcss.js"></script>
    <link rel="stylesheet" href="../assets/css/style.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet">
</head>
<body class="bg-gray-900 text-white min-h-screen flex flex-col">
    
    <?php include '../includes/nav.php'; ?>

    <main class="flex-grow flex items-center justify-center p-4">

        <div class="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-3xl border border-gray-700">
            <h1 class="text-3xl font-bold text-center mb-2 text-purple-400">Manual Search</h1>
            <p class="text-center text-gray-400 mb-6">Enter a song title or artist to begin your search.</p>

            <div class="flex space-x-2 mb-4">
                <input type="text" id="search-input" placeholder="Find any song..." class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                <button id="search-btn" class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition">
                    Search
                </button>
            </div>

            <div id="status" class="text-center text-gray-500 my-4"></div>
            <div id="results" class="space-y-2 max-h-[60vh] overflow-y-auto pr-2 hidden">
                </div>
        </div>

    </main>
    
    <div id="lyrics-modal" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div class="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl border border-gray-700 flex flex-col">
            <div class="p-6 border-b border-gray-700">
                <h3 id="modal-title" class="text-2xl font-bold text-purple-400"></h3>
                <p id="modal-artist" class="text-md text-gray-400"></p>
            </div>
            <div class="p-6 flex-grow">
                <pre id="modal-lyrics" class="bg-gray-900 text-gray-300 p-4 rounded-md h-64 overflow-y-auto whitespace-pre-wrap font-mono text-sm"></pre>
            </div>
            <div class="bg-gray-800/50 p-4 flex justify-end space-x-4 rounded-b-lg border-t border-gray-700">
                <button id="modal-close-btn" class="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white">Close</button>
                <!-- UPDATED BUTTON TEXT -->
                <button id="modal-download-btn" class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-bold disabled:opacity-50" disabled>Download</button>
            </div>
        </div>
    </div>

    <script src="../assets/js/1219444622223.js"></script>
    
    <?php include '../includes/footer.php'; ?>
</body>
</html>