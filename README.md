# DumbTalk

A small, self-hosted, D-pad-first messaging client for QVGA CloudPhone feature phones. Signal,
Telegram, and WhatsApp share one inbox; each account remains in its own isolated service data
directory. DumbTalk is unofficial and is not affiliated with Signal, Telegram, WhatsApp, or
CloudMosa.

DumbTalk supports contacts, groups, text and voice messages, replies, reactions, editing,
deletion, receipts, typing, synced archives, disappearing messages, polls, pins, inline media,
attachments, cross-service forwarding, search, avatars, group management, and Signal safety
numbers. Menus hide operations that a service does not support.

Signal does not provide linked devices with existing message history, so DumbTalk only shows
messages received or sent after it is linked. Calls are not supported.

## Run it

You need Docker Compose on a Linux x86-64 host and an HTTPS reverse proxy. Copy `.env.example`
to `.env`, then set:

```dotenv
WIDGET_TOKEN=generate-with-openssl-rand-base64-32-and-convert-to-base64url
PUBLIC_ORIGIN=https://signal.example.com
DEVICE_NAME=DumbTalk
TELEGRAM_API_ID=123456
TELEGRAM_API_HASH=your-api-hash
WACLI_DEVICE_LABEL=DumbTalk
```

The Telegram values are optional and come from [my.telegram.org](https://my.telegram.org). Leave
them empty if you do not use Telegram. WhatsApp uses the bundled `wacli` linked-device client and
needs no API credentials.

Start DumbTalk:

```sh
docker compose up -d --build
docker compose logs -f cloudphone-signal
```

It listens on `127.0.0.1:8787` by default. Point your HTTPS reverse proxy at that address and
set the CloudPhone widget URL to `PUBLIC_ORIGIN/#WIDGET_TOKEN`. Connect services from DumbTalk’s
Services screen. Signal and WhatsApp use linked-device QR codes; Telegram supports either its
Devices QR or a phone number, Telegram login code, and optional two-step-verification password.
Never expose signal-cli's internal port `7583`.

Signal linked-device keys, Telegram and WhatsApp sessions, cached messages, and decrypted media
are stored in `./data`. Keep that directory and `.env` private and backed up. Anyone with either the data or `WIDGET_TOKEN` may be
able to read your messages. The fragment token is intentionally not sent in HTTP request paths,
DNS, or referrers; the client sends it only in same-origin API authorization headers.

The bundled signal-cli is automatically updated from stable releases with checksum validation,
health checking, and rollback. This matters because old versions can stop working with Signal.
`wacli` is installed from a checksum-verified official release archive. Update the pinned release
version when you rebuild the image to pick up a newer WhatsApp bridge.

## CloudPhone

Create an unpublished CloudPhone widget pointing to `PUBLIC_ORIGIN/#WIDGET_TOKEN`, using
`src/client/public/dumbtalk.png` as its icon. Add your phone's IMEI in the developer portal and enable
developer mode. The D-pad navigates, Centre selects, Left opens menus, and Right goes back.

## Development

```sh
npm install
npm test
```

The client uses Preact, TypeScript and SCSS modules, compiled to browser-compatible static assets.
