# WireGuard Subscription Template

A subscription page for [PasarGuard](https://github.com/PasarGuard/panel) panels that serve
**WireGuard configs only**. Customers download `.conf` files or scan a QR code — there is
nothing to copy and paste.

Forked from [PasarGuard/subscription-template](https://github.com/PasarGuard/subscription-template).

## What is different from upstream

| | Upstream | This fork |
| --- | --- | --- |
| Subscription link row | Shown, with copy + QR | Removed |
| Section heading | *Configuration Links* | *Download Configs* |
| Header action | *Copy All Configs* | *Download All Configs* (downloads every `.conf`) |
| Per-config actions | Copy, QR, Download | **Download Config** and **QR Code**, both labelled |
| QR modal | Copy config, Copy Base64, Download | QR + **Download Config** |

Everything else — the status card, usage chart, traffic stats, app list, the four languages,
dark mode and RTL — is unchanged.

Two extra fixes on top of upstream:

- Configs sharing a remark no longer overwrite each other on download (`TR.conf`, `TR-2.conf`).
- `install.sh` downloads to a temporary file and validates it, so a failed download can never
  blank out the page your customers are looking at. It also keeps a `.bak` rollback copy.

## Quick install

On the server running your PasarGuard panel:

```sh
curl -fsSL https://raw.githubusercontent.com/mihajlisinkil/wg-subscription-template/main/install.sh \
  | sudo bash -s -- --lang fa
```

`--lang` accepts `en`, `fa`, `zh`, `ru`. `--version` accepts `latest` (default) or a release
tag such as `v1.0.0`.

The installer downloads the prebuilt page from this repository's releases, writes it to
`/var/lib/pasarguard/templates/subscription/index.html`, points the panel at it, and restarts
PasarGuard. The server never needs Node or Bun.

## Manual install

```sh
sudo mkdir -p /var/lib/pasarguard/templates/subscription
sudo curl -fsSL -o /var/lib/pasarguard/templates/subscription/index.html \
  https://github.com/mihajlisinkil/wg-subscription-template/releases/latest/download/index.html
```

Then in `/opt/pasarguard/.env`:

```dotenv
CUSTOM_TEMPLATES_DIRECTORY="/var/lib/pasarguard/templates/"
SUBSCRIPTION_PAGE_TEMPLATE="subscription/index.html"
```

And restart:

```sh
pasarguard restart
```

## Publishing a new version

The release workflow builds one self-contained HTML file per language and attaches them to the
release — `index.html` (Persian, the default), `en.html`, `ru.html`, `zh.html`.

1. Push your changes to `main`.
2. On GitHub: **Releases → Draft a new release**, create a tag such as `v1.0.0`, publish it.
3. Wait for the **Release** workflow to finish, then run the install command above.

The workflow only runs on a published release, not on a bare tag.

## Build from source

```sh
bun install
VITE_FALLBACK_LANGUAGE=fa bun run build
sudo cp dist/index.html /var/lib/pasarguard/templates/subscription/index.html
```

## Appearance

Set these in `.env` before building:

```dotenv
VITE_PRIMARY_COLOR_LIGHT=oklch(0.48 0.11 250)
VITE_PRIMARY_COLOR_DARK=oklch(0.60 0.12 250)
VITE_BORDER_RADIUS=0.65rem
VITE_FALLBACK_LANGUAGE=fa
```

## Other languages

- [فارسی (Persian)](README.fa.md)
