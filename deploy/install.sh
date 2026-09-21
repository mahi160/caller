#!/usr/bin/env bash
# Installs/updates caller as a systemd service on a Linux box, using the
# prebuilt binary from the latest GitHub Release (see .github/workflows/release.yml).
# Usage: curl -fsSL https://raw.githubusercontent.com/mahi160/caller/main/deploy/install.sh | sudo bash
set -euo pipefail

REPO="${CALLER_REPO:-mahi160/caller}"   # override: CALLER_REPO=you/caller curl ... | sudo bash
BRANCH="${CALLER_BRANCH:-main}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root (sudo)." >&2
  exit 1
fi

case "$(uname -m)" in
  x86_64) ARCH=amd64 ;;
  aarch64|arm64) ARCH=arm64 ;;
  *) echo "Unsupported architecture: $(uname -m)" >&2; exit 1 ;;
esac

echo "==> Fetching latest release for linux/${ARCH}"
ASSET_URL=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" \
  | grep "browser_download_url.*caller-linux-${ARCH}" \
  | cut -d '"' -f4)
if [ -z "$ASSET_URL" ]; then
  echo "Could not find a caller-linux-${ARCH} asset on the latest release of ${REPO}." >&2
  exit 1
fi

echo "==> Creating caller user and directories"
id -u caller >/dev/null 2>&1 || useradd --system --home /var/lib/caller --create-home caller
mkdir -p /opt/caller /etc/caller /var/lib/caller/pb_data
chown -R caller:caller /var/lib/caller

if [ ! -f /etc/caller/caller.env ]; then
  echo "==> Generating /etc/caller/caller.env with a random ADMIN_PASSWORD"
  echo "ADMIN_PASSWORD=$(openssl rand -hex 16)" > /etc/caller/caller.env
  chmod 600 /etc/caller/caller.env
  chown caller:caller /etc/caller/caller.env
fi

echo "==> Installing binary"
curl -fsSL "$ASSET_URL" -o /opt/caller/caller
chmod 755 /opt/caller/caller
chown caller:caller /opt/caller/caller

echo "==> Installing systemd unit"
curl -fsSL "https://raw.githubusercontent.com/${REPO}/${BRANCH}/deploy/caller.service" \
  -o /etc/systemd/system/caller.service
systemctl daemon-reload
systemctl enable --now caller
systemctl restart caller

echo "==> Done. Admin password: $(grep ADMIN_PASSWORD /etc/caller/caller.env | cut -d= -f2)"
echo "==> Check status: systemctl status caller"
