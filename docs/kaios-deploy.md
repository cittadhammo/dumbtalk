# Building & sideloading the KaiOS 2.5 app

> **For Nokia 6300 4G owners, start here:** a quick how-to. The detailed build
> and reference notes follow below.

## How to get DumbTalk onto your Nokia 6300 4G

### Step 0 — On your computer (the Pi/server running DumbTalk)

Build the phone app:

```sh
npm run build:kaios
```

This creates `dist/dumbtalk-kaios.zip` plus the unpacked `dist/kaios/` folder.

### Step 1 — Make sure your server is reachable

- The phone must be able to reach the DumbTalk server, so either keep the
  server on the **same Wi-Fi network** as the phone, or expose it via a
  public/DDNS/VPN address.
- Note your server's address, for example `http://192.168.1.20:8787`.
- Set this on the server's env so its same-origin check passes for the phone:

  ```env
  PUBLIC_ORIGIN=http://192.168.1.20:8787
  ```

  (If you use a hostname or reverse proxy, set `PUBLIC_ORIGIN` to that origin.)
- Restart the DumbTalk server after changing the env.

### Step 2 — Get your widget token

Open the server in a **desktop browser** once and finish the first-run widget
flow. You'll get a widget URL containing a `#token` — note the token (the part
after the `#`). You'll type it into the phone later.

### Step 3 — Enable developer access on the phone

To sideload a privileged app (needed for `systemXHR`), the phone should be
developer-unlocked:

- Open the phone's **Settings → Device → Developer**, enable **"DevTools"** /
  developermenu (e.g. via the hidden `*#*#33284#*#*` code on KaiOS).
- Reboot the phone when prompted.

### Step 4 — Sideload the app onto the phone

Connect the phone by USB and install the ZIP with any one of:

- **gdeploy (recommended):**
  ```sh
  gdeploy install dist/dumbtalk-kaios.zip
  ```
- **KaiOSTech ADB:**
  ```sh
  adb install dist/dumbtalk-kaios.zip
  ```
- **WebIDE** (older Firefox dev tools): USB-debug the phone, then
  "Open App" → the `dist/kaios/` folder.

The DumbTalk icon appears in your app list after install.

### Step 5 — First launch: connect to your server

1. Open **DumbTalk** on the phone.
2. On the **Connect** screen enter:
   - **Server address** — e.g. `http://192.168.1.20:8787`
   - **Authorization token** — the `#token` from Step 2
3. Press **Connect**.

If it succeeds you're in. You can change these anytime under
**Settings → DumbTalk server**.

### Controls along the way

| Key | Action |
|-----|--------|
| D-pad arrows | Move focus |
| OK / Enter / D-pad centre | Activate / select |
| SoftLeft | Left soft-key action |
| SoftRight | Back |
| Hardware Back key | Navigate back (does not close the app) |

---

## Reference: build, package, and internals

Targets feature phones on KaiOS 2.5 (Firefox Gecko 48), e.g. the **Nokia 6300 4G**.

## Build

```sh
npm run build:kaios
```

Writes a ready-to-sideload bundle to `dist/kaios/` (`app.js`, `styles.css`,
`index.html`, `manifest.webapp`, `dumbtalk.png`) and packages everything into
`dist/dumbtalk-kaios.zip`.

The KaiOS bundle is a **second, separate build** from the Vite web app:

- **JS** is emitted as a single classic `<script>` (IIFE) via esbuild, with
  optional chaining, nullish coalescing, async/await, classes and generators
  lowered for Gecko 48. The plain web build (`vite build`) stays ESM for
  modern browsers and is unaffected.
- **CSS** is compiled by Dart Sass. Each `*.module.scss` is transformed with a
  CSS-modules pass so the hashed selectors match the class maps the JS
  references. The KaiOS override stylesheet (`src/client/styles/kaios.scss`)
  adds fallbacks because Gecko 48 has **no CSS Grid** and **no CSS variables**
  at runtime — layout degrades to stacked blocks.
- Missing runtime built-ins (`Array.prototype.at/flat/flatMap`) and the cross-
  origin Fetch rewiring are supplied by `src/client/kaios/polyfills.ts`.

## Package

`manifest.webapp` declares the `systemXHR` permission plus the app name,
description, launch path and icons, so KaiOS can install the ZIP:

```json
{
  "permissions": {
    "systemXHR": { "description": "Required to communicate with self-hosted DumbTalk backend API" }
  }
}
```

The same manifest is also copied into the regular Vite output
(`public-next/manifest.webapp`) so it can be served over HTTP too.

## Sideloading

Install the ZIP onto the device with any of:

- **gdeploy** (KaiOS): `gdeploy install dist/dumbtalk-kaios.zip`
- **WebIDE / WebIDE-ish** via USB debugging
- **KaiOSTech ADB**: `adb install dist/dumbtalk-kaios.zip`
- Siemens/HMD device tools that accept an app ZIP

D-pad-only devices can then be driven entirely from the keypad (see Controls).

## First-run / backend configuration

Because a packaged KaiOS app lives on `app://` and has no widget URL, on first
launch it shows a **Connect** screen asking for:

1. **Server address** — the URL of your self-hosted DumbTalk backend, e.g.
   `http://192.168.1.20:8787`.
2. **Authorization token** — the widget token from the saved DumbTalk widget
   URL (the part after `#`), or paste the whole widget URL.

These are persisted to `localStorage` and can be changed later under
**Settings → DumbTalk server**. The token is mirrored into `localStorage`
inside `api/client.ts` so it survives launcher restarts (URL fragments don't
persist on KaiOS).

### Backend same-origin requirement

The backend only allows non-GET API calls from a matching origin (see
`requireSameOrigin` in `server.mjs`). The KaiOS app is served from `app://`,
so its `Origin` header won't match automatically. To satisfy the check:

1. The POST to `/api/setup/claim` and every other non-GET request must be
   accepted. The KaiOS `fetch` (backed by the `systemXHR` permission) performs
   privileged cross-origin requests that bypass CORS, but the backend's own
   origin gate still applies.
2. Set `PUBLIC_ORIGIN` on the server to the origin the device uses to reach
   it, for example:

   ```env
   PUBLIC_ORIGIN=http://192.168.1.20:8787
   ```

   If you're using a reverse proxy with a hostname, either match
   `PUBLIC_ORIGIN` to that origin or let the proxy forward `Host`,
   `X-Forwarded-Host` and `X-Forwarded-Proto` so the backend can derive it.

### Claiming a fresh installation

If your server hasn't been claimed yet, point a desktop browser at the server
and complete the first-run web flow to obtain the widget token, then enter
that token in the KaiOS Connect screen. (Keep clicking this flow until the app
boots.)

## Controls (D-pad)

| Key              | Action                                              |
|------------------|-----------------------------------------------------|
| `ArrowUp/Down/Left/Right` | Move D-pad focus between focusable items    |
| `Enter` / D-pad centre | Activate the focused item                      |
| `SoftLeft` (`ShiftLeft`)  | Left soft-key action / menu                |
| `SoftRight` (`ShiftRight`) | Right soft-key action (Back)              |
| `Backspace` / Back | Back key → navigates back (right soft-key action) instead of closing |

- `platform/Focus.tsx` routes the D-pad and `Enter` (activating the focused
  element) and keeps an active focus state using `compareDocumentPosition`
  document-order traversal.
- `platform/Softkeys.tsx` maps `SoftLeft`/`SoftRight`/`Backspace`/`back` to the
  on-screen soft-key bar.
- All list views (conversation list, chat rooms, search, settings) already
  track a visually highlighted focus target via `FocusButton`.
