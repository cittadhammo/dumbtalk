# SigDumb

A small, self-hosted Signal linked-device client for QVGA CloudPhone feature phones. It runs
`signal-cli` privately inside the container and provides a password-protected, D-pad-first web
interface. It is unofficial and is not affiliated with Signal.

SigDumb supports contacts, groups, text and voice messages, replies, reactions, editing,
deletion, receipts, typing, archives, disappearing messages, polls, pins, inline media, search,
avatars, group management, and Signal safety numbers.

Signal does not provide linked devices with existing message history, so SigDumb only shows
messages received or sent after it is linked. Calls and sending arbitrary attachments are not
supported.

## Run it

You need Docker Compose on a Linux x86-64 host and an HTTPS reverse proxy. Copy `.env.example`
to `.env`, then set:

```dotenv
ADMIN_PASSWORD=a-long-unique-password
SESSION_SECRET=generate-with-openssl-rand-hex-32
PUBLIC_ORIGIN=https://signal.example.com
DEVICE_NAME=SigDumb
```

Start SigDumb:

```sh
docker compose up -d --build
docker compose logs -f cloudphone-signal
```

It listens on `127.0.0.1:8787` by default. Point your HTTPS reverse proxy at that address, open
the public URL, sign in, choose **Generate QR**, then scan it from Signal → Settings → Linked
devices. Never expose signal-cli's internal port `7583`.

Linked-device keys, cached messages, and decrypted media are stored in `./data`. Keep that
directory and `.env` private and backed up. Anyone with either the data or web password may be
able to read your messages.

The bundled signal-cli is automatically updated from stable releases with checksum validation,
health checking, and rollback. This matters because old versions can stop working with Signal.

## CloudPhone

Create an unpublished CloudPhone widget pointing to `PUBLIC_ORIGIN`, using
`public/sigdumb.png` as its icon. Add your phone's IMEI in the developer portal and enable
developer mode. The D-pad navigates, Centre selects, Left opens menus, and Right goes back.

## Development

```sh
npm install
npm test
```

The client uses plain JavaScript and CSS for compatibility with the CloudPhone browser. Use
`COOKIE_SECURE=false` only for local HTTP development.
