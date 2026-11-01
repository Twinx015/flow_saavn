# Singularity - Web

This is just a music player , a smaller part of something bigger - it is part of Singularity a project for all OS to play youtube videos and listen to song in one app also with no ads and all things local no youtube api so data remians private and local.

## Usage 
Open the link in web browser
```bash
https://philast-015.github.io/Singularity-Web/
```

## Cloning
```
git clone https://github.com/philast-015/singularity-web/
cd Singularity-Web
```

## Project structure

The app is plain HTML/CSS/JS with no build step. ES modules are loaded directly by the browser, so open it through a local server (for example `python3 -m http.server`) instead of `file://`.

```
index.html                 Page markup
style.css                  CSS entry point (imports styles/*)
styles/
  base.css                 Variables, resets, shared primitives
  navbar.css               Top bar and search
  library.css              Result cards, song rows, detail view
  settings.css             Settings modal
  player.css               Mini player, queue, bottom-bar variant
  fullscreen.css           Fullscreen "Now playing" view
  responsive.css           Media queries
src/
  main.js                  Entry point: bootstraps the app
  events.js                All DOM event listeners
  core/
    config.js              Constants (storage keys, defaults)
    state.js               Shared application state
    dom.js                 Cached element lookups ($, $$, el)
    storage.js             localStorage settings + last session
  utils/
    api.js                 API fetch wrapper
    format.js              Text, image, duration helpers
    color.js               Artwork colour extraction
  player/
    playback.js            Play / pause, queue, seek, volume
    ui.js                  Player, queue and time rendering
    theme.js               Accent colour CSS variables
    customize.js           Applies player settings
    restore.js             Restores the last session
  views/
    cards.js               Card and song-row markup
    results.js             Search results and collection detail
    router.js              Hash routing
    settings.js            Settings modal + bindings
    notice.js              Dismissible notice banner
```

Rule of thumb: markup builders live in `views/`, player behaviour in `player/`, shared helpers in `utils/`, and anything that must be shared globally in `core/`. `src/main.js` imports the pieces last and starts the app.
