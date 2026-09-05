# Music

A self‑hosted, Apple Music–style web client for [Navidrome](https://www.navidrome.org/).

Streams your own library through the Subsonic/OpenSubsonic API, adds a "For You" discovery layer powered by Deezer's public API (30‑second previews), and installs as a home‑screen web app on iPhone and Mac.

> **Built for macOS Safari and iOS Safari only.**
> Layout, gestures, PWA install, Media Session and audio behaviour are tuned for those two targets and nothing else is tested. It will probably load in Chrome/Firefox/Android, but expect rough edges.
> Everyone is free to fork this and make it work on Windows, Android, Linux desktops or anywhere else. PRs for other platforms are welcome too, as long as they don't degrade the Apple targets.

> **How this was made.**
> The entire codebase — schema, API layer, player, UI, Docker setup — was written by **Claude Fable 5.1** (Anthropic) in a chat session, from a written spec, with a human testing on a real Navidrome server and reporting bugs. Total cost: roughly **€20 in API tokens**. No line was hand‑written. Treat it accordingly: it works, it's readable, it has not been audited by a human.

---

## Features

- **Library** — albums, artists, songs, playlists, search. Filter + sort on every list page.
- **Player** — queue, shuffle, repeat, gapless preload, ReplayGain loudness normalisation, bitrate/transcode selector, lock‑screen / Control Center controls (Media Session), keyboard shortcuts on desktop, swipe gestures on mobile.
- **Liked Songs** — heart any track; synced with Navidrome's own starring, so it shows up in every other Subsonic client too.
- **For You** — after 200 plays, suggests related artists and recent releases from the artists you actually listen to, cross‑checked against your library so it only shows things you don't own. Deezer previews, dismiss what you don't like.
- **Wishlist** — bookmark any discovered artist, album or track. Lives at the top of For You. "Copy as text" exports the list (`[album] Artist - Title (Year)` per line) to paste into whatever you use to acquire music. The app itself never downloads anything.
- **Settings** — theme, gapless, normalisation, streaming quality, library stats, trigger a Navidrome rescan.
- **Multi‑user** — every user logs in with their own Navidrome credentials. Shared library, per‑user history and recommendations. No admin panel; user management stays in Navidrome.
- **Security** — Navidrome credentials are AES‑256‑GCM encrypted at rest and never reach the browser; audio and cover art are proxied through the app.

## Not in scope (v1)

- Offline playback / caching audio
- Autoplay / radio continuation after a queue ends
- Playlist editing (use Navidrome for now)
- Downloader integration (Lidarr, slskd, …) — the wishlist export is as far as it goes
- Android / Chrome / Windows optimisation — fork it

## Known issue

iOS 26 has a WebKit regression ([bug 295518](https://bugs.webkit.org/show_bug.cgi?id=295518)): audio in a home‑screen PWA may not resume after the app is backgrounded and reopened. Same page in a normal Safari tab works. Apple's bug, not fixable app‑side yet.

---

## Stack

SvelteKit 2 · Svelte 5 · Bun · PostgreSQL + Drizzle · Tailwind v4 (shadcn Zinc tokens) · Lucide · Docker

External APIs: Navidrome (Subsonic/OpenSubsonic), Deezer public API (no key), lrclib.net.

---

## Self‑hosting

Tested on a Raspberry Pi 5 (arm64) next to an existing Navidrome container. Any Linux box with Docker works. Images are built for `linux/amd64` and `linux/arm64` by GitHub Actions and published to `ghcr.io/ze-castro/music` — the server never needs the source.

### Requirements

- Docker + Docker Compose v2
- A running Navidrome instance reachable from the Docker host
- (Recommended) a reverse proxy with HTTPS — Caddy, Nginx Proxy Manager, Traefik, whatever you already run. iOS "Add to Home Screen" works over plain HTTP on your LAN, but Media Session and PWA behaviour are better on HTTPS.

### 1. Get the two files

```sh
mkdir -p ~/music && cd ~/music
curl -O https://raw.githubusercontent.com/ze-castro/music/main/deploy/docker-compose.yml
curl -o .env https://raw.githubusercontent.com/ze-castro/music/main/deploy/.env.example
```

### 2. Fill `.env`

| Variable         | What                                                                                                                                     |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `ENCRYPTION_KEY` | 32 random bytes, base64. `openssl rand -base64 32`                                                                                       |
| `SESSION_SECRET` | Any long random string. `openssl rand -base64 48`                                                                                        |
| `NAVIDROME_URL`  | Navidrome address **as seen from inside Docker**, e.g. `http://192.168.1.50:4533`. Leave empty to let users type it on the login screen. |
| `ORIGIN`         | The exact URL people will open, e.g. `https://music.example.com`. Wrong value → login silently fails (CSRF check).                       |

```sh
sed -i "s|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=$(openssl rand -base64 32)|" .env
sed -i "s|^SESSION_SECRET=.*|SESSION_SECRET=$(openssl rand -base64 48)|" .env
```

**Do not lose `ENCRYPTION_KEY`.** It decrypts every stored Navidrome password. Rotate it and everyone has to log in again.

### 3. Run

```sh
docker compose up -d
```

The app listens on host port **47213**. Point your reverse proxy at `http://<server-ip>:47213`. Postgres is not exposed. Database migrations run automatically on container start.

### 4. Update

```sh
docker compose pull && docker compose up -d
docker image prune -f        # drop the old image
```

Pin a version instead of `latest` by changing the image tag in `docker-compose.yml` to e.g. `ghcr.io/ze-castro/music:v1.0.0` (tags match git tags) or a short commit SHA.

### 5. Reverse proxy example (Caddy)

```
music.example.com {
    reverse_proxy localhost:47213
}
```

Set `ORIGIN=https://music.example.com` in `.env`, then `docker compose up -d` — no image rebuild needed for env changes.

### 6. Install on iPhone / Mac

Open the URL in **Safari** (not Chrome) → Share → **Add to Home Screen** (iOS) or **Add to Dock** (macOS Sonoma+). Log in with your Navidrome username and password.

### Same‑host Navidrome

If Navidrome runs in Docker on the same machine, join its network and use the container name:

```yaml
# deploy/docker-compose.yml
services:
  ui:
    networks: [default, navidrome]
networks:
  navidrome:
    external: true
    name: navidrome_default # docker network ls to find it
```

```
NAVIDROME_URL=http://navidrome:4533
```

### Useful commands

```sh
docker compose logs -f ui           # app logs
docker compose logs -f db           # postgres
docker compose ps                   # status
docker compose up -d                # apply .env changes
docker compose down                 # stop (data in `pgdata` volume survives)
```

### Building the image yourself

Fork → GitHub Actions runs `.github/workflows/docker.yml` on every push to `main` and publishes `ghcr.io/<you>/music`. Make the package public in GitHub → Packages → package settings, or `docker login ghcr.io` on the server with a PAT that has `read:packages`. Then change the `image:` line in your compose file.

---

## Local development

Repo‑root `docker-compose.yml` builds from source (HTTP, non‑secure cookies, Postgres on `127.0.0.1:5432` for `bun dev`).

```sh
cp .env.example .env            # fill secrets
docker compose up -d --build    # everything in Docker → http://localhost:47213
```

or run the app on the host:

```sh
docker compose up -d db         # just Postgres
bun install
bun run db:migrate
bun run dev                     # http://localhost:5173
```

`bun run check` for type‑checking. After editing `src/lib/server/db/schema.ts`, run `bun run db:generate` and commit the new file in `drizzle/` — migrations apply automatically on container start.

If `bun install` complains about the lockfile version, delete `bun.lock` and reinstall — it was generated with a newer Bun.

---

## Project layout

```
src/lib/server/
  db/schema.ts         users, sessions, listening_history, recommendations_cache, wishlist, lyrics_cache
  crypto.ts            AES‑256‑GCM for stored Navidrome passwords
  session.ts           JWT cookie → sessions row → user
  subsonic/            typed Subsonic/OpenSubsonic client, fresh salt+token per request
  deezer/              related artists, albums, top tracks, previews
  lrclib/              synced lyrics (not wired into UI yet)
  recs.ts              "For You" pipeline
  wishlist.ts          wishlist queries
src/lib/stores/        player, settings, likes, wishlist, preview (Svelte 5 runes)
src/lib/components/    TrackList, AlbumCard, ListHeader, MiniPlayer, NowPlaying, LikeButton, WishButton, …
src/routes/api/        stream + cover proxies, scrobble, star, recs, wishlist, settings
```

---

## Contributing / forking

Fork it. Make it work on Android, Windows, Chrome, a TV, an e‑reader — whatever. The only ask: keep the Navidrome credential handling as it is (encrypted at rest, proxied streams) or make it stricter.

## License

MIT