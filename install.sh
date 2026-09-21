#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Your GitHub repository, as "username/repository".
# The installer downloads the prebuilt page from this repo's releases.
# ─────────────────────────────────────────────────────────────────────────────
REPO="mihajlisinkil/wg-subscription-template"

LANG_CODE="fa"
VERSION="latest"
DEST_DIR="/var/lib/pasarguard/templates/subscription"
DEST_FILE="${DEST_DIR}/index.html"
ENV_FILE="/opt/pasarguard/.env"

usage() {
  cat <<'EOF'
Usage: install.sh [--lang en|fa|zh|ru] [--version latest|<tag>]

Examples:
  install.sh
  install.sh --lang en
  install.sh --lang fa --version v2.0.0
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --lang)
      if [[ $# -lt 2 ]]; then
        echo "Error: --lang needs a value (en|fa|zh|ru)." >&2
        exit 1
      fi
      LANG_CODE="$2"
      shift 2
      ;;
    --version)
      if [[ $# -lt 2 ]]; then
        echo "Error: --version needs a value (latest|<tag>)." >&2
        exit 1
      fi
      VERSION="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Error: unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

case "${LANG_CODE}" in
  en|fa|zh|ru) ;;
  *)
    echo "Error: invalid language '${LANG_CODE}'. Use one of: en, fa, zh, ru." >&2
    exit 1
    ;;
esac

if [[ -z "${VERSION}" ]]; then
  echo "Error: version cannot be empty. Use 'latest' or a release tag like 'v2.0.0'." >&2
  exit 1
fi

RELEASE_PATH="latest/download"
if [[ "${VERSION}" != "latest" ]]; then
  RELEASE_PATH="download/${VERSION}"
fi

if [[ "${REPO}" == YOUR-GITHUB-USERNAME/* ]]; then
  echo "Error: edit REPO at the top of install.sh and set it to your own GitHub repo." >&2
  exit 1
fi

URL="https://github.com/${REPO}/releases/${RELEASE_PATH}/${LANG_CODE}.html"
if [[ "${LANG_CODE}" == "fa" ]]; then
  URL="https://github.com/${REPO}/releases/${RELEASE_PATH}/index.html"
fi

mkdir -p "${DEST_DIR}"

# Download to a temporary file first. Writing straight to DEST_FILE would wipe
# the working page the moment the download fails, leaving users a blank page.
TMP_FILE="$(mktemp)"
trap 'rm -f "${TMP_FILE}"' EXIT

if command -v curl >/dev/null 2>&1; then
  curl -fsSL "${URL}" -o "${TMP_FILE}"
elif command -v wget >/dev/null 2>&1; then
  wget -q -O "${TMP_FILE}" "${URL}"
else
  echo "Error: neither curl nor wget is installed." >&2
  exit 1
fi

if [[ ! -s "${TMP_FILE}" ]]; then
  echo "Error: downloaded an empty file from ${URL}" >&2
  echo "Check that the release exists and has a '${LANG_CODE}' asset attached." >&2
  exit 1
fi

if ! grep -qi '<html' "${TMP_FILE}"; then
  echo "Error: the downloaded file is not an HTML page (got a 404 page or an error)." >&2
  echo "URL: ${URL}" >&2
  exit 1
fi

# Keep one rollback copy of the page that is currently live.
if [[ -s "${DEST_FILE}" ]]; then
  cp "${DEST_FILE}" "${DEST_FILE}.bak"
  echo "Previous template backed up to ${DEST_FILE}.bak"
fi

mv "${TMP_FILE}" "${DEST_FILE}"
chmod 644 "${DEST_FILE}"

mkdir -p "$(dirname "${ENV_FILE}")"
touch "${ENV_FILE}"

if grep -q '^CUSTOM_TEMPLATES_DIRECTORY=' "${ENV_FILE}"; then
  sed -i 's|^CUSTOM_TEMPLATES_DIRECTORY=.*|CUSTOM_TEMPLATES_DIRECTORY="/var/lib/pasarguard/templates/"|' "${ENV_FILE}"
else
  echo 'CUSTOM_TEMPLATES_DIRECTORY="/var/lib/pasarguard/templates/"' >> "${ENV_FILE}"
fi

if grep -q '^SUBSCRIPTION_PAGE_TEMPLATE=' "${ENV_FILE}"; then
  sed -i 's|^SUBSCRIPTION_PAGE_TEMPLATE=.*|SUBSCRIPTION_PAGE_TEMPLATE="subscription/index.html"|' "${ENV_FILE}"
else
  echo 'SUBSCRIPTION_PAGE_TEMPLATE="subscription/index.html"' >> "${ENV_FILE}"
fi

if command -v pasarguard >/dev/null 2>&1; then
  pasarguard restart
  echo "Installed template (${LANG_CODE}, ${VERSION}) and restarted PasarGuard."
else
  echo "Installed template (${LANG_CODE}, ${VERSION}) at ${DEST_FILE}."
  echo "pasarguard command not found, restart service manually."
fi
