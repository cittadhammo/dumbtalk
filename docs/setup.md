# Setup and deployment

This guide starts with the container, then helps you make it reachable to CloudPhone's servers.
The CloudPhone itself does not fetch the widget—even on Wi-Fi. CloudMosa's servers fetch and
process the DOM, then send the result to the phone. A LAN address can therefore be used for the
owner's setup browser, but it can never be the final widget URL.

You do not need to open router ports, and doing so is usually not the easiest option.

## 1. Start DumbTalk

Install Docker Engine with the Compose plugin on a Linux x86-64 or ARM64 machine, then download
the small deployment file and start the published image:

```sh
mkdir dumbtalk
cd dumbtalk
curl -fsSLO https://raw.githubusercontent.com/samtate/dumbtalk/main/compose.yaml
curl -fsSLO https://raw.githubusercontent.com/samtate/dumbtalk/main/src/client/public/dumbtalk.png
docker compose up -d
```

Check startup with:

```sh
docker compose ps
docker compose logs -f cloudphone-signal
```

DumbTalk listens on port `8787`. From a browser on the same network, open:

```text
http://SERVER-LAN-IP:8787
```

The first browser to open a fresh installation claims it. DumbTalk generates a random access key,
saves it in `data/app/config.json`, and adds it after `#` in the browser address. Finish connecting
at least one messaging service.

Treat the complete address as a password. Anyone who has it may be able to read your messages.
Do not post it in screenshots, logs, chat, or issue reports.

### Connecting services

- **Signal:** scan the QR code from Signal's **Settings → Linked devices** screen.
- **WhatsApp:** scan a QR code or use the phone-number pairing option.
- **Telegram:** create an application at [my.telegram.org](https://my.telegram.org), then enter its
  numeric API ID and 32-character API hash when prompted. These identify DumbTalk as a Telegram
  client; the next screen links the account by QR code or phone number.

Credentials and sessions are stored inside `./data`, not in `.env`.

## 2. Choose how CloudPhone's servers reach DumbTalk

CloudPhone's processing servers need a stable, publicly reachable HTTPS address. Choose one of
the following paths. A private LAN address and ordinary Tailscale Serve are not valid widget
endpoints.

### A. Tailscale Funnel — simplest when behind CGNAT

Use Funnel when the server is already connected to Tailscale and you want a public HTTPS address
without forwarding router ports. Ordinary Tailscale Serve is private to your tailnet and generally
will not be reachable by a CloudPhone; **Funnel** is the public option.

Install Tailscale on the host, sign in, and then run:

```sh
sudo tailscale funnel --bg http://127.0.0.1:8787
```

Tailscale prints an `https://...ts.net` address. Availability and account requirements are
documented in the official [Tailscale Funnel guide](https://tailscale.com/kb/1223/funnel).

### B. Cloudflare Tunnel — stable domain without port forwarding

Use this when your DNS is on Cloudflare or you are comfortable moving a hostname there. A named
Cloudflare Tunnel provides a stable HTTPS hostname and works through CGNAT without inbound ports.

1. In Cloudflare Zero Trust, create a tunnel.
2. Install `cloudflared` on the DumbTalk host using the command Cloudflare provides.
3. Add a public hostname such as `chat.example.com`.
4. Point its service to `http://localhost:8787`.
5. Start the tunnel and verify `https://chat.example.com` opens DumbTalk.

Follow Cloudflare's current [tunnel setup guide](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-local-tunnel/).
Quick tunnels with random `trycloudflare.com` addresses are useful for testing but are not stable
enough for a permanent widget URL.

### C. Existing reverse proxy or public VPS

If you already run Caddy, nginx, Traefik, or a NAS reverse-proxy UI, create an HTTPS hostname and
proxy it to `http://127.0.0.1:8787` on the DumbTalk host.

For example, a Caddy site is:

```caddyfile
chat.example.com {
    reverse_proxy 127.0.0.1:8787
}
```

On a public VPS, point the hostname's DNS record at the VPS and allow ports 80 and 443 for the
reverse proxy. Keep DumbTalk itself off the public interface by creating a small `.env` file:

```dotenv
BIND_ADDRESS=127.0.0.1
```

Then recreate the container with `docker compose up -d`.

## 3. Build the CloudPhone widget URL

After choosing a public address, keep the generated fragment from the claimed local address.

For example, if onboarding claimed:

```text
http://192.168.1.20:8787/#YOUR_GENERATED_KEY
```

and your public address is:

```text
https://chat.example.com
```

the widget URL is:

```text
https://chat.example.com/#YOUR_GENERATED_KEY
```

Open that complete URL from a device outside your home network, such as a phone with Wi-Fi
disabled. If it loads DumbTalk without showing a configuration error, CloudPhone's servers should
also be able to reach it.

## 4. Add it to CloudPhone

1. Create an unpublished widget in the CloudPhone developer portal.
2. Use the complete public URL, including the `#` access key, as the widget URL.
3. Upload the `dumbtalk.png` file downloaded during installation as the icon.
4. Add the phone's IMEI in the developer portal.
5. Enable developer mode on the phone and open the widget.

The D-pad navigates, Centre selects, Left opens menus, and Right goes back.

## Updates and backups

Update the application with:

```sh
docker compose pull
docker compose up -d
```

Back up the entire `data` directory. It contains the generated access key, linked-device keys,
Telegram and WhatsApp sessions, cached messages, and decrypted media. Anyone with this backup may
be able to access your messages.

The bundled `signal-cli` automatically checks stable releases, validates checksums, health-checks
updates, and rolls back failures. `wacli` is installed from a checksum-verified pinned release.

## Optional configuration

No `.env` file is required. Copy `.env.example` to `.env` only when you need to override defaults.
Common examples are `BIND_ADDRESS`, `HOST_PORT`, and `DEVICE_NAME`. Environment-provided access
tokens and Telegram credentials remain supported for automated deployments and take precedence
over first-run values.
