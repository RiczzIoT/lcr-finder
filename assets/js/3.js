// =====================================================================
// MAIN PROCESS LOGIC
// Automatic na itong tatakbo kapag nakapili na ng folder.
// =====================================================================

// I-define ang function para sa pag-proseso
async function startProcessing() {
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
        // Hindi na kailangan ng toast dito dahil hindi naman ito mangyayari sa 'change' event
        return;
    }

    if (!audioPlayer.paused) {
        audioPlayer.pause();
        if (currentlyPlaying.audioURL) URL.revokeObjectURL(currentlyPlaying.audioURL);
    }
    currentlyPlaying = {
        element: null, baseName: null, lrcData: [], audioURL: null, lineIndex: -1, fullscreenLineIndex: -1
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
        baseName: file.name.replace(/\.[^/.]+$/, "").replace(/\s*[\(\[].*?[\)\]]\s*/g, '').trim()
    }));

    if (files.length > 0 && files[0].webkitRelativePath) {
        selectedFolderName = files[0].webkitRelativePath.split('/')[0];
    } else {
        selectedFolderName = 'SyncedLyrics';
    }
    
    if (processedMusicFiles.length === 0) {
        showToast('No compatible music files (.mp3, .flac, etc.) found in the selected folder.', 'error');
        progressContainer.classList.add('hidden');
        processBtn.disabled = false;
        processBtn.textContent = 'Scan for Lyrics';
        return;
    }

    const BATCH_SIZE = 20;
    const totalBatches = Math.ceil(processedMusicFiles.length / BATCH_SIZE);
    let processedSongs = 0;
    for (let i = 0; i < processedMusicFiles.length; i += BATCH_SIZE) {
        const batch = processedMusicFiles.slice(i, i + BATCH_SIZE);
        const currentBatchNumber = (i / BATCH_SIZE) + 1;
        statusDiv.textContent = `Searching... (Batch ${currentBatchNumber} of ${totalBatches})`;
        try {
            const response = await fetch('./api/search.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tracks: batch })
            });
            if (!response.ok) {
                 const errorText = await response.text();
                 throw new Error(`Server responded with an error: ${errorText}`);
            }
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
}

// =====================================================================
// BAGONG LOGIC: AUTOMATIC NA MAG-SCAN PAGKAPILI NG FOLDER
// =====================================================================
folderInput.addEventListener('change', startProcessing);