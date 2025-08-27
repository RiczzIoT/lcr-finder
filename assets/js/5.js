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