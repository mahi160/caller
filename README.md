# caller

Tea/coffee/chanachur call system. See `CONTEXT.md` for domain terms and `docs/adr/` for architecture decisions.

## Run (local dev)

```sh
cd server && go run . serve
```

Server listens on `:8090`. Health check: `GET /healthz`.

## Deploy (systemd)

Single static Go binary, no container runtime needed.

```sh
curl -fsSL https://raw.githubusercontent.com/mahi160/caller/main/deploy/install.sh | sudo bash
```

Installs the latest [release](../../releases) binary for your architecture (amd64/arm64), creates a
dedicated `caller` user, generates `/etc/caller/caller.env` with a random `ADMIN_PASSWORD` on first run,
and starts it via systemd. Re-run the same command to update to a newer release.

To build and install manually instead (e.g. no GitHub release yet, or building from a local checkout):

```sh
sudo useradd --system --home /var/lib/caller --create-home caller
sudo mkdir -p /opt/caller /etc/caller
sudo install -m 600 -o caller -g caller /dev/null /etc/caller/caller.env
echo "ADMIN_PASSWORD=$(openssl rand -hex 16)" | sudo tee /etc/caller/caller.env

cd server && go build -o caller .
sudo install -m 755 -o caller -g caller caller /opt/caller/caller
sudo cp ../deploy/caller.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now caller
```

To redeploy after a code change: rebuild the binary, then
`sudo systemctl stop caller && sudo install -m 755 -o caller -g caller caller /opt/caller/caller && sudo systemctl start caller`.

## Backup / move

All state lives in `/var/lib/caller/pb_data` (SQLite file + PocketBase auxiliary data). To move the whole app to another server:

```sh
tar -C /var/lib/caller/pb_data -czf caller-data.tgz .
# on the new host, after the one-time setup above
tar -C /var/lib/caller/pb_data -xzf caller-data.tgz
sudo systemctl start caller
```
