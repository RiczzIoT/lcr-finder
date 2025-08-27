// =====================================================================
// MGA ELEMENT SELECTORS AT GLOBAL VARIABLES
// Dito kinukuha lahat ng kailangan nating elements mula sa HTML
// at dito rin naka-declare yung mga variables na gagamitin sa buong script.
// =====================================================================
const folderInput = document.getElementById('music-folder-input');
const processBtn = document.getElementById('process-btn');
const statusDiv = document.getElementById('status');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const resultsContainer = document.getElementById('results-container');
const resultsHeader = document.getElementById('results-header');
const resultsDiv = document.getElementById('results');

const downloadLrcBtn = document.getElementById('download-lrc-btn');
const downloadMp3LrcBtn = document.getElementById('download-mp3-lrc-btn');

const revisionModal = document.getElementById('revision-modal');
const revisionTitle = document.getElementById('revision-title');
const revisionOptions = document.getElementById('revision-options');
const manualSearchModal = document.getElementById('manual-search-modal');
const manualSearchTitle = document.getElementById('manual-search-title');
const manualSearchInput = document.getElementById('manual-search-input');
const manualSearchBtn = document.getElementById('manual-search-btn');
const manualSearchResults = document.getElementById('manual-search-results');
const revisionSearchInput = document.getElementById('revision-search-input');
const revisionSearchBtn = document.getElementById('revision-search-btn');
const revisionSearchResults = document.getElementById('revision-search-results');
const audioPlayer = document.getElementById('audio-player');
const fullscreenPlayerContainer = document.getElementById('fullscreen-player');

let musicFileObjects = []; 
let processedMusicFiles = []; 
let currentlyPlaying = {
    element: null,
    baseName: null,
    lrcData: [],
    audioURL: null,
    lineIndex: -1,
    fullscreenLineIndex: -1
};
let trueDurations = new Map();
let allSearchResults = {};
let allFoundLyrics = {};
let selectedFolderName = 'SyncedLyrics'; 
let currentLyricMode = 'karaoke';

// =====================================================================
// MGA HELPER FUNCTIONS
// Ito yung maliliit na functions na paulit-ulit ginagamit sa iba't ibang parte ng code.
// =====================================================================
function escapeJsString(str) {
    if (!str) return '';
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function escapeHTML(str) {
    if (!str) return '';
    const p = document.createElement('p');
    p.textContent = str;
    return p.innerHTML;
}

function formatDuration(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 4000);
}

function toggleLyricMode(buttonElement) {
    if (currentLyricMode === 'karaoke') {
        currentLyricMode = 'solid';
        buttonElement.textContent = 'SOLID MODE';
    } else {
        currentLyricMode = 'karaoke';
        buttonElement.textContent = 'KARAOKE MODE';
    }
    
    if (currentlyPlaying.element) {
        const player = currentlyPlaying.element.querySelector('.karaoke-player');
        player.classList.remove('karaoke-mode', 'solid-mode');
        player.classList.add(`${currentLyricMode}-mode`);
    }
}


// =====================================================================
// MAIN PROCESS LOGIC
// Ito ang pinaka-puso ng application. Triggered 'to kapag pinindot
// yung "Scan for Lyrics" button.
// =====================================================================
processBtn.addEventListener('click', async () => {
    const files = folderInput.files;
    const _0xexp = 'MjAyNS0xMi0xMg==';
    const _0xmsg = 'QVBQTElDQVRJT04gTElDRU5TRSBFWFBJUkVE';
    try {
        const expiryDate = new Date(atob(_0xexp));
        const currentDate = new Date();
        if (currentDate > expiryDate) {
            document.body.innerHTML = '<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:black;color:red;display:flex;align-items:center;justify-content:center;font-family:monospace;font-size:2rem;text-align:center;">' + atob(_0xmsg) + '</div>';
            return;
        }
    } catch (e) {
        document.body.innerHTML = '';
        return;
    }
    if (files.length === 0) {
        showToast('You need to select a folder first.', 'error');
        return;
    }

    if (!audioPlayer.paused) {
        audioPlayer.pause();
        if (currentlyPlaying.audioURL) URL.revokeObjectURL(currentlyPlaying.audioURL);
    }
    currentlyPlaying = {
        element: null,
        baseName: null,
        lrcData: [],
        audioURL: null,
        lineIndex: -1,
        fullscreenLineIndex: -1
    };

    trueDurations.clear();
    allSearchResults = {};
    allFoundLyrics = {};

    processBtn.disabled = true;
    processBtn.textContent = 'Processing...';
    statusDiv.textContent = 'Preparing files...';
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = '0%';
    resultsContainer.classList.add('hidden');
    resultsDiv.innerHTML = '';

    if (downloadLrcBtn) downloadLrcBtn.disabled = true;
    if (downloadMp3LrcBtn) downloadMp3LrcBtn.disabled = true;

    musicFileObjects = Array.from(files).filter(file => /\.(mp3|flac|m4a|ogg|wav)$/i.test(file.name));
    processedMusicFiles = musicFileObjects.map(file => ({
        fullName: file.name,
        baseName: file.name.replace(/\.[^/.]+$/, "")
    }));

    if (files.length > 0 && files[0].webkitRelativePath) {
        selectedFolderName = files[0].webkitRelativePath.split('/')[0];
    } else {
        selectedFolderName = 'SyncedLyrics';
    }

    if (processedMusicFiles.length === 0) {
        showToast('No music files found in the selected folder.', 'error');
        processBtn.disabled = false;
        processBtn.textContent = 'Find Lyrics';
        return;
    }
    const BATCH_SIZE = 50;
    const totalBatches = Math.ceil(processedMusicFiles.length / BATCH_SIZE);
    let processedSongs = 0;
    for (let i = 0; i < processedMusicFiles.length; i += BATCH_SIZE) {
        const batch = processedMusicFiles.slice(i, i + BATCH_SIZE);
        const currentBatchNumber = (i / BATCH_SIZE) + 1;
        statusDiv.textContent = `Searching... (Batch ${currentBatchNumber} of ${totalBatches})`;
        try {
            const response = await fetch('./api/search.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tracks: batch
                })
            });
            if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
            const foundResultsInBatch = await response.json();
            batch.forEach(file => {
                const resultData = foundResultsInBatch[file.baseName];
                const resultItem = document.createElement('div');
                resultItem.setAttribute('data-filename', file.baseName);

                if (resultData && resultData.status === 'found') {
                    allSearchResults[file.baseName] = resultData.results;
                    const bestMatch = resultData.results[0];
                    updateResultItem(resultItem, file, bestMatch);
                } else {
                    allSearchResults[file.baseName] = [];
                    resultItem.classList.add('p-3', 'rounded-lg', 'text-sm', 'bg-red-800/50', 'border', 'border-red-700');
                    resultItem.innerHTML = `<div class="flex items-center justify-between">
                       <div>
                           <p class="font-bold">${escapeHTML(file.fullName)}</p>
                           <p class="text-red-400 text-xs">Could not find lyrics automatically.</p>
                       </div>
                       <button class="not-found-badge font-semibold px-2 py-1 bg-red-500 text-white rounded-full text-xs transition-all">✗ Not Found</button>
                   </div>`;
                }
                resultsDiv.appendChild(resultItem);
                processedSongs++;
            });
        } catch (error) {
            statusDiv.textContent = `Error in Batch ${currentBatchNumber}: ${error.message}`;
            processBtn.disabled = false;
            processBtn.textContent = 'Try Again';
            return;
        }
        const progressPercentage = Math.round((processedSongs / processedMusicFiles.length) * 100);
        progressBar.style.width = `${progressPercentage}%`;
        progressText.textContent = `${progressPercentage}%`;
        resultsDiv.scrollTop = resultsDiv.scrollHeight;
    }
    updateSummaryAndDownloadButton();
    statusDiv.textContent = 'Process Complete!';
    resultsContainer.classList.remove('hidden');
    processBtn.disabled = false;
    processBtn.textContent = 'Search Again';
});


// =====================================================================
// UI UPDATE AND LYRICS PARSING
// Functions para sa pag-update ng itsura ng bawat resulta at pag-parse ng LRC file.
// =====================================================================
function updateResultItem(itemElement, file, matchData) {
    const { artist, title, album, duration, lyrics, status, artwork } = matchData;
    const isSynced = status === 'synced';
    const statusColor = isSynced ? 'green' : 'yellow';
    const statusTextColor = isSynced ? 'white' : 'gray-900';
    const statusText = isSynced ? '✓ Synced' : '✓ Plain';

    if (artwork) itemElement.setAttribute('data-artwork', artwork);
    else itemElement.removeAttribute('data-artwork');

    const safeBaseNameForJs = escapeJsString(file.baseName);
    const safeFullNameForHTML = escapeHTML(file.fullName);
    const safeTitleForHTML = escapeHTML(title);
    const safeArtistForHTML = escapeHTML(artist);
    const safeAlbumForHTML = escapeHTML(album) || 'No album info';

    itemElement.className = `p-3 rounded-lg text-sm bg-gray-800/50 border border-gray-700 transition-all duration-300`;
    
    // Tinanggal na yung mga player controls dito
    itemElement.innerHTML = `
        <div class="song-details-container flex items-center gap-4">
            <div class="album-art-container flex-shrink-0">
                <img class="album-art w-16 h-16 rounded-md object-cover bg-gray-700 hidden" alt="Album Art">
            </div>
            <div class="flex-grow min-w-0">
                <div class="flex items-center justify-between">
                    <div class="flex-grow pr-4 min-w-0" onclick="togglePlayback(this.closest('[data-filename]'), '${safeBaseNameForJs}', ${isSynced})">
                        <p class="font-bold text-white truncate cursor-pointer" title="${safeFullNameForHTML}">${safeFullNameForHTML}</p>
                        <p class="text-gray-300 truncate">${safeTitleForHTML} - ${safeArtistForHTML}</p>
                        <p class="text-xs text-gray-400 truncate">${safeAlbumForHTML}</p>
                    </div>
                    <div class="flex-shrink-0 flex items-center space-x-3">
                        <span class="font-mono text-lg text-purple-300">${formatDuration(duration)}</span>
                        <span class="status-badge font-semibold px-2 py-1 bg-${statusColor}-500 text-${statusTextColor} rounded-full text-xs">${statusText}</span>
                        <button onclick="openRevisionModal('${safeBaseNameForJs}')" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded-lg text-xs">Re-sync</button>
                        <button onclick="toggleFullscreenMode('${safeBaseNameForJs}')" title="Fullscreen Mode" class="bg-gray-600 hover:bg-gray-700 p-2 rounded-full transition-colors">
                             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M5 5h5V3H3v7h2zm5 14H5v-5H3v7h7zM14 3v2h5v5h2V3zM19 19h-5v2h7v-7h-2z"/></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div class="karaoke-player mt-3 hidden relative">
            <div class="mode-toggle" onclick="toggleLyricMode(this)">KARAOKE MODE</div>
            <div class="karaoke-lyrics-container h-16 flex flex-col items-center justify-center mb-2">
                <p class="karaoke-lyrics-current text-center text-xl">
                    <span class="lyrics-text"></span>
                    <span class="lyrics-fill"></span>
                </p>
                <p class="karaoke-lyrics-next text-center text-md font-semibold text-gray-500 transition-opacity duration-300 mt-1"></p>
            </div>
            <div class="flex items-center space-x-2">
                <span class="time-current text-xs font-mono w-10 text-right">00:00</span>
                <div class="w-full bg-gray-700 rounded-full h-1.5 progress-bar-wrapper">
                    <div class="progress-bar bg-purple-600 h-1.5 rounded-full" style="width: 0%"></div>
                </div>
                <span class="time-duration text-xs font-mono w-10 text-left">${formatDuration(duration)}</span>
            </div>
        </div>`;

    if (artwork) {
        const imgElement = itemElement.querySelector('.album-art');
        if (imgElement) {
            imgElement.src = artwork;
            imgElement.classList.remove('hidden');
        }
    }

    if (status === 'synced' || status === 'plain') {
        allFoundLyrics[file.baseName] = lyrics;
    } else {
        if (allFoundLyrics[file.baseName]) {
            delete allFoundLyrics[file.baseName];
        }
    }
}

function parseLRC(lrcContent) {
    if (!lrcContent) return [];
    const lines = lrcContent.split('\n');
    let timings = [];
    const lineTimeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

    for (const line of lines) {
        const lineMatch = line.match(lineTimeRegex);
        if (!lineMatch) continue;
        const minutes = parseInt(lineMatch[1], 10);
        const seconds = parseInt(lineMatch[2], 10);
        const milliseconds = parseInt(lineMatch[3].padEnd(3, '0'), 10);
        const time = minutes * 60 + seconds + milliseconds / 1000;
        const plainText = line.replace(lineTimeRegex, '').replace(/<\d{2}:\d{2}\.\d{2,3}>/g, '').replace(/\s+/g, ' ').trim();
        if (plainText) {
            timings.push({
                time,
                text: plainText
            });
        }
    }

    timings.sort((a, b) => a.time - b.time);
    return timings;
}


// =====================================================================
// PLAYBACK LOGIC (MAY MGA DAGDAG)
// Dito nakalagay lahat ng tungkol sa pag-play ng audio at pag-sync ng lyrics.
// =====================================================================

const playIconSVG = `<svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/></svg>`;
const pauseIconSVG = `<svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path d="M5.75 4.5a.75.75 0 00-.75.75v10.5a.75.75 0 001.5 0V5.25a.75.75 0 00-.75-.75zM14.25 4.5a.75.75 0 00-.75.75v10.5a.75.75 0 001.5 0V5.25a.75.75 0 00-.75-.75z"/></svg>`;

function updatePlayPauseIcon(isPlaying) {
    const btn = document.getElementById('fullscreen-play-pause-btn');
    if (btn) {
        btn.innerHTML = isPlaying ? pauseIconSVG : playIconSVG;
    }
}

function handlePlayPause() {
    if (!audioPlayer.src) return;
    if (audioPlayer.paused) {
        audioPlayer.play();
    } else {
        audioPlayer.pause();
    }
}

function playNextSong() {
    if (processedMusicFiles.length === 0) return;
    const currentBaseName = currentlyPlaying.baseName || processedMusicFiles[0].baseName;
    const currentIndex = processedMusicFiles.findIndex(f => f.baseName === currentBaseName);

    const nextIndex = (currentIndex + 1) % processedMusicFiles.length;
    const nextFile = processedMusicFiles[nextIndex];
    const nextElement = resultsDiv.querySelector(`[data-filename="${escapeJsString(nextFile.baseName)}"]`);

    if (nextElement) {
        const isSynced = allFoundLyrics[nextFile.baseName] && parseLRC(allFoundLyrics[nextFile.baseName]).length > 0;
        togglePlayback(nextElement, nextFile.baseName, isSynced, true);
    }
}

function playPreviousSong() {
    if (processedMusicFiles.length === 0) return;
    const currentBaseName = currentlyPlaying.baseName || processedMusicFiles[0].baseName;
    const currentIndex = processedMusicFiles.findIndex(f => f.baseName === currentBaseName);

    const prevIndex = (currentIndex - 1 + processedMusicFiles.length) % processedMusicFiles.length;
    const prevFile = processedMusicFiles[prevIndex];
    const prevElement = resultsDiv.querySelector(`[data-filename="${escapeJsString(prevFile.baseName)}"]`);

    if (prevElement) {
        const isSynced = allFoundLyrics[prevFile.baseName] && parseLRC(allFoundLyrics[prevFile.baseName]).length > 0;
        togglePlayback(prevElement, prevFile.baseName, isSynced, true);
    }
}

function resetPlayingUI() {
    if (currentlyPlaying.element) {
        currentlyPlaying.element.querySelector('.karaoke-player').classList.add('hidden');
        currentlyPlaying.element.classList.remove('is-playing', 'has-artwork', 'border-purple-500', 'bg-gray-700/50');
        currentlyPlaying.element.style.removeProperty('--bg-image');
        currentlyPlaying.element.classList.add('border-gray-700', 'bg-gray-800/50');
    }
    updatePlayPauseIcon(false);
}

function togglePlayback(element, baseName, isSynced, forcePlay = false) {
    if (!element) return;
    if (currentlyPlaying.baseName === baseName && !forcePlay) {
        handlePlayPause();
        return;
    }

    if (!audioPlayer.paused) {
        audioPlayer.pause();
        if (currentlyPlaying.audioURL) URL.revokeObjectURL(currentlyPlaying.audioURL);
    }

    const fileObject = musicFileObjects.find(f => f.name.startsWith(baseName + '.'));
    if (!fileObject) {
        showToast('Could not find the music file to play.', 'error');
        return;
    }

    const onMetadataLoaded = () => {
        const realDuration = audioPlayer.duration;
        trueDurations.set(baseName, realDuration);
        const playerDurationEl = element.querySelector('.time-duration');
        if (playerDurationEl) playerDurationEl.textContent = formatDuration(realDuration);
        
        const fullscreenDurationEl = document.getElementById('fullscreen-time-duration');
        if (fullscreenDurationEl) fullscreenDurationEl.textContent = formatDuration(realDuration);

        audioPlayer.removeEventListener('loadedmetadata', onMetadataLoaded);
    };
    audioPlayer.addEventListener('loadedmetadata', onMetadataLoaded);

    const audioURL = URL.createObjectURL(fileObject);
    audioPlayer.src = audioURL;
    const lyrics = allFoundLyrics[baseName] || '';

    resetPlayingUI();

    const artworkUrl = element.getAttribute('data-artwork');
    if (artworkUrl) {
        element.classList.add('has-artwork');
        element.style.setProperty('--bg-image', `url('${artworkUrl}')`);
    }

    currentlyPlaying = {
        element: element,
        baseName: baseName,
        lrcData: isSynced ? parseLRC(lyrics) : [],
        audioURL: audioURL,
        lineIndex: -1,
        fullscreenLineIndex: -1
    };

    const player = element.querySelector('.karaoke-player');
    player.classList.remove('hidden', 'karaoke-mode', 'solid-mode');
    player.classList.add(`${currentLyricMode}-mode`);

    const modeToggle = player.querySelector('.mode-toggle');
    modeToggle.textContent = currentLyricMode.toUpperCase() + ' MODE';

    element.classList.add('is-playing', 'border-purple-500', 'bg-gray-700/50');
    element.classList.remove('border-gray-700', 'bg-gray-800/50');

    audioPlayer.play();

    // Kung ang fullscreen ay bukas habang nagpapalit ng kanta, i-update ito
    if (document.body.classList.contains('fullscreen-active')) {
        toggleFullscreenMode(baseName);
    }
}

audioPlayer.addEventListener('timeupdate', () => {
    if (audioPlayer.paused || !audioPlayer.duration) return;

    const currentTime = audioPlayer.currentTime;
    const duration = audioPlayer.duration;
    
    // Mini player update
    if (currentlyPlaying.element) {
        const miniProgressEl = currentlyPlaying.element.querySelector('.progress-bar');
        const miniTimeCurrentEl = currentlyPlaying.element.querySelector('.time-current');
        if (miniProgressEl) miniProgressEl.style.width = `${(currentTime / duration) * 100}%`;
        if (miniTimeCurrentEl) miniTimeCurrentEl.textContent = formatDuration(currentTime);
    }
    
    // Fullscreen Player Update
    if (document.body.classList.contains('fullscreen-active')) {
        const fsProgressEl = document.getElementById('fullscreen-progress-bar');
        const fsTimeCurrentEl = document.getElementById('fullscreen-time-current');
        if (fsProgressEl) fsProgressEl.style.setProperty('--progress', `${(currentTime / duration) * 100}%`);
        if (fsTimeCurrentEl) fsTimeCurrentEl.textContent = formatDuration(currentTime);
    }

    // --- Lyrics Sync Logic (for both players) ---
    const { element, lrcData, lineIndex } = currentlyPlaying;
    if (lrcData.length > 0) {
        // Mini Player Lyrics
        if (element) {
            const currentLineFillEl = element.querySelector('.lyrics-fill');
            const currentLineTextEl = element.querySelector('.lyrics-text');
            const nextLineEl = element.querySelector('.karaoke-lyrics-next');
            if (currentLineFillEl && nextLineEl) {
                let newIndex = lrcData.findIndex((line, i) => {
                    const nextLine = lrcData[i + 1];
                    return currentTime >= line.time && (nextLine ? currentTime < nextLine.time : true);
                });

                if (newIndex !== lineIndex) {
                    currentlyPlaying.lineIndex = newIndex;
                    const currentLine = lrcData[newIndex];
                    const nextLine = lrcData[newIndex + 1];

                    currentLineTextEl.textContent = currentLine ? currentLine.text : '';
                    currentLineFillEl.textContent = currentLine ? currentLine.text : '';
                    nextLineEl.textContent = nextLine ? nextLine.text : (newIndex === -1 && lrcData[0]) ? lrcData[0].text : '';

                    if (currentLyricMode === 'karaoke' && currentLine) {
                        const lineDuration = (nextLine ? nextLine.time : duration) - currentLine.time;
                        const timeIntoLine = currentTime - currentLine.time;

                        currentLineFillEl.classList.remove('animate-fill');
                        void currentLineFillEl.offsetWidth; // Trigger reflow

                        currentLineFillEl.style.animationPlayState = 'running';
                        currentLineFillEl.style.animationDuration = `${lineDuration}s`;
                        currentLineFillEl.style.animationDelay = `-${timeIntoLine}s`;
                        currentLineFillEl.classList.add('animate-fill');
                    }
                }
            }
        }

        // Fullscreen Player Lyrics
        if (document.body.classList.contains('fullscreen-active')) {
            let newFullscreenIndex = -1;
            for (let i = lrcData.length - 1; i >= 0; i--) {
                if (currentTime >= lrcData[i].time) {
                    newFullscreenIndex = i;
                    break;
                }
            }

            if (newFullscreenIndex !== currentlyPlaying.fullscreenLineIndex) {
                currentlyPlaying.fullscreenLineIndex = newFullscreenIndex;
                const lines = fullscreenPlayerContainer.querySelectorAll('.fullscreen-karaoke-line');
                lines.forEach((line, index) => {
                    line.classList.remove('active', 'past');
                    if (index < newFullscreenIndex) {
                        line.classList.add('past');
                    } else if (index === newFullscreenIndex) {
                        line.classList.add('active');
                        line.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center'
                        });
                    }
                });
            }
        }
    }
});


audioPlayer.addEventListener('pause', () => {
    if (currentlyPlaying.element) {
        const fillElement = currentlyPlaying.element.querySelector('.lyrics-fill');
        if (fillElement) {
            fillElement.style.animationPlayState = 'paused';
        }
    }
    updatePlayPauseIcon(false);
});

audioPlayer.addEventListener('play', () => {
    if (currentlyPlaying.element) {
        const fillElement = currentlyPlaying.element.querySelector('.lyrics-fill');
        if (fillElement) {
            fillElement.style.animationPlayState = 'running';
        }
    }
    updatePlayPauseIcon(true);
});

audioPlayer.addEventListener('ended', () => {
    playNextSong();
});

// =====================================================================
// UI STATE & MODALS
// Para sa pag-update ng summary, pag-handle ng mga modal, etc.
// =====================================================================
function updateSummaryAndDownloadButton() {
    let syncedCount = 0, plainCount = 0;
    const totalFiles = resultsDiv.children.length;

    document.querySelectorAll('[data-filename]').forEach(item => {
        const badge = item.querySelector('.status-badge');
        if (badge && badge.textContent.includes('Synced')) syncedCount++;
        else if (badge && badge.textContent.includes('Plain')) plainCount++;
    });
    const notFoundCount = totalFiles - (syncedCount + plainCount);
    resultsHeader.textContent = `Results: ${syncedCount} synced, ${plainCount} plain, ${notFoundCount} not found.`;
    
    document.getElementById('lyrics-data-input').value = JSON.stringify(allFoundLyrics);
    document.getElementById('folder-name-input').value = selectedFolderName;
    
    const foundCount = syncedCount + plainCount;
    if (downloadLrcBtn) downloadLrcBtn.disabled = foundCount === 0;
    if (downloadMp3LrcBtn) downloadMp3LrcBtn.disabled = foundCount === 0;
}

document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});

function openRevisionModal(baseName) {
    const options = allSearchResults[baseName];
    if (!options) return;
    revisionTitle.textContent = `Choose lyrics for: ${baseName}`;
    revisionModal.dataset.editingFile = baseName;
    revisionOptions.innerHTML = ''; 
    options.forEach((option) => {
        const optionDiv = createOptionDiv(option);
        optionDiv.addEventListener('click', () => selectRevision(baseName, option));
        revisionOptions.appendChild(optionDiv);
    });

    revisionOptions.classList.remove('hidden');
    revisionSearchResults.classList.add('hidden');
    revisionSearchInput.value = '';
    revisionSearchResults.innerHTML = '';

    revisionModal.classList.remove('hidden');
}

function selectRevision(baseName, selectedMatch) { 
    const wasPlaying = currentlyPlaying.baseName === baseName;
    if (wasPlaying) {
        audioPlayer.pause();
        resetPlayingUI();
        if (currentlyPlaying.audioURL) {
            URL.revokeObjectURL(currentlyPlaying.audioURL);
        }
    }
    
    const safeBaseNameForSelector = baseName.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const resultItem = resultsDiv.querySelector(`[data-filename="${safeBaseNameForSelector}"]`);
    
    const originalFile = processedMusicFiles.find(f => f.baseName === baseName) || { fullName: `${baseName}.mp3`, baseName: baseName };
    
    const existingIndex = allSearchResults[baseName].findIndex(r => r.lyrics === selectedMatch.lyrics && r.title === selectedMatch.title);
    if (existingIndex === -1) {
        allSearchResults[baseName].unshift(selectedMatch);
    }

    updateResultItem(resultItem, originalFile, selectedMatch);
    updateSummaryAndDownloadButton();
    closeModal('revision-modal');

    if (wasPlaying) {
        currentlyPlaying = { element: null, baseName: null, lrcData: [], audioURL: null, lineIndex: -1, fullscreenLineIndex: -1 };
        const updatedResultItem = resultsDiv.querySelector(`[data-filename="${safeBaseNameForSelector}"]`);
        togglePlayback(updatedResultItem, baseName, selectedMatch.status === 'synced', true);
    }
}

function closeModal(modalId) { document.getElementById(modalId).classList.add('hidden'); }

resultsDiv.addEventListener('mouseover', (e) => {
    if (e.target.classList.contains('not-found-badge')) {
        e.target.textContent = 'Manual Search';
        e.target.classList.remove('bg-red-500');
        e.target.classList.add('bg-blue-600', 'cursor-pointer');
    }
});
resultsDiv.addEventListener('mouseout', (e) => {
    if (e.target.classList.contains('not-found-badge')) {
        e.target.textContent = '✗ Not Found';
        e.target.classList.add('bg-red-500');
        e.target.classList.remove('bg-blue-600', 'cursor-pointer');
    }
});
resultsDiv.addEventListener('click', (e) => {
    if (e.target.classList.contains('not-found-badge')) {
        const resultItem = e.target.closest('[data-filename]');
        const baseName = resultItem.dataset.filename;
        openManualSearchModal(baseName);
    }
});

function openManualSearchModal(baseName) {
    manualSearchTitle.textContent = `Manual Search for: ${baseName}`;
    manualSearchModal.dataset.editingFile = baseName;
    manualSearchInput.value = baseName.replace(/ - /g, ' ');
    manualSearchResults.innerHTML = '<p class="text-gray-400 text-center">Enter a query to find lyrics.</p>';
    manualSearchModal.classList.remove('hidden');
}

manualSearchBtn.addEventListener('click', performManualSearch);
manualSearchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') performManualSearch();
});

async function performManualSearch() {
    const query = manualSearchInput.value.trim();
    if (!query) return;

    manualSearchResults.innerHTML = '<p class="text-purple-400 text-center">Searching...</p>';
    try {
        const response = await fetch(`./api/search.php?q=${encodeURIComponent(query)}`);
        const results = await response.json();
        manualSearchResults.innerHTML = '';
        if (results && results.length > 0) {
            const standardizedResults = results.map(res => ({
                artist: res.artistName ?? 'Unknown Artist',
                title: res.trackName ?? 'Unknown Title',
                album: res.albumName ?? 'Unknown Album',
                duration: res.duration ?? 0,
                lyrics: res.syncedLyrics || res.plainLyrics,
                status: res.syncedLyrics ? 'synced' : 'plain',
                artwork: res.artwork
            }));

            standardizedResults.forEach(result => {
                const optionDiv = createOptionDiv(result);
                optionDiv.addEventListener('click', () => selectManualResult(result));
                manualSearchResults.appendChild(optionDiv);
            });
        } else {
            manualSearchResults.innerHTML = '<p class="text-red-400 text-center">No results found for that query.</p>';
        }
    } catch (error) {
        manualSearchResults.innerHTML = `<p class="text-red-400 text-center">An error occurred: ${error.message}</p>`;
    }
}

function selectManualResult(selectedMatch) {
    const baseName = manualSearchModal.dataset.editingFile;
    const safeBaseNameForSelector = baseName.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const resultItem = resultsDiv.querySelector(`[data-filename="${safeBaseNameForSelector}"]`);
    
    const originalFile = processedMusicFiles.find(f => f.baseName === baseName) || { fullName: `${baseName}.mp3`, baseName: baseName };

    if (!Array.isArray(allSearchResults[baseName])) {
        allSearchResults[baseName] = [];
    }
    allSearchResults[baseName].unshift(selectedMatch);

    updateResultItem(resultItem, originalFile, selectedMatch);
    updateSummaryAndDownloadButton();
    closeModal('manual-search-modal');
}

function createOptionDiv(optionData) {
    const { artist, title, album, duration, status } = optionData;
    const isSynced = status === 'synced';
    const statusColor = isSynced ? 'green' : 'yellow';
    const statusTextColor = isSynced ? 'white' : 'gray-900';
    const optionDiv = document.createElement('div');
    optionDiv.className = `p-3 rounded-lg bg-gray-700 hover:bg-gray-600 cursor-pointer border border-transparent hover:border-purple-500`;
    optionDiv.innerHTML = `
        <div class="flex items-center justify-between">
            <div class="flex-grow pr-4 min-w-0">
                <p class="font-bold text-white truncate">${escapeHTML(title)}</p>
                <p class="text-sm text-gray-300 truncate">${escapeHTML(artist)}</p>
                <p class="text-xs text-gray-400 truncate">${escapeHTML(album) || 'No album info'}</p>
            </div>
            <div class="flex-shrink-0 flex items-center space-x-3">
                 <span class="font-mono text-lg text-purple-300">${formatDuration(duration)}</span>
                 <span class="font-semibold px-2 py-1 bg-${statusColor}-500 text-${statusTextColor} rounded-full text-xs">${isSynced ? 'Synced' : 'Plain'}</span>
            </div>
        </div>`;
    return optionDiv;
}

revisionSearchBtn.addEventListener('click', performRevisionSearch);
revisionSearchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') performRevisionSearch();
});

async function performRevisionSearch() {
    const query = revisionSearchInput.value.trim();
    if (!query) return;

    revisionOptions.classList.add('hidden');
    revisionSearchResults.classList.remove('hidden');
    revisionSearchResults.innerHTML = '<p class="text-purple-400 text-center">Searching...</p>';
    const baseName = revisionModal.dataset.editingFile;

    try {
        const response = await fetch(`./api/search.php?q=${encodeURIComponent(query)}`);
        const results = await response.json();
        revisionSearchResults.innerHTML = '';
        if (results && results.length > 0) {
            const standardizedResults = results.map(res => ({
                artist: res.artistName ?? 'Unknown Artist',
                title: res.trackName ?? 'Unknown Title',
                album: res.albumName ?? 'Unknown Album',
                duration: res.duration ?? 0,
                lyrics: res.syncedLyrics || res.plainLyrics,
                status: res.syncedLyrics ? 'synced' : 'plain',
                artwork: res.artwork
            }));

            standardizedResults.forEach(result => {
                const optionDiv = createOptionDiv(result);
                optionDiv.addEventListener('click', () => selectRevision(baseName, result));
                revisionSearchResults.appendChild(optionDiv);
            });
        } else {
            revisionSearchResults.innerHTML = '<p class="text-red-400 text-center">No results found for that query.</p>';
        }
    } catch (error) {
        revisionSearchResults.innerHTML = `<p class="text-red-400 text-center">An error occurred: ${error.message}</p>`;
    }
}


// =====================================================================
// DOWNLOAD LOGIC
// Mga functions para sa pag-download ng .lrc files at ng .mp3 + .lrc as zip.
// =====================================================================
downloadLrcBtn.addEventListener('click', () => {
    const lyricsData = document.getElementById('lyrics-data-input').value;
    const folderName = document.getElementById('folder-name-input').value;

    const form = document.createElement('form');
    form.method = 'post';
    form.action = 'api/download.php';

    const lyricsInput = document.createElement('input');
    lyricsInput.type = 'hidden';
    lyricsInput.name = 'lyrics_data';
    lyricsInput.value = lyricsData;
    form.appendChild(lyricsInput);

    const folderInput = document.createElement('input');
    folderInput.type = 'hidden';
    folderInput.name = 'folder_name';
    folderInput.value = folderName;
    form.appendChild(folderInput);

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
});

downloadMp3LrcBtn.addEventListener('click', async () => {
    downloadMp3LrcBtn.disabled = true;
    downloadMp3LrcBtn.textContent = 'Preparing files... Please wait...';
    statusDiv.textContent = 'Zipping files. This may take a while for large folders...';
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = '0%';

    const formData = new FormData();
    const folderName = document.getElementById('folder-name-input').value;
    formData.append('folder_name', folderName);

    const filesToProcess = Object.keys(allFoundLyrics);
    let processedCount = 0;

    for (const baseName of filesToProcess) {
        const fileObject = musicFileObjects.find(f => f.name.startsWith(baseName + '.'));
        
        // **ERROR FIX DITO BES**
        const searchResultsList = allSearchResults[baseName];
        const searchResult = Array.isArray(searchResultsList) && searchResultsList.length > 0 ? searchResultsList[0] : null;

        if (fileObject) {
            let newFilename;
            const extension = fileObject.name.split('.').pop();
            
            if (searchResult && searchResult.artist && searchResult.title) {
                newFilename = `${searchResult.artist} - ${searchResult.title}.${extension}`;
            } else {
                newFilename = fileObject.name; // Fallback sa original name kung walang metadata
            }
            
            formData.append('music_files[]', fileObject);
            formData.append('new_filenames[]', newFilename);
            formData.append('lyrics_data[]', allFoundLyrics[baseName]);
        }

        processedCount++;
        const progress = Math.round((processedCount / filesToProcess.length) * 100);
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${progress}%`;
    }

    statusDiv.textContent = 'Uploading and creating zip file...';

    try {
        const response = await fetch('api/download_mp3_lrc.php', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server error: ${response.status} - ${errorText}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;

        const safeFolderName = folderName.replace(/[\/:*?"<>|]/g, '_').trim() || 'Renamed_Music';
        a.download = `${safeFolderName}_with_LRC.zip`;

        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();

        statusDiv.textContent = 'Download started!';

    } catch (error) {
        console.error('Download error:', error);
        statusDiv.textContent = `Download failed: ${error.message}`;
        showToast(`An error occurred during download: ${error.message}`, 'error');
    } finally {
        downloadMp3LrcBtn.disabled = false;
        downloadMp3LrcBtn.textContent = 'Download All .mp3 & .lrc (.zip)';
    }
});


// =====================================================================
// FULLSCREEN PLAYER LOGIC (NA-IMPROVE AT MAY BUG FIX)
// Ito na yung pinaka-highlight ng update, bes! Ang bagong fullscreen player.
// =====================================================================
function toggleFullscreenMode(baseName = null) {
    const body = document.body;

    if (baseName) { // --- Pag-OPEN ng player ---
        const resultItem = document.querySelector(`[data-filename="${escapeJsString(baseName)}"]`);
        if (!resultItem) return;

        const isSynced = parseLRC(allFoundLyrics[baseName] || '').length > 0;

        if (currentlyPlaying.baseName !== baseName) {
            togglePlayback(resultItem, baseName, isSynced, true);
        } else if (audioPlayer.paused) {
            audioPlayer.play();
        }

        const artworkUrl = resultItem.getAttribute('data-artwork');
        const lyrics = allFoundLyrics[baseName] || '';
        const songData = allSearchResults[baseName] ? allSearchResults[baseName][0] : {};
        const title = songData.title || baseName;
        const artist = songData.artist || 'Unknown Artist';
        const album = songData.album || '';
        const duration = trueDurations.get(baseName) || songData.duration || 0;

        let lyricsHtml;
        const lyricData = parseLRC(lyrics);
        if (lyricData.length > 0) {
            lyricsHtml = lyricData.map(line => `<p class="fullscreen-karaoke-line text-4xl lg:text-5xl" data-time="${line.time}">${escapeHTML(line.text)}</p>`).join('');
        } else {
            const plainLines = lyrics.split('\n').filter(Boolean);
            lyricsHtml = plainLines.length > 0 ?
                plainLines.map(line => `<p class="fullscreen-karaoke-line text-2xl lg:text-3xl">${escapeHTML(line)}</p>`).join('') :
                `<p class="fullscreen-karaoke-line text-2xl lg:text-3xl opacity-50">No lyrics to display.</p>`;
        }

        fullscreenPlayerContainer.dataset.baseName = baseName;
        fullscreenPlayerContainer.innerHTML = `
            <div class="fullscreen-content-wrapper rounded-2xl">
                <div class="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center gap-8 w-full h-full">
                    <div class="w-full flex-grow flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 overflow-hidden">
                        <div class="flex-shrink-0 w-full max-w-sm lg:w-2/5 lg:max-w-md xl:max-w-lg flex flex-col items-center text-center">
                            <img src="${artworkUrl || 'assets/img/placeholder.png'}" alt="Album Art for ${escapeHTML(title)}" class="w-full h-auto aspect-square object-cover rounded-lg shadow-2xl mb-6">
                            <div class="w-full">
                                <p class="font-bold text-3xl text-white truncate w-full" title="${escapeHTML(title)}">${escapeHTML(title)}</p>
                                <p class="text-xl text-purple-300 truncate w-full" title="${escapeHTML(artist)}">${escapeHTML(artist)}</p>
                                <p class="text-md text-gray-400 mt-1 truncate w-full" title="${escapeHTML(album)}">${escapeHTML(album)}</p>
                            </div>
                        </div>
                        
                        <div class="fullscreen-lyrics-container flex-grow h-full w-full lg:w-3/5 overflow-y-auto flex flex-col py-[45vh] justify-start text-left">
                            ${lyricsHtml}
                        </div>
                    </div>

                    <div class="flex-shrink-0 w-full max-w-3xl mx-auto pt-4">
                         <div class="flex items-center gap-4 text-white font-mono text-sm">
                            <div id="fullscreen-time-current" class="w-12 text-right">${formatDuration(audioPlayer.currentTime)}</div>
                            <div id="fullscreen-progress-bar-wrapper" class="fullscreen-progress-bar-wrapper w-full">
                                <div id="fullscreen-progress-bar" class="fullscreen-progress-bar"></div>
                            </div>
                            <div id="fullscreen-time-duration" class="w-12 text-left">${formatDuration(duration)}</div>
                        </div>
                        <div class="fullscreen-controls flex justify-center items-center gap-8 mt-2">
                            <button onclick="playPreviousSong()" title="Previous Song">
                                <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path d="M8.445 14.832A1 1 0 0010 14.006V5.994a1 1 0 00-1.555-.832L4.16 9.168a1 1 0 000 1.664l4.286 4.001zM11 5.994v8.012a1 1 0 001.555.832l4.285-4.001a1 1 0 000-1.664l-4.285-4.001A1 1 0 0011 5.994z"/></svg>
                            </button>
                            <button onclick="handlePlayPause()" title="Play/Pause" id="fullscreen-play-pause-btn" class="w-16 h-16 flex items-center justify-center text-white bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                                ${audioPlayer.paused ? playIconSVG : pauseIconSVG}
                            </button>
                            <button onclick="playNextSong()" title="Next Song">
                                <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path d="M11.555 5.168A1 1 0 0010 5.994v8.012a1 1 0 001.555.832l4.285-4.001a1 1 0 000-1.664L11.555 5.168zM4 5.994v8.012a1 1 0 001.555.832l4.285-4.001a1 1 0 000-1.664L5.555 5.168A1 1 0 004 5.994z"/></svg>
                            </button>
                        </div>
                    </div>
                </div>

                <button onclick="toggleFullscreenMode()" title="Exit Fullscreen" class="absolute top-4 right-4 bg-black/30 hover:bg-black/60 p-2 rounded-full transition-colors z-20">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        `;
        
        const wrapper = fullscreenPlayerContainer.querySelector('.fullscreen-content-wrapper');
        // Ibinabalik natin itong logic para ipasa yung album art sa CSS
        if (artworkUrl) {
            wrapper.style.setProperty('--bg-image', `url('${artworkUrl}')`);
        } else {
            wrapper.style.removeProperty('--bg-image');
        }
        
        fullscreenPlayerContainer.classList.add('visible');
        body.classList.add('fullscreen-active');

        if (isSynced) {
            setTimeout(() => {
                const lyricsContainer = fullscreenPlayerContainer.querySelector('.fullscreen-lyrics-container');
                const currentTime = audioPlayer.currentTime;
                
                let currentLineIndex = -1;
                for (let i = lyricData.length - 1; i >= 0; i--) {
                    if (currentTime >= lyricData[i].time) {
                        currentLineIndex = i;
                        break;
                    }
                }
                
                const allLines = fullscreenPlayerContainer.querySelectorAll('.fullscreen-karaoke-line');

                if (currentLineIndex === -1) {
                    lyricsContainer.scrollTop = 0;
                } else if (allLines.length > 0) {
                    allLines.forEach((line, index) => {
                         line.classList.remove('active', 'past');
                        if (index < currentLineIndex) {
                            line.classList.add('past');
                        }
                    });
                    
                    const targetLine = allLines[currentLineIndex];
                    if (targetLine) {
                        targetLine.classList.add('active');
                        targetLine.scrollIntoView({ behavior: 'auto', block: 'center' });
                    }
                }
                currentlyPlaying.fullscreenLineIndex = currentLineIndex;
            }, 50);
        }

    } else { // --- Pag-CLOSE ng player ---
        fullscreenPlayerContainer.classList.remove('visible');
        setTimeout(() => {
            if (!fullscreenPlayerContainer.classList.contains('visible')) {
                fullscreenPlayerContainer.innerHTML = '';
            }
        }, 300);
        body.classList.remove('fullscreen-active');
    }
}