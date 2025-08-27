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
                                <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                                  <g transform="translate(20,0) scale(-1,1)">
                                    <path d="M11.555 5.168A1 1 0 0010 5.994v8.012a1 1 0 001.555.832l4.285-4.001a1 1 0 000-1.664L11.555 5.168zM4 5.994v8.012a1 1 0 001.555.832l4.285-4.001a1 1 0 000-1.664L5.555 5.168A1 1 0 004 5.994z"></path>
                                  </g>
                                </svg>
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

                <button onclick="toggleFullscreenMode()" title="Exit Fullscreen" class="absolute top-4 right-4 bg-white/30 hover:bg-white/60 p-2 rounded-full transition-colors z-20">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="22" height="22" x="3" y="3" fill="white"><path d="M17.347 62.821c1.254 0 2.21-.572 3.705-1.933L31.78 51.26h18.443C58.943 51.26 64 46.13 64 37.504V14.956C64 6.33 58.944 1.179 50.223 1.179H13.777C5.057 1.179 0 6.322 0 14.956v22.548C0 46.137 5.27 51.26 13.456 51.26h.994v8.327c0 1.97 1.095 3.235 2.897 3.235zm-.108-39.64c0-3.71 2.79-6.37 6.53-6.37 4.18 0 6.89 3.383 6.89 7.694 0 7.102-5.871 11.086-9.19 11.086-.917 0-1.596-.593-1.596-1.43 0-.742.387-1.242 1.403-1.474 2.4-.587 4.629-2.31 5.53-4.606h-.407c-.823.983-2.108 1.318-3.512 1.318-3.417 0-5.648-2.669-5.648-6.217zm16.387 0c0-3.71 2.77-6.37 6.508-6.37 4.18 0 6.912 3.383 6.912 7.694 0 7.102-5.871 11.086-9.179 11.086-.928 0-1.617-.593-1.617-1.43 0-.742.39-1.242 1.392-1.474 2.436-.587 4.654-2.31 5.551-4.606h-.407c-.823.983-2.108 1.318-3.523 1.318-3.405 0-5.637-2.669-5.637-6.217z"></path></svg>
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