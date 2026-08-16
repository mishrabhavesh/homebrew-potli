cask "potli" do
  arch arm: "-arm64", intel: ""

  version "0.1.0"
  sha256 arm:   "0000000000000000000000000000000000000000000000000000000000000",
         intel: "0000000000000000000000000000000000000000000000000000000000000"

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
