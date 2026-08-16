# Auto-publish to Homebrew + APT on push to `main`

**Your setup:** everything — app source, CI workflow, and the Homebrew Cask —
lives in one repo, named `homebrew-potli`. That works fine: Homebrew only
requires the repo be named `homebrew-<tapname>` and contain `Casks/<name>.rb`
somewhere in it; it doesn't care what else is in there. (The only downside is
`brew tap` clones your whole repo, app source included, not just the tiny Cask
file — a small one-time download cost for anyone who taps it, not a
functional problem.) Everything below assumes this single-repo setup.

This wires up `.github/workflows/release-homebrew.yml` so that bumping
`version` in `package.json` and pushing to `main` automatically:

1. builds the unsigned macOS DMGs (arm64 + Intel) on a GitHub-hosted macOS runner
2. builds the unsigned Linux `.deb` and AppImage (x64 + arm64) on a Linux runner
3. publishes a GitHub Release in this repo with all of the above attached
4. updates `Casks/potli.rb` **in this same repo** with the new version and
   checksums, and pushes that commit — no separate tap repo, no extra token
   needed for this part; the workflow's own `GITHUB_TOKEN` can already push
   back to the repo it's running in
5. rebuilds and re-signs your separate **`apt-potli`** repo with the new `.deb`s
   (this one genuinely does need to be a separate repo — see below — since it's
   published via GitHub Pages, not `brew tap`), so `sudo apt update && sudo apt
   upgrade` picks up the new version too

A plain push to `main` that doesn't change `version` is a fast no-op — the
workflow checks whether a release for the current version already exists
and exits early if so, so it's safe to push docs/refactor commits without
triggering a build.

## One-time setup — Homebrew

None. Genuinely nothing to configure — just make sure `Casks/potli.rb` exists at
your repo's root (not nested under a `tap/` or similar folder) before the first
run, since the workflow reads/writes it at that exact path. If it's missing,
this is the version to add:

```ruby
cask "potli" do
  arch arm: "-arm64", intel: ""

  version "0.1.0"
  sha256 arm:   "e72fb44999a557179c01000759973428c7bb83646b500ecc937aa4db0a6ecee6",
         intel: "961cfe0138215021b80b4c58b9176454b6d7ff5470793e4ee0e8b68a38fb4f90"

  url "https://github.com/mishrabhavesh/homebrew-potli/releases/download/v#{version}/Potli-#{version}#{arch}.dmg"
  name "Potli"
  desc "Screenshot-to-text OCR utility — your little bundle of everything you copy"
  homepage "https://github.com/mishrabhavesh/homebrew-potli"

  app "Potli.app"

  zap trash: [
    "~/Library/Application Support/Potli",
    "~/Library/Preferences/com.potli.app.plist",
    "~/Library/Saved Application State/com.potli.app.savedState",
    "~/Library/Caches/com.potli.app"
  ]

  caveats <<~EOS
    Potli isn't code-signed or notarized by Apple, so the first time you open
    it macOS Gatekeeper will say it "can't be opened" or "is damaged."

    Run this once after installing (or after each upgrade):
      xattr -dr com.apple.quarantine "#{appdir}/Potli.app"

    Then open Potli as usual — Gatekeeper won't ask again for this copy.
  EOS
end
```

(The `version`/`sha256` values above are placeholders — CI overwrites them on
every release. They just need to be valid Ruby syntax to start with.)

Once that file exists at `Casks/potli.rb`, push the workflow itself:

```
git add .github/workflows/release-homebrew.yml scripts/update-cask.js scripts/update-apt-repo.sh CI_CD_SETUP.md Casks/potli.rb
git commit -m "Add CI/CD: auto-publish to Homebrew + APT on version bump"
git push
```

That's it — no version bump happened in that push, so this first push just
installs the workflow; it won't try to build/release anything yet.

## One-time setup — APT repo

This is a bigger lift than Homebrew: a real APT repo needs a GPG key to sign it, so
apt can verify what it downloads is actually from you. Do this once.

### 1. Create the `apt-potli` repo and enable GitHub Pages

1. Create a new **public** GitHub repo named `apt-potli` (same account as `potli`).
   It needs to be public — GitHub Pages on a private repo requires a paid plan, and
   the whole point is anonymous `apt update` access without auth.
2. Push the starter files (the `apt-potli-template/` I sent you: `README.md` and an
   empty `pool/` folder) as its first commit on `main`.
3. In that repo: **Settings → Pages → Source → Deploy from a branch → Branch:
   `main` / `(root)` → Save.** GitHub will give you a URL like
   `https://YOUR_GITHUB_USERNAME.github.io/apt-potli/` — it can take a minute or two
   to go live the first time.

### 2. Generate a signing key — do this locally, not by asking an AI to do it for you

This key can sign packages your users' machines will trust and install as root, so
it shouldn't pass through any third party (including any AI assistant) — generate
and hold it yourself. Run this on your own Mac:

```bash
gpg --batch --gen-key << 'EOF'
%no-protection
Key-Type: RSA
Key-Length: 4096
Name-Real: Potli Release Signing
Name-Email: YOUR_GITHUB_USERNAME@users.noreply.github.com
Expire-Date: 2y
%commit
EOF
```

`%no-protection` means no passphrase — this key only ever runs unattended inside
GitHub Actions, where there's no human to type one in. Its real protection is that
it only exists as a GitHub Actions secret (see below), scoped to this one repo's
workflow. `Expire-Date: 2y` means you'll need to regenerate and replace it in two
years; set yourself a reminder.

```bash
KEY_ID=$(gpg --list-secret-keys --with-colons | awk -F: '/^sec/{print $5; exit}')
echo "Key ID: $KEY_ID"

# Public key — this is safe to publish; it's what apt uses to verify
# signatures, not to create them.
gpg --armor --export "$KEY_ID" > potli-archive-keyring.asc

# Private key — this one's the actual secret. Base64-encode it only so it
# survives being pasted into GitHub's single-line secret field intact.
gpg --armor --export-secret-keys "$KEY_ID" | base64 | tr -d '\n' > apt-signing-key.b64
```

Commit `potli-archive-keyring.asc` into the `apt-potli` repo (root level, next to
`README.md`) and push it — this one file is meant to be public. **Do not commit
`apt-signing-key.b64` anywhere** — it goes into a GitHub secret in the next step,
then you should delete the local file.

### 3. Add the secrets on the `homebrew-potli` repo (the one with the workflow)

**Settings → Secrets and variables → Actions → New repository secret**, twice:

- Name: `APT_GPG_PRIVATE_KEY` — Value: the full contents of `apt-signing-key.b64`
- Name: `APT_REPO_TOKEN` — Value: a fine-grained PAT scoped to the `apt-potli` repo
  with **Contents: Read and write** (Settings → Developer settings → Personal access
  tokens → Fine-grained tokens → Generate new token → Repository access: Only
  select repositories → `apt-potli` → Permissions: Contents → Read and write)

Once both secrets exist, delete `apt-signing-key.b64` and
`potli-archive-keyring.asc` from your local machine (or at least out of any
directory that might get committed somewhere unintended) — the only copies that
need to persist are the GitHub secret and the public key already pushed to
`apt-potli`.

## Shipping a new version from now on

```
# bump the version
npm version patch   # or minor / major — updates package.json for you
git push && git push --tags   # `npm version` also creates a tag; pushing main is what matters here
```

Or just hand-edit `"version"` in `package.json`, commit, and push to `main`.
Either way, watch it run under the repo's **Actions** tab. When it's green:

- `homebrew-potli` repo (this one) → a new `vX.Y.Z` release with the DMGs, `.deb`s,
  and AppImages attached, and `Casks/potli.rb` auto-updated and pushed
- `apt-potli` repo → `pool/`, `Packages*`, `Release*`, `InRelease` regenerated and pushed

Anyone who already ran `brew tap mishrabhavesh/potli` just needs `brew upgrade
--cask potli`, and anyone with the `apt-potli` source added just needs `sudo apt
upgrade` — no manual steps on your end beyond the version bump.

## Notes / things worth knowing

- **Still unsigned.** This automates the *publishing* steps from
  `HOMEBREW_PUBLISHING.md`, not code signing. Users installing via `brew`
  still need the one-time `xattr -dr com.apple.quarantine` step documented
  in the cask's `caveats` block — that hasn't changed.
- **Why macOS, and why one runner builds both architectures**: `runs-on:
  macos-14` is an Apple-Silicon GitHub-hosted runner. `electron-builder`'s
  `mac.target` in `electron-builder.yml` already lists `arch: [arm64, x64]`
  for the dmg target, so a single `npm run package:mac` on that one arm64
  runner produces *both* DMGs — the same thing that happens when you build
  locally on your M-series Mac. No Intel runner or build matrix is needed.
- **First run will likely need a manual nudge.** The very first time this
  runs, `Casks/potli.rb` still has the version/checksums you set by hand. If
  they already happen to match the current `package.json` version, the
  workflow's `update-tap` job will see no diff and just skip the commit —
  that's expected, not a bug.
- **The `update-tap` job needs no secret at all** — it pushes back into the
  same repo the workflow lives in, using the workflow's own `GITHUB_TOKEN`
  (already granted `contents: write` at the top of the file). If it ever
  fails at the checkout or push step, it's almost certainly because
  `Casks/potli.rb` doesn't exist at the repo root yet, not a missing secret.
- **The APT repo is a "latest" channel, not a version archive.** Every publish
  replaces `apt-potli/pool/*.deb` rather than adding to it — old versions stop
  being installable from the repo once a new one ships (matches how the Homebrew
  cask also only ever points at the current version). Git history still keeps
  every past `.deb` blob that was ever committed, so `apt-potli`'s `.git` folder
  will grow over time even though its working tree stays small; if that becomes
  annoying, its history can be periodically squashed.
- **If `APT_GPG_PRIVATE_KEY` or `APT_REPO_TOKEN` is missing/wrong**, only the
  `update-apt-repo` job fails — the GitHub Release, Homebrew tap, and everything
  else still publish fine. Same recovery as above: fix the secret, rerun the
  failed job.
- **Rotating the GPG key later** (expiry, or just wanting to replace it): generate
  a new key the same way, update `APT_GPG_PRIVATE_KEY`, and the next release will
  sign with it and overwrite `potli-archive-keyring.asc`/`.gpg` in `apt-potli`
  automatically — but everyone who already ran the `gpg --dearmor` install step
  has the *old* public key cached at `/usr/share/keyrings/potli-archive-keyring.gpg`
  and needs to re-run that one line to pick up the new key, or their next `apt
  update` will fail signature verification. Worth a heads-up if you ever rotate it.
- **Want it to run on every push to main, no gate?** You explicitly asked
  for "auto publish when we push to main," so that's the trigger — but
  publishing a release on *every* commit (not just version bumps) would
  spam `homebrew-potli` with duplicate tags/releases and fail on the second
  push in a row (the tag would already exist). The version-check gate is
  there to make "push to main" safe to do constantly while only actually
  publishing on real version bumps. If you'd rather trigger strictly on
  pushed tags (`v*.*.*`) instead of every push to `main`, that's a one-line
  change to the `on:` block — say the word and I'll switch it.
