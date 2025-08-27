// =====================================================================
// DOWNLOAD LOGIC (Final Version)
// - Handles downloading only .lrc files.
// - Handles the full MP3+LRC+Metadata download via server-side processing.
// =====================================================================

function sanitizeFilename(name) {
  if (typeof name !== 'string') {
    return 'Untitled';
  }
  return name.replace(/[\\/:*?"<>|]/g, '-').trim();
}

// Logic for the "Download All .lrc (.zip)" button (remains unchanged)
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

// Logic for the "Download All .mp3 & .lrc (.zip)" button
downloadMp3LrcBtn.addEventListener('click', async () => {
    downloadMp3LrcBtn.disabled = true;
    // Note: The original code modified downloadLrcBtn, which might be a typo.
    // Changed to modify its own button's text for clarity.
    downloadMp3LrcBtn.textContent = 'Preparing files...';
    statusDiv.textContent = 'Gathering files and metadata...';
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = '0%';

    // This gets the list of songs that were successfully found
    const filesToProcess = Object.keys(allFoundLyrics);

    // --- SMART CHECK ---
    // If no songs were found, do not proceed with the download.
    if (filesToProcess.length === 0) {
        showToast('No found songs available to download.', 'error');
        downloadMp3LrcBtn.disabled = false;
        downloadMp3LrcBtn.textContent = 'Download All .mp3 & .lrc (.zip)';
        progressContainer.classList.add('hidden');
        return; // Stop the function here
    }

    const formData = new FormData();
    const folderName = document.getElementById('folder-name-input').value;
    formData.append('folder_name', folderName);

    // Loop through only the successfully found files and prepare their data
    for (const baseName of filesToProcess) {
        const fileObject = musicFileObjects.find(f => f.name.replace(/\.[^/.]+$/, "").replace(/\s*[\(\[].*?[\)\]]\s*/g, '').trim() === baseName);
        const searchResultsList = allSearchResults[baseName];
        const bestMatch = Array.isArray(searchResultsList) && searchResultsList.length > 0 ? searchResultsList[0] : null;

        if (fileObject && bestMatch) {
            const extension = fileObject.name.split('.').pop();
            const newBaseFilename = sanitizeFilename(`${bestMatch.artist} - ${bestMatch.title}`);
            const newMusicFilename = `${newBaseFilename}.${extension}`;
            
            // Append all necessary data for the server to process
            formData.append('music_files[]', fileObject, fileObject.name);
            formData.append('new_filenames[]', newMusicFilename);
            formData.append('lyrics_data[]', allFoundLyrics[baseName]);
            formData.append('artwork_urls[]', bestMatch.artwork || '');
            formData.append('titles[]', bestMatch.title || '');
            formData.append('artists[]', bestMatch.artist || '');
            formData.append('albums[]', bestMatch.album || '');
            formData.append('genres[]', bestMatch.genre || '');
            formData.append('years[]', bestMatch.year || '');
            formData.append('track_numbers[]', bestMatch.track_number || '');
            formData.append('album_artists[]', bestMatch.album_artist || bestMatch.artist || ''); // Fallback to artist if album_artist is null
            
            // --- ITO YUNG MGA DAGDAG MULA SA UNANG AYOS ---
            formData.append('composers[]', bestMatch.composer || '');
            formData.append('copyrights[]', bestMatch.copyright || '');
            formData.append('disc_numbers[]', bestMatch.disc_number || '');
            formData.append('disc_counts[]', bestMatch.disc_count || '');
        }
    }
    
    statusDiv.textContent = 'Embedding artwork & zipping on server...';

    try {
        const response = await fetch('api/download_mp3_lrc.php', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            // This will catch server errors like 400, 404, 500
            const errorText = await response.text();
            throw new Error(`Server error: ${response.status}. Details: ${errorText}`);
        }

        statusDiv.textContent = 'Download starting...';
        const blob = await response.blob();
        
        const safeFolderName = sanitizeFilename(folderName) || 'Synced_Music';
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = downloadUrl;
        a.download = `${safeFolderName}_with_LRC_and_Art.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        a.remove();
        
        statusDiv.textContent = 'Process Complete!';

    } catch (error) {
        // This will catch network errors (like "Failed to fetch") or errors thrown above
        console.error('Download error:', error);
        statusDiv.textContent = `Download failed: ${error.message}`;
        showToast(`An error occurred during download: ${error.message}`, 'error');
    } finally {
        downloadMp3LrcBtn.disabled = false;
        downloadMp3LrcBtn.textContent = 'Download All .mp3 & .lrc (.zip)';
        progressContainer.classList.add('hidden');
    }
});