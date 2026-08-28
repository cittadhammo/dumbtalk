# DumbTalk

DumbTalk is a small, self-hosted, D-pad-first messaging client for QVGA CloudPhone feature
phones. Signal, Telegram, and WhatsApp share one inbox while each account remains isolated in its
own service data directory.

It supports contacts, groups, text and voice messages, replies, reactions, editing, deletion,
receipts, typing, synced archives, disappearing messages, polls, pins, inline media, attachments,
cross-service forwarding, search, avatars, group management, and Signal safety numbers. Menus
hide operations that a service does not support.

DumbTalk is unofficial and is not affiliated with Signal, Telegram, WhatsApp, or CloudMosa.

## Get started

You need a Linux x86-64 or ARM64 host with Docker Compose. Download the deployment file and start
the published image—no source checkout or local build is required.

```sh
mkdir dumbtalk
cd dumbtalk
curl -fsSLO https://raw.githubusercontent.com/samtate/dumbtalk/main/compose.yaml
curl -fsSLO https://raw.githubusercontent.com/samtate/dumbtalk/main/src/client/public/dumbtalk.png
docker compose up -d
```

Open `http://YOUR-SERVER-IP:8787`. The first browser to open a new installation claims it and
receives a generated access key. DumbTalk then guides you through connecting a messaging service.
No `.env` file is required.

The local address is only for configuring DumbTalk in your browser. CloudPhone's servers—not the
phone itself—fetch and process the widget, so the final widget URL must be publicly reachable.

For public HTTPS, CGNAT-friendly options, and the CloudPhone developer-site steps,
follow **[Setup and deployment](docs/setup.md)**.

## Important limitations

- Signal cannot sync earlier history to a newly linked device. DumbTalk shows only messages sent
  or received after linking.
- Calls are not supported.
- Telegram requires an API ID and API hash from
  [my.telegram.org](https://my.telegram.org); DumbTalk asks for them only when Telegram is selected.
- Signal keys, Telegram and WhatsApp sessions, messages, configuration, and decrypted media live
  in `./data`. Keep this directory private and backed up.

## Development

```sh
npm install
npm test
npm run typecheck:client
npm run build:client
```

The client uses Preact, TypeScript, and SCSS modules compiled to browser-compatible static assets.
See [service adapter notes](docs/service-adapters.md) for the internal service contract.

Commits to `main` are tested and published for AMD64 and ARM64 as
[`samtate96/dumbtalk:latest`](https://hub.docker.com/r/samtate96/dumbtalk). The repository must define
`DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` GitHub Actions secrets.
