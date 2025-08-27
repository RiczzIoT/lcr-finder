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