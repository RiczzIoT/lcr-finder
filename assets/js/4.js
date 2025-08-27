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
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="22" height="22" x="3" y="3" fill="white"><path d="M18.53 62.724c1.764 0 3.115-.81 5.257-2.707l9.816-8.638h16.62c8.72 0 13.777-5.152 13.777-13.777V15.053c0-8.625-5.056-13.777-13.777-13.777H13.777C5.057 1.276 0 6.42 0 15.053v22.549c0 8.633 5.27 13.777 13.456 13.777h1.016v6.793c0 2.812 1.511 4.552 4.057 4.552zm1.57-7.16v-8.11c0-1.81-.805-2.485-2.486-2.485h-3.55c-5.165 0-7.654-2.603-7.654-7.654V15.34c0-5.033 2.489-7.632 7.654-7.632h35.872c5.149 0 7.654 2.599 7.654 7.632v21.975c0 5.051-2.505 7.654-7.654 7.654H33.188c-1.835 0-2.702.33-4.012 1.65zm-2.212-32.177c0 3.398 2.156 5.936 5.388 5.936 1.361 0 2.592-.302 3.372-1.263h.385c-.868 2.231-3 3.845-5.303 4.4-.95.243-1.327.737-1.327 1.425 0 .8.658 1.36 1.51 1.36 3.174 0 8.8-3.775 8.8-10.6 0-4.138-2.602-7.336-6.588-7.336-3.576 0-6.237 2.518-6.237 6.078zm15.663 0c0 3.398 2.134 5.936 5.387 5.936 1.34 0 2.593-.302 3.373-1.263h.39c-.865 2.231-3.023 3.845-5.308 4.4-.947.243-1.327.737-1.327 1.425 0 .8.636 1.36 1.51 1.36 3.178 0 8.779-3.775 8.779-10.6 0-4.138-2.577-7.336-6.567-7.336-3.577 0-6.237 2.518-6.237 6.078z"></path></svg>
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