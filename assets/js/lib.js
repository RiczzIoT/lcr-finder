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