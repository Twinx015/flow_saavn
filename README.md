# Flow [Saavn]

A web player that streams songs from the JioSaavn library, with no ads.

For a fuller player, check my profile and see **Flow**.

**Live:** https://flow-saavn.pages.dev

## Features
- Ad-free playback
- Search songs, albums, and artists
- Play/pause, seek, next/previous
- Lightweight, runs in the browser

## How it works
1. The frontend sends a search or play request to my custom API.
2. The API fetches the song's live stream link from JioSaavn.
3. The link is played in the browser with the HTML `<audio>` tag.

## Tech stack
- Frontend: HTML/CSS/JS
- Backend: custom API
- Hosting: Cloudflare Pages

## Run locally
```bash
git clone https://github.com/Twinx015/flow_saavn/
cd flow-saavn
# open index.html, or run a local server
python -m http.server
```

## Roadmap
- [ ] Personal library with history and liked songs.
- [ ] Login / Signup.
- [ ] Share songs using a card.

## Disclaimer
This is an unofficial project, not affiliated with JioSaavn. All music belongs to its respective owners. Built for personal and educational use.

## Credits
Made by Twinx. Music from JioSaavn.
