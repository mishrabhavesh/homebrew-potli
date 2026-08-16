# Sharing Potli as a downloadable Mac app

## 1. Build it

On your Mac (this has to run on macOS, not in a cloud sandbox — it needs Apple's
`codesign`/`hdiutil` tools):

```bash
cd ~/Documents/copy_clip
npm run package:mac
```

This produces, inside `release/`:

- `Potli-<version>-arm64.dmg` — for Apple Silicon Macs (M1/M2/M3/M4)
- `Potli-<version>-x64.dmg` — for Intel Macs
- matching `.zip` files (useful for auto-update tooling later; you can ignore these for now)

Each `.dmg` already opens as the classic "drag the app icon onto the Applications
folder" installer window — that layout is already configured in
`electron-builder.yml`, no extra work needed there.

If you're not sure which Mac someone has, send them both `.dmg` files, or just the
`arm64` one — every Mac sold since late 2020 is Apple Silicon.

## 2. Why recipients will see a security warning

You don't have an Apple Developer Program account ($99/year), so this build is
**unsigned**. macOS Gatekeeper checks every downloaded app against Apple's
notarization service, and an unsigned app fails that check — this is the exact
"Potli is damaged and can't be opened" / "malware blocked" dialog you ran into
earlier with your own dev build. It's not a bug in the app; it's macOS being
cautious about software with no verified publisher. **Every recipient will hit
this**, not just you.

There's no free way around this for public distribution — Apple's notarization
service is only available to paid Developer Program members. The two real options
are: pay for the account and I'll wire up proper code signing + notarization
(zero warnings for anyone), or share it unsigned and tell people how to open it
(below). You can always add signing later without changing anything else about
the app.

## 3. What to tell people you send it to

Include this alongside the download link — most people will otherwise assume
the app is broken or malicious and give up.

> **First time opening Potli:**
> 1. Open the `.dmg` and drag **Potli** into **Applications**.
> 2. Don't double-click it yet — instead, open **Applications** in Finder,
>    **right-click (or Control-click) Potli**, and choose **Open**.
> 3. A dialog will appear warning it's from an unidentified developer — click
>    **Open** again. This confirmation is only needed the first time.
>
> If instead you see **"Potli is damaged and can't be opened"**, that's
> Gatekeeper's quarantine flag on the download, not actual damage. Open
> **Terminal** and run:
> ```
> xattr -cr /Applications/Potli.app
> ```
> Then try opening it again as in step 2.

## 4. If you ever want the seamless version

With an Apple Developer Program membership, come back and I'll add:

- Code signing with your Developer ID certificate (`electron-builder`'s
  `mac.identity` + `CSC_LINK`/`CSC_KEY_PASSWORD` env vars)
- Automatic notarization via `@electron/notarize` in an `afterSign` hook, using
  an app-specific Apple ID password (never your real password, and never
  shared with me — it stays in your local environment)

At that point recipients just double-click the `.dmg`, drag to Applications, and
open it — no warnings, no Terminal commands.
