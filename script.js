const JAMENDO_CLIENT_ID = "7cc08b62";


const songList = document.getElementById("songList");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const playerBox = document.getElementById("playerBox");

let currentSource = "jamendo";
let jamendoResults = [];
let youtubeResults = [];
let currentIndex = -1;
let isPlaying = false;
let currentAudio = null;
let currentVideoIframe = null;

// Helper: Clear Player Box
function clearPlayerBox() {
  playerBox.style.display = "none";
  playerBox.innerHTML = "";
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (currentVideoIframe) {
    currentVideoIframe.src = "";
    currentVideoIframe = null;
  }
  isPlaying = false;
  currentIndex = -1;
}

function getSongDataList() {
  return currentSource === "jamendo" ? jamendoResults : youtubeResults;
}

// ----------------------------
// Search Handlers
// ----------------------------
async function searchJamendo(query) {
  songList.innerHTML = "<li>Loading Jamendo tracks...</li>";
  clearPlayerBox();
  jamendoResults = [];
  currentIndex = -1;
  try {
    const url = `https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=jsonpretty&limit=20&namesearch=${encodeURIComponent(query)}&audioformat=mp31&include=musicinfo+stats+lyrics`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      jamendoResults = data.results;
      renderJamendoResults(jamendoResults);
    } else {
      songList.innerHTML = "<li>No tracks found.</li>";
    }
  } catch (err) {
    songList.innerHTML = "<li>Error loading tracks.</li>";
  }
}

function renderJamendoResults(tracks) {
  songList.innerHTML = "";
  tracks.forEach((track, idx) => {
    const li = document.createElement("li");
    // Album cover
    const cover = document.createElement("img");
    cover.className = "cover-img";
    cover.src = track.album_image ? track.album_image : "https://cdn.jamendo.com/v3.0/img/profil/defaults/album.png";
    cover.alt = "Album";
    li.appendChild(cover);

    // Song info
    const title = document.createElement("span");
    title.className = "song-title";
    title.textContent = `${track.artist_name} - ${track.name}`;
    li.appendChild(title);

    // Play button
    const playBtn = document.createElement("button");
    playBtn.textContent = "Play";
    playBtn.onclick = () => {
      playJamendoAt(idx);
    };
    li.appendChild(playBtn);

    songList.appendChild(li);
  });
}

async function searchYouTube(query) {
  songList.innerHTML = "<li>Loading YouTube videos...</li>";
  clearPlayerBox();
  youtubeResults = [];
  currentIndex = -1;
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=15&q=${encodeURIComponent(query + ' music')}&key=${YOUTUBE_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.items && data.items.length > 0) {
      youtubeResults = data.items;
      renderYouTubeResults(youtubeResults);
    } else {
      songList.innerHTML = "<li>No videos found.</li>";
    }
  } catch (err) {
    songList.innerHTML = "<li>Error loading videos.</li>";
  }
}

function renderYouTubeResults(items) {
  songList.innerHTML = "";
  items.forEach((item, idx) => {
    const li = document.createElement("li");
    // Thumbnail
    const thumb = document.createElement("img");
    thumb.src = item.snippet.thumbnails.default.url;
    thumb.alt = "Video";
    thumb.className = "yt-thumb";
    li.appendChild(thumb);

    // Title
    const title = document.createElement("span");
    title.className = "song-title";
    title.textContent = item.snippet.title;
    li.appendChild(title);

    // Play button
    const playBtn = document.createElement("button");
    playBtn.textContent = "Play";
    playBtn.onclick = () => {
      playYouTubeAt(idx);
    };
    li.appendChild(playBtn);
    songList.appendChild(li);
  });
}

// ----------------------------
// JAMENDO Player Controls
// ----------------------------
function playJamendoAt(idx) {
  if (!jamendoResults[idx]) return;
  currentIndex = idx;
  highlightPlaying(idx);
  showJamendoPlayer(jamendoResults[idx], idx);
}
function showJamendoPlayer(track, idx) {
  let prevDisabled = idx === 0 ? "disabled" : "";
  let nextDisabled = idx === jamendoResults.length - 1 ? "disabled" : "";
  playerBox.innerHTML = `
    <img class="player-img" src="${track.album_image ? track.album_image : "https://cdn.jamendo.com/v3.0/img/profil/defaults/album.png"}" alt="Album">
    <div class="player-details">
      <span class="player-title">${track.name}</span>
      <span class="player-artist">${track.artist_name}</span>
      <div class="controls-row">
        <button class="ctrl-btn" id="prevBtn" ${prevDisabled} title="Previous">
          <svg viewBox="0 0 32 32"><polygon points="21,6 21,26 9,16" fill="#fff"/><rect x="23" y="6" width="3" height="20" rx="1.5" fill="#fff" opacity="0.6"/></svg>
        </button>
        <button class="ctrl-btn playing" id="playPauseBtn" title="Pause">
          <svg id="playPauseIcon" viewBox="0 0 32 32"><rect x="10" y="7" width="4" height="18" rx="2" fill="#fff"/><rect x="18" y="7" width="4" height="18" rx="2" fill="#fff"/></svg>
        </button>
        <button class="ctrl-btn" id="nextBtn" ${nextDisabled} title="Next">
          <svg viewBox="0 0 32 32"><polygon points="11,6 11,26 23,16" fill="#fff"/><rect x="6" y="6" width="3" height="20" rx="1.5" fill="#fff" opacity="0.6"/></svg>
        </button>
      </div>
      <audio id="audioPlayer" controls src="${track.audio}" style="margin-top:8px;"></audio>
    </div>
  `;
  playerBox.style.display = "flex";
  // Audio logic
  const audio = document.getElementById("audioPlayer");
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  currentAudio = audio;
  currentAudio.play();
  isPlaying = true;
  // Controls
  document.getElementById("prevBtn").onclick = () => playJamendoAt(idx - 1);
  document.getElementById("nextBtn").onclick = () => playJamendoAt(idx + 1);
  document.getElementById("playPauseBtn").onclick = () => toggleJamendoPlayPause();
  // Auto-next on end, no repeat
  audio.onended = () => {
    if (idx < jamendoResults.length - 1) {
      playJamendoAt(idx + 1);
    }
    // else: do nothing, playback stops
  };
  updateJamendoPlayPauseBtn();
}
function toggleJamendoPlayPause() {
  if (!currentAudio) return;
  if (currentAudio.paused) {
    currentAudio.play();
    isPlaying = true;
  } else {
    currentAudio.pause();
    isPlaying = false;
  }
  updateJamendoPlayPauseBtn();
}
function updateJamendoPlayPauseBtn() {
  const btn = document.getElementById("playPauseBtn");
  const icon = document.getElementById("playPauseIcon");
  if (!btn || !icon) return;
  if (currentAudio && !currentAudio.paused) {
    btn.classList.add("playing");
    icon.innerHTML = `<rect x="10" y="7" width="4" height="18" rx="2" fill="#fff"/><rect x="18" y="7" width="4" height="18" rx="2" fill="#fff"/>`;
    btn.title = "Pause";
  } else {
    btn.classList.remove("playing");
    icon.innerHTML = `<polygon points="13,8 24,16 13,24" fill="#fff"/>`;
    btn.title = "Play";
  }
}

// ----------------------------
// YOUTUBE Player Controls
// ----------------------------
function playYouTubeAt(idx) {
  if (!youtubeResults[idx]) return;
  currentIndex = idx;
  highlightPlaying(idx);
  showYouTubePlayer(youtubeResults[idx], idx);
}
function showYouTubePlayer(item, idx) {
  let prevDisabled = idx === 0 ? "disabled" : "";
  let nextDisabled = idx === youtubeResults.length - 1 ? "disabled" : "";
  playerBox.innerHTML = `
    <div class="player-video" style="width:180px;height:100px;">
      <iframe id="ytIframe" width="100%" height="100%" src="https://www.youtube.com/embed/${item.id.videoId}?autoplay=1&enablejsapi=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
    </div>
    <div class="video-details">
      <span class="video-title">${item.snippet.title}</span>
      <div class="controls-row">
        <button class="ctrl-btn" id="prevBtn" ${prevDisabled} title="Previous">
          <svg viewBox="0 0 32 32"><polygon points="21,6 21,26 9,16" fill="#fff"/><rect x="23" y="6" width="3" height="20" rx="1.5" fill="#fff" opacity="0.6"/></svg>
        </button>
        <button class="ctrl-btn playing" id="playPauseBtn" title="Pause">
          <svg id="playPauseIcon" viewBox="0 0 32 32"><rect x="10" y="7" width="4" height="18" rx="2" fill="#fff"/><rect x="18" y="7" width="4" height="18" rx="2" fill="#fff"/></svg>
        </button>
        <button class="ctrl-btn" id="nextBtn" ${nextDisabled} title="Next">
          <svg viewBox="0 0 32 32"><polygon points="11,6 11,26 23,16" fill="#fff"/><rect x="6" y="6" width="3" height="20" rx="1.5" fill="#fff" opacity="0.6"/></svg>
        </button>
      </div>
    </div>
  `;
  playerBox.style.display = "flex";
  // For YouTube iframe API
  currentVideoIframe = document.getElementById("ytIframe");
  // Controls
  document.getElementById("prevBtn").onclick = () => playYouTubeAt(idx - 1);
  document.getElementById("nextBtn").onclick = () => playYouTubeAt(idx + 1);
  document.getElementById("playPauseBtn").onclick = () => toggleYouTubePlayPause();
  // autoplay next (by polling)
  startYTEndPolling(idx);
  isPlaying = true;
  updateYouTubePlayPauseBtn();
}

function toggleYouTubePlayPause() {
  if (!currentVideoIframe) return;
  const yt = currentVideoIframe.contentWindow;
  if (!yt) return;
  // Use postMessage for YouTube iframe API
  if (isPlaying) {
    yt.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
    isPlaying = false;
  } else {
    yt.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
    isPlaying = true;
  }
  updateYouTubePlayPauseBtn();
}

function updateYouTubePlayPauseBtn() {
  const btn = document.getElementById("playPauseBtn");
  const icon = document.getElementById("playPauseIcon");
  if (!btn || !icon) return;
  if (isPlaying) {
    btn.classList.add("playing");
    icon.innerHTML = `<rect x="10" y="7" width="4" height="18" rx="2" fill="#fff"/><rect x="18" y="7" width="4" height="18" rx="2" fill="#fff"/>`;
    btn.title = "Pause";
  } else {
    btn.classList.remove("playing");
    icon.innerHTML = `<polygon points="13,8 24,16 13,24" fill="#fff"/>`;
    btn.title = "Play";
  }
}

// YouTube autoplay next (polling by checking time)
let ytPollingTimer = null;
function startYTEndPolling(idx) {
  clearInterval(ytPollingTimer);
  ytPollingTimer = setInterval(() => {
    try {
      if (!currentVideoIframe || !currentVideoIframe.contentWindow) return;
      currentVideoIframe.contentWindow.postMessage('{"event":"listening","id":1}', '*');
    } catch (e) {}
  }, 1000);

  // Listen to YouTube player state (ended)
  window.onmessage = (e) => {
    if (typeof e.data === "string" && e.data.indexOf('"event":"onStateChange"') !== -1) {
      try {
        const data = JSON.parse(e.data);
        if (data.event === "onStateChange" && data.info === 0) { // ended
          if (idx < youtubeResults.length - 1) {
            playYouTubeAt(idx + 1);
          }
          // else: do nothing, playback stops
        }
      } catch (e) {}
    }
  };
}

function highlightPlaying(idx) {
  Array.from(songList.children).forEach((li, i) => li.classList.toggle("playing", i === idx));
}

// Search event
function doSearch() {
  const query = searchInput.value.trim();
  if (!query) return;
  if (currentSource === "jamendo") searchJamendo(query);
  else if (currentSource === "youtube") searchYouTube(query);
}

searchBtn && searchBtn.addEventListener("click", doSearch);
searchInput && searchInput.addEventListener("keydown", e => {
  if (e.key === "Enter") doSearch();
});

// Source selector
document.querySelectorAll('input[name="source"]').forEach(radio => {
  radio.addEventListener("change", e => {
    currentSource = e.target.value;
    songList.innerHTML = "";
    clearPlayerBox();
    jamendoResults = [];
    youtubeResults = [];
    currentIndex = -1;
  });
});

// Tabs
const navBtns = document.querySelectorAll(".nav-btn");
const tabs = document.querySelectorAll(".tab");
navBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    navBtns.forEach(b => b.classList.remove("active"));
    tabs.forEach(tab => tab.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
  });
});
// Default to Home tab
document.querySelector('.nav-btn[data-tab="home"]').classList.add("active");
document.getElementById("tab-home").classList.add("active");

// Feedback form (dummy local submit)
const feedbackForm = document.getElementById("feedbackForm");
if (feedbackForm) {
  feedbackForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const msg = document.getElementById("feedbackMsg");
    msg.textContent = "Thank you for your feedback! ❤️";
    msg.style.color = "#ff4da6";
    setTimeout(() => (msg.textContent = ""), 3500);
    feedbackForm.reset();
  });
}
