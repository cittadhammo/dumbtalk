# SigDumb

A small, self-hosted Signal linked-device client for QVGA CloudPhone feature phones. It runs
`signal-cli` inside the same container, keeps the raw Signal API private, and exposes a
password-protected keypad-first web interface through your own HTTPS reverse proxy.

This is an unofficial client. It is not affiliated with or supported by Signal Messenger LLC.
`signal-cli` is also unofficial and must be kept current to remain compatible with Signal.

## Current scope

- Link as a secondary Signal device with a QR code
- Persist linked-device keys in a mounted directory
- Receive and cache text messages
- Mirror messages sent from the primary phone through Signal sync messages
- Discover contacts and groups synchronized by Signal
- Resolve contact, profile, and nickname fields across number/UUID aliases
- Hide archived contacts and groups by default, with an Archived list in the UI
- Send text messages to direct contacts and groups
- Send read receipts when a conversation is opened and display delivery/read state on sent messages
- Send and receive typing indicators
- Edit and delete outgoing messages for everyone
- Receive photos and videos inline, including HTTP range support for video playback
- React to messages and remove your own reactions
- Reply to messages with Signal quotes and display received quotes
- Display received link previews and attach a minimal preview to sent URLs
- Configure disappearing-message timers globally or per conversation
- Track unread counts and per-recipient group delivery/read/viewed state
- Archive and unarchive chats locally, with a dedicated archived-chats view
- Display synchronized contact and group avatars with initial fallbacks
- Compose from the contact list and create new Signal groups
- Keypad-first main menu and chat options, with no manual refresh action
- CloudPhone-conventional left Menu/Options and right Back/Exit soft keys
- Signal-style circular sent, delivered, and read indicators
- Quick, learned-favourite, and categorized emoji reactions
- A dedicated Note to Self conversation and icon
- Inline system notices when disappearing-message timers change
- Save drafts, search cached messages, restore scroll position, paginate older messages, and show date/unread dividers
- Receive and send voice notes when CloudPhone AudioCapture is available
- Display stickers, mentions, styled text, spoilers, and protected view-once media
- Create, vote in, and close polls
- Pin and unpin messages, with a multi-pin carousel under Chat options
- Favourite conversations and show full message timestamps on demand
- Inspect and verify safety numbers, accept/delete message requests, and block contacts or groups
- Manage group details, members, admins, permissions, invite links, invitations, and leaving
- Automatically update stable signal-cli releases with checksum validation, staged activation, health checking, and rollback
- QVGA layout with D-pad, Enter, soft-key, and desktop-keyboard navigation
- Password login, signed HTTP-only session cookie, login throttling, same-origin checks, and a
  restrictive content security policy

Sending arbitrary attachments, calling, and full history synchronization are not implemented. Signal CLI does not currently expose
Signal's linked-device recent-history transfer and does not maintain a message-history table;
the local cache therefore starts with messages received or sent after this endpoint is linked.

Photos and videos are decrypted by `signal-cli` and served only through an authenticated app
route. The original files remain in the protected `./data` volume. Edit and remote-delete
availability is also subject to Signal's normal time limits and permissions.

## How it works

SigDumb links to an existing Signal account as a secondary device. `signal-cli` handles Signal's
protocol and encrypted transport inside the container. The Node service converts received events
into a small local message cache and exposes an authenticated web UI designed for D-pad and
soft-key navigation. CloudPhone loads that web UI as a remotely hosted widget.

All linked-device keys, cached messages, and downloaded media stay in the deployment's `./data`
directory. Nothing is sent to a SigDumb-operated cloud service.

## Self-hosted deployment

Requirements:

- Docker Engine with Compose
- A domain or subdomain pointing to your NAS/reverse proxy
- A reverse proxy providing HTTPS (Caddy, Nginx Proxy Manager, Traefik, Synology, etc.)
- An x86-64 NAS. The native `signal-cli` updater currently targets Linux x86-64.

Copy `.env.example` to `.env` and set the values. Generate a session secret with:

```sh
openssl rand -hex 32
```

Example `.env`:

```dotenv
ADMIN_PASSWORD=a-long-unique-password-from-your-password-manager
SESSION_SECRET=64-or-more-random-hex-characters
PUBLIC_ORIGIN=https://signal.example.com
DEVICE_NAME=SigDumb
SIGNAL_CLI_AUTO_UPDATE=true
SIGNAL_CLI_UPDATE_MIN_AGE_HOURS=24
```

Build and start:

```sh
docker compose up -d --build
docker compose logs -f cloudphone-signal
```

The Compose file deliberately binds the app only to `127.0.0.1:8787`. Configure your reverse
proxy to forward `https://signal.example.com` to `http://127.0.0.1:8787`. If the reverse proxy
runs in another container, put both services on a private Docker network and proxy to
`cloudphone-signal:8080` instead of publishing the port broadly.

Do not expose Signal CLI's internal port `7583`. The application binds it to the container's
loopback interface only.

## First link

1. Visit your public HTTPS URL and sign in using `ADMIN_PASSWORD`.
2. Choose **Generate QR**.
3. On your primary phone, open Signal → Settings → Linked devices → Link new device.
4. Scan the QR code and wait for the web UI to open the conversation list.

The QR code expires quickly. Generate another if linking times out.

For initial setup, the UI may also be opened directly at `http://127.0.0.1:8787`. Same-origin
API requests from that local address are accepted even when `PUBLIC_ORIGIN` names the eventual
HTTPS deployment. The secure production cookie still requires HTTPS unless you explicitly set
`COOKIE_SECURE=false` for local-only testing.

Signal state and the local message cache live under `./data`. Back this directory up securely.
It contains the linked device's private keys and plaintext cached messages. Anyone with this
directory or the web password may access your messages.

The container starts briefly as root to correct ownership of the bind-mounted `./data`
directory, then immediately drops to its unprivileged `node` user before starting Signal CLI
or the web service. This avoids NAS-specific UID/GID permission failures.

## CloudPhone controls

| Control | Action |
| --- | --- |
| D-pad up/down | Move focus |
| D-pad in reaction grids | Navigate by row and column |
| Centre/Enter | Activate or send |
| Left soft key / Left Shift | Open the contextual menu or options |
| Right soft key / Escape / Right Shift | Back, cancel, or exit |
| Backspace on an empty composer | Return to conversations |

Create an unpublished widget in the [CloudPhone developer portal](https://cloudphone.tech/my) with
the following values:

- Name: `SigDumb`
- URL: the HTTPS `PUBLIC_ORIGIN` configured above
- Icon: [`public/sigdumb.png`](public/sigdumb.png), resized to 80×80 if required

Add the phone's IMEI to the developer portal, enable CloudPhone developer mode, then reopen
CloudPhone. No credentials belong in the widget URL; authentication uses the secure session
cookie.

## Updating signal-cli

The image includes a checksum-pinned fallback binary, then checks the official stable GitHub
release channel at startup and every 24 hours. A release must be at least
`SIGNAL_CLI_UPDATE_MIN_AGE_HOURS` old and expose a SHA-256 asset digest. The updater downloads
to versioned storage under `/data`, validates the digest and reported version, starts the
candidate, and rolls back if its daemon health check fails. Set `SIGNAL_CLI_AUTO_UPDATE=false`
to retain only the bundled fallback. The active version and updater state appear in Settings.

## Security notes

- Put the service behind HTTPS. The default session cookie is `Secure` and will not work over
  plain HTTP.
- Do not put CloudPhone access behind HTTP Basic authentication alone; the app password remains
  necessary to protect API requests and establish an HTTP-only session.
- Restrict NAS administration separately, enable automatic security updates, and consider a
  VPN or an identity-aware reverse-proxy layer in addition to the app login.
- Sessions intentionally expire when the container restarts; sign in again after an update.
- `signal-cli` and this service decrypt Signal messages on the NAS. Signal's end-to-end
  encryption still protects transport, but the NAS becomes a trusted endpoint.

## Development

The web application uses plain browser JavaScript and CSS to keep the client small and friendly
to older CloudPhone browser engines.

```sh
npm install
npm test
```

Set `COOKIE_SECURE=false` only for local HTTP development. Production should retain the default.
