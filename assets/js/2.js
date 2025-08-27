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