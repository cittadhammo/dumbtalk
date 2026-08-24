# DumbTalk

A small, self-hosted, D-pad-first messaging client for QVGA CloudPhone feature phones. Signal is
currently supported through a private `signal-cli` container; Telegram and other services are
planned. DumbTalk is unofficial and is not affiliated with Signal or CloudMosa.

DumbTalk supports contacts, groups, text and voice messages, replies, reactions, editing,
deletion, receipts, typing, archives, disappearing messages, polls, pins, inline media, search,
avatars, group management, and Signal safety numbers.

Signal does not provide linked devices with existing message history, so DumbTalk only shows
messages received or sent after it is linked. Calls and sending arbitrary attachments are not
supported.

## Run it

You need Docker Compose on a Linux x86-64 host and an HTTPS reverse proxy. Copy `.env.example`
to `.env`, then set:

```dotenv
WIDGET_TOKEN=generate-with-openssl-rand-base64-32-and-convert-to-base64url
PUBLIC_ORIGIN=https://signal.example.com
DEVICE_NAME=DumbTalk
```

Start DumbTalk:

```sh
docker compose up -d --build
docker compose logs -f cloudphone-signal
```

It listens on `127.0.0.1:8787` by default. Point your HTTPS reverse proxy at that address and
set the CloudPhone widget URL to `PUBLIC_ORIGIN/#WIDGET_TOKEN`. Open the widget, choose
**Generate QR**, then scan it from Signal → Settings → Linked devices. Never expose signal-cli's
internal port `7583`.

Linked-device keys, cached messages, and decrypted media are stored in `./data`. Keep that
directory and `.env` private and backed up. Anyone with either the data or `WIDGET_TOKEN` may be
able to read your messages. The fragment token is intentionally not sent in HTTP request paths,
DNS, or referrers; the client sends it only in same-origin API authorization headers.

The bundled signal-cli is automatically updated from stable releases with checksum validation,
health checking, and rollback. This matters because old versions can stop working with Signal.

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
