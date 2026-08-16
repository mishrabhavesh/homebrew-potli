#!/usr/bin/env bash
# Rebuilds a flat (component-less) APT repository in place: copies in the
# newest .deb files, regenerates the Packages index, and produces a
# detached-signed Release plus an inline-signed InRelease so both older and
# newer apt clients can verify the repo.
#
# This repo is a single "latest" channel, not a version archive — old .debs
# are replaced rather than accumulated on every run, the same way the
# Homebrew tap only ever tracks the current version. That keeps the repo's
# working tree small; note it does NOT shrink git history, since every past
# .deb blob that was ever committed stays in history unless it's rewritten.
#
# Requires: dpkg-scanpackages (dpkg-dev), gpg, a signing key already
# imported into the active GPG keyring (GPG_KEY_ID selects it).
#
# Usage: GPG_KEY_ID=<fpr> update-apt-repo.sh <apt-repo-dir> <deb-file>...
set -euo pipefail

REPO_DIR="${1:?usage: update-apt-repo.sh <apt-repo-dir> <deb-file>...}"
shift
DEBS=("$@")

if [ ${#DEBS[@]} -eq 0 ]; then
  echo "No .deb files given" >&2
  exit 1
fi

if [ -z "${GPG_KEY_ID:-}" ]; then
  echo "GPG_KEY_ID env var must be set to the signing key's fingerprint/ID" >&2
  exit 1
fi

mkdir -p "$REPO_DIR/pool"
rm -f "$REPO_DIR"/pool/*.deb
for deb in "${DEBS[@]}"; do
  cp "$deb" "$REPO_DIR/pool/"
done

cd "$REPO_DIR"

dpkg-scanpackages --multiversion pool /dev/null > Packages
gzip -9c Packages > Packages.gz

DATE="$(date -Ru)"
cat > Release << EOF
Origin: Potli
Label: Potli
Suite: stable
Codename: stable
Architectures: amd64 arm64
Components: main
Description: Potli — your little bundle of everything you copy
Date: $DATE
EOF

# stat's size flag differs between GNU (Linux CI runners) and BSD (macOS) —
# try GNU first, fall back to BSD, so this also works if ever run locally.
file_size() {
  stat -c%s "$1" 2>/dev/null || stat -f%z "$1"
}

HASHFILE="$(mktemp)"
trap 'rm -f "$HASHFILE"' EXIT
for f in Packages Packages.gz; do
  size=$(file_size "$f")
  md5=$(md5sum "$f" | awk '{print $1}')
  sha1=$(sha1sum "$f" | awk '{print $1}')
  sha256=$(sha256sum "$f" | awk '{print $1}')
  echo "$f $size $md5 $sha1 $sha256"
done > "$HASHFILE"

{
  echo "MD5Sum:"
  awk '{printf " %s %16d %s\n", $3, $2, $1}' "$HASHFILE"
  echo "SHA1:"
  awk '{printf " %s %16d %s\n", $4, $2, $1}' "$HASHFILE"
  echo "SHA256:"
  awk '{printf " %s %16d %s\n", $5, $2, $1}' "$HASHFILE"
} >> Release

gpg --batch --yes --pinentry-mode loopback --local-user "$GPG_KEY_ID" -abs -o Release.gpg Release
gpg --batch --yes --pinentry-mode loopback --local-user "$GPG_KEY_ID" --clearsign -o InRelease Release

# Keep the committed public key in sync with whatever key actually signed
# this run, so a stale/mismatched keyring file can never silently ship.
gpg --batch --yes --armor --export "$GPG_KEY_ID" > potli-archive-keyring.asc
gpg --batch --yes --export "$GPG_KEY_ID" > potli-archive-keyring.gpg

echo "APT repo updated in $REPO_DIR:"
# Already `cd`'d into $REPO_DIR above — reference paths from here, not from
# the original (now stale, and wrong if $REPO_DIR was relative) prefix.
ls -la pool Packages* Release* InRelease potli-archive-keyring.*
