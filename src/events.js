/* All DOM event wiring. Add new listeners here. */

import { $$, el } from "./core/dom.js";
import { state } from "./core/state.js";
import {
  savePlayerState,
  saveSettings,
  storedSettings,
} from "./core/storage.js";
import { clamp } from "./utils/format.js";
import { navigateTo, router } from "./views/router.js";
import { setStatus } from "./views/results.js";
import {
  closeSettings,
  isSettingsOpen,
  openSettings,
} from "./views/settings.js";
import {
  closePlayer,
  cycleRepeat,
  handlePrev,
  nextTrack,
  playAll,
  playQueueIndex,
  playSong,
  seekTo,
  setVolumeState,
  togglePlay,
  toggleShuffle,
} from "./player/playback.js";
import {
  effectiveDuration,
  setExpanded,
  setFsQueueOpen,
  setPlayingUI,
  setQueueOpen,
  showPlayerNote,
  updateTimeUI,
  updateVolumeUI,
} from "./player/ui.js";

export function bindEvents() {
  el.form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = el.input.value.trim();
    if (q) {
      navigateTo(
        `#/search=${encodeURIComponent(q).replace(/%20/g, "+")}/${state.type}`,
      );
    } else {
      setStatus(
        "Start with a search",
        "Choose a category and search for songs, albums, artists, or playlists.",
      );
    }
  });

  $$(".cat-btn").forEach((b) => {
    b.addEventListener("click", () => {
      const type = b.dataset.type;
      if (state.query) {
        navigateTo(
          `#/search=${encodeURIComponent(state.query).replace(/%20/g, "+")}/${type}`,
        );
      } else {
        setType(type);
      }
    });
  });

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-open-settings]")) {
      e.preventDefault();
      openSettings();
      return;
    }
    if (e.target.closest("[data-close-settings]")) {
      e.preventDefault();
      closeSettings();
      if (location.hash === "#/settings") navigateTo("#/");
      return;
    }

    const play = e.target.closest("[data-play]");
    const open = e.target.closest("[data-open]");
    const queueItem = e.target.closest("[data-queue-index]");
    if (play) playSong(Number(play.dataset.play));
    if (open)
      navigateTo(
        `#/${open.dataset.open}=${encodeURIComponent(open.dataset.id)}`,
      );
    if (e.target.closest("[data-play-all]")) playAll();
    if (queueItem) playQueueIndex(Number(queueItem.dataset.queueIndex));
  });

  el.playPauseBtn.addEventListener("click", togglePlay);
  // el.card.addEventListener("click", togglePlay);
  el.fsPlayPause.addEventListener("click", togglePlay);
  el.prevBtn.addEventListener("click", handlePrev);
  el.fsPrev.addEventListener("click", handlePrev);
  el.nextBtn.addEventListener("click", () => nextTrack(1));
  el.fsNext.addEventListener("click", () => nextTrack(1));
  el.shuffleBtn.addEventListener("click", toggleShuffle);
  el.fsShuffle.addEventListener("click", toggleShuffle);
  el.repeatBtn.addEventListener("click", cycleRepeat);
  el.fsRepeat.addEventListener("click", cycleRepeat);

  el.muteBtn.addEventListener("click", () => {
    el.audio.muted = !el.audio.muted;
    updateVolumeUI();
    saveSettings({ muted: el.audio.muted });
  });
  el.fsMute.addEventListener("click", () => {
    el.audio.muted = !el.audio.muted;
    updateVolumeUI();
    saveSettings({ muted: el.audio.muted });
  });

  const setVolume = (value, persist = true) => {
    const v = clamp(Number(value) || 0, 0, 1);
    el.audio.volume = v;
    if (v > 0) el.audio.muted = false;
    updateVolumeUI();
    if (persist) saveSettings({ volume: v, muted: el.audio.muted });
  };
  el.volumeBar.addEventListener("input", (e) =>
    setVolume(e.target.value, false),
  );
  el.volumeBar.addEventListener("change", (e) => setVolume(e.target.value));
  el.fsVolumeBar.addEventListener("input", (e) =>
    setVolume(e.target.value, false),
  );
  el.fsVolumeBar.addEventListener("change", (e) => setVolume(e.target.value));

  el.closePlayer.addEventListener("click", closePlayer);
  el.playerToggle.addEventListener("click", () => setExpanded(!state.expanded));
  el.expandPlayer.addEventListener("click", () => {
    if (el.player.classList.contains("open")) navigateTo("#/player");
  });
  el.playerArtBtn.addEventListener("click", () => {
    if (el.player.classList.contains("open")) navigateTo("#/player");
  });

  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)");
  el.player.addEventListener("mouseenter", () => {
    if (!canHover.matches) return;
    if (storedSettings["player-hover"] === false) return;
    el.player.classList.add("hovering");
  });
  el.player.addEventListener("mouseleave", () => {
    el.player.classList.remove("hovering");
  });

  el.queueBtn.addEventListener("click", () => setQueueOpen(!state.queueOpen));
  el.queueClose.addEventListener("click", () => setQueueOpen(false));
  el.fsQueueBtn.addEventListener("click", () =>
    setFsQueueOpen(!el.fullscreenView.classList.contains("queue-open")),
  );

  document.addEventListener("click", (e) => {
    if (!state.queueOpen) return;
    if (e.target.closest("#player")) return;
    if (e.target.closest("[data-queue-index]")) return;
    setQueueOpen(false);
  });

  const bindSeek = (input) => {
    input.addEventListener("pointerdown", () => {
      state.seeking = true;
    });
    input.addEventListener("input", () => {
      state.seeking = true;
      if (!effectiveDuration()) return;
      el.audio.currentTime = Number(input.value);
      updateTimeUI();
    });
    input.addEventListener("change", () => {
      state.seeking = false;
      updateTimeUI();
    });
    input.addEventListener("pointerup", () => {
      state.seeking = false;
      updateTimeUI();
    });
    input.addEventListener("blur", () => {
      state.seeking = false;
    });
  };
  bindSeek(el.progressBar);
  bindSeek(el.fsProgress);

  el.audio.addEventListener("ended", () => {
    if (state.repeat === "one") {
      el.audio.currentTime = 0;
      el.audio.play().catch(() => {});
      return;
    }
    const hasNext = state.queueIndex < state.queue.length - 1;
    if (state.shuffle || hasNext || state.repeat === "all") {
      nextTrack(1);
    } else {
      setPlayingUI(false);
    }
  });

  el.audio.addEventListener("loadedmetadata", updateTimeUI);
  el.audio.addEventListener("durationchange", updateTimeUI);

  let saveThrottle = null;
  el.audio.addEventListener("timeupdate", () => {
    updateTimeUI();
    if (!saveThrottle) {
      saveThrottle = setTimeout(() => {
        savePlayerState();
        saveThrottle = null;
      }, 5000);
    }
  });

  el.audio.addEventListener("play", () => setPlayingUI(true));
  el.audio.addEventListener("pause", () => {
    setPlayingUI(false);
    if (saveThrottle) {
      clearTimeout(saveThrottle);
      saveThrottle = null;
    }
    savePlayerState();
  });
  el.audio.addEventListener("error", () => {
    if (!el.audio.getAttribute("src")) return;
    showPlayerNote("This track could not be played.");
    setPlayingUI(false);
  });

  document.addEventListener("keydown", (e) => {
    if (isSettingsOpen()) {
      if (e.code === "Escape") {
        e.preventDefault();
        closeSettings();
        if (location.hash === "#/settings") navigateTo("#/");
        return;
      }

      if (e.code === "Tab") {
        const focusable = Array.from(
          el.settingsView.querySelectorAll(
            'button, select, input, a[href], [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((node) => !node.disabled && node.offsetParent !== null);
        if (focusable.length) {
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }

      /* Keep player keyboard shortcuts disabled while the modal is open. */
      return;
    }

    const tag = e.target.tagName;
    if (
      tag === "INPUT" ||
      tag === "SELECT" ||
      tag === "TEXTAREA" ||
      e.target.isContentEditable
    )
      return;
    if (!el.player.classList.contains("open")) return;

    if (e.code === "Space") {
      e.preventDefault();
      togglePlay();
    } else if (e.code === "ArrowRight") {
      e.preventDefault();
      if (e.shiftKey) nextTrack(1);
      else seekTo((el.audio.currentTime || 0) + 5);
    } else if (e.code === "ArrowLeft") {
      e.preventDefault();
      if (e.shiftKey) handlePrev();
      else seekTo((el.audio.currentTime || 0) - 5);
    } else if (e.code === "ArrowUp") {
      e.preventDefault();
      setVolumeState((el.audio.muted ? 0 : el.audio.volume) + 0.05);
    } else if (e.code === "ArrowDown") {
      e.preventDefault();
      setVolumeState((el.audio.muted ? 0 : el.audio.volume) - 0.05);
    } else if (e.code === "KeyM") {
      el.audio.muted = !el.audio.muted;
      updateVolumeUI();
      saveSettings({ muted: el.audio.muted });
    } else if (e.code === "KeyQ") {
      setQueueOpen(!state.queueOpen);
    } else if (e.code === "KeyF") {
      if (location.hash !== "#/player") navigateTo("#/player");
    } else if (e.code === "Escape") {
      if (location.hash === "#/player") navigateTo("#/");
      else if (state.queueOpen) setQueueOpen(false);
      else if (state.expanded) setExpanded(false);
    }
  });

  window.addEventListener("hashchange", router);
  window.addEventListener("beforeunload", savePlayerState);

  if ("mediaSession" in navigator) {
    const safe = (action, handler) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {}
    };
    safe("play", () => el.audio.play().catch(() => {}));
    safe("pause", () => el.audio.pause());
    safe("previoustrack", handlePrev);
    safe("nexttrack", () => nextTrack(1));
    safe("seekbackward", (d) =>
      seekTo((el.audio.currentTime || 0) - (d.seekOffset || 10)),
    );
    safe("seekforward", (d) =>
      seekTo((el.audio.currentTime || 0) + (d.seekOffset || 10)),
    );
    safe("seekto", (d) => {
      if (d.seekTime != null) seekTo(d.seekTime);
    });
    safe("stop", closePlayer);
  }

  router();
}

/* Local helper kept from the original script: switch the active category pill. */
function setType(type) {
  state.type = type;
  $$(".cat-btn").forEach((b) =>
    b.classList.toggle("active", b.dataset.type === type),
  );
}
