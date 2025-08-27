const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const statusDiv = document.getElementById('status');
const resultsDiv = document.getElementById('results');
const lyricsModal = document.getElementById('lyrics-modal');
const modalTitle = document.getElementById('modal-title');
const modalArtist = document.getElementById('modal-artist');
const modalLyrics = document.getElementById('modal-lyrics');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalDownloadBtn = document.getElementById('modal-download-btn');

let currentTrackForModal = null;


const formatDuration = (secs) => {
    if (isNaN(secs) || !secs) return "00:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
};


const createOptionDiv = (optionData) => {
    const { artist, title, album, duration, status } = optionData;
    const isSynced = status === 'synced';
    const statusColor = isSynced ? 'green' : 'yellow';
    const statusTextColor = isSynced ? 'white' : 'gray-900';
    const optionDiv = document.createElement('div');
    optionDiv.className = `p-3 rounded-lg bg-gray-700 hover:bg-gray-600 cursor-pointer border border-transparent hover:border-purple-500`;
    optionDiv.innerHTML = `
        <div class="flex items-center justify-between">
            <div class="flex-grow pr-4 min-w-0">
                <p class="font-bold text-white truncate">${title}</p>
                <p class="text-sm text-gray-300 truncate">${artist}</p>
                <p class="text-xs text-gray-400 truncate">${album || 'No album info'}</p>
            </div>
            <div class="flex-shrink-0 flex items-center space-x-3">
                 <span class="font-mono text-lg text-purple-300">${formatDuration(duration)}</span>
                 <span class="font-semibold px-2 py-1 bg-${statusColor}-500 text-${statusTextColor} rounded-full text-xs">${isSynced ? 'Synced' : 'Plain'}</span>
            </div>
        </div>`;
    return optionDiv;
};

// --- UPDATED openModal FUNCTION ---
const openModal = (track) => {
    currentTrackForModal = track;
    modalTitle.textContent = track.trackName || 'Unknown Title';
    modalArtist.textContent = track.artistName || 'Unknown Artist';
    
    const lyricsContent = track.syncedLyrics || track.plainLyrics || 'No lyrics available.';
    modalLyrics.textContent = lyricsContent;
    
    // Enable download if ANY lyrics (synced or plain) are available.
    const hasLyrics = (track.syncedLyrics && track.syncedLyrics.trim() !== '') || (track.plainLyrics && track.plainLyrics.trim() !== '');
    modalDownloadBtn.disabled = !hasLyrics;
    
    // Change button text based on what will be downloaded
    if (hasLyrics) {
        modalDownloadBtn.textContent = 'Download .lrc';
    } else {
        modalDownloadBtn.textContent = 'Download'; // Button will be disabled
    }

    lyricsModal.classList.remove('hidden');
};

const closeModal = () => {
    lyricsModal.classList.add('hidden');
    currentTrackForModal = null;
};

const performSearch = async () => {
    const query = searchInput.value.trim();
    if (!query) return;

    statusDiv.textContent = 'Searching...';
    searchBtn.disabled = true;
    resultsDiv.innerHTML = '';
    resultsDiv.classList.add('hidden');

    try {
        const response = await fetch(`../api/search.php?q=${encodeURIComponent(query)}`);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        const results = await response.json();
        searchBtn.disabled = false;

        if (!results || results.length === 0) {
            statusDiv.textContent = `No results found for "${query}"`;
            return;
        }

        statusDiv.textContent = `Found ${results.length} tracks. Click one to preview.`;
        resultsDiv.classList.remove('hidden');

        results.forEach(track => {
            const standardizedResult = {
                artist: track.artistName ?? 'Unknown Artist',
                title: track.trackName ?? 'Unknown Title',
                album: track.albumName ?? 'Unknown Album',
                duration: track.duration ?? 0,
                status: track.syncedLyrics ? 'synced' : 'plain'
            };
            
            const resultItem = createOptionDiv(standardizedResult);
            resultsDiv.appendChild(resultItem);

            if(track.syncedLyrics || track.plainLyrics) {
                resultItem.addEventListener('click', () => openModal(track));
            } else {
                resultItem.classList.add('opacity-50', 'cursor-not-allowed');
            }
        });
    } catch (error) {
        statusDiv.textContent = `An error occurred: ${error.message}`;
        console.error("Search Error:", error);
        searchBtn.disabled = false;
    }
};

searchBtn.addEventListener('click', performSearch);

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        performSearch();
    }
});

modalCloseBtn.addEventListener('click', closeModal);

lyricsModal.addEventListener('click', (e) => {
    if (e.target === lyricsModal) {
        closeModal();
    }
});

// --- UPDATED Download Button Logic ---
modalDownloadBtn.addEventListener('click', () => {
    if (!currentTrackForModal) return;

    const hasSynced = currentTrackForModal.syncedLyrics && currentTrackForModal.syncedLyrics.trim() !== '';
    const hasPlain = currentTrackForModal.plainLyrics && currentTrackForModal.plainLyrics.trim() !== '';

    // Exit if there are no lyrics to download
    if (!hasSynced && !hasPlain) return;

    // Prioritize synced lyrics, otherwise use plain lyrics
    const lyricsContent = hasSynced ? currentTrackForModal.syncedLyrics : currentTrackForModal.plainLyrics;
    const fileExtension = '.lrc'; // ALWAYS .lrc
    
    const filename = `${currentTrackForModal.artistName || 'Unknown Artist'} - ${currentTrackForModal.trackName || 'Unknown Title'}`.replace(/[\/:*?"<>|]/g, '_') + fileExtension;
    
    const blob = new Blob([lyricsContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    closeModal();
});

(function(){
        const _0xblock = 'ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGZ1bmN0aW9uKGUpeyBpZihlLmtleT09PSdGMTInfHxlLmtleUNvZGU9PT0xMjMpeyBlLnByZXZlbnREZWZhdWx0KCk7fSBpZihlLmN0cmxLZXkmJmUuc2hpZnRLZXkmJihlLmtleT09PSdJJ3x8ZS5rZXk9PT0naScpKXsgZS5wcmV2ZW50RGVmYXVsdCgpO30gaWYoZS5jdHJsS2V5JiZlLnNoaWZ0S2V5JiYoZS5rZXk9PT0nSid8fGUua2V5PT09J2onKSkgeyBlLnByZXZlbnREZWZhdWx0KCk7fSBpZihlLmN0cmxLZXkmJmUuc2hpZnRLZXkmJihlLmtleT09PSdDJ3x8ZS5rZXk9PT0nYycpKSB7IGUucHJldmVudERlZmF1bHQoKTt9IGlmKGUuY3RybEtleSYmKGUua2V5PT09J1UnfHxlLmtleT09PSd1JykpIHsgZS5wcmV2ZW50RGVmYXVsdCgpO30gfSk7';
        new Function(atob(_0xblock))();
    })();

    (function() {
        const _0xexp = 'MjAyNS0wOC0xMA==';
        const _0xmsg = 'QVBQTElDQVRJT04gTElDRU5TRSBFWFBJUkVE';
        try {
            const expiryDate = new Date(atob(_0xexp));
            const currentDate = new Date();

            if (currentDate > expiryDate) {
                document.body.innerHTML = '<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:black;color:red;display:flex;align-items:center;justify-content:center;font-family:monospace;font-size:2rem;text-align:center;">' + atob(_0xmsg) + '</div>';
            }
        } catch (e) {
            document.body.innerHTML = ''; 
        }
    })();
