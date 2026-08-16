cask "potli" do
  arch arm: "-arm64", intel: ""

  version "0.2.1"
  sha256 arm:   "895a7597d2dab71edb3de1390d9a4538ef24e28c237ef943648e29d893b83a04",
         intel: "dc57a31c0d50f62e9cb791cb491ea1d4b2a25198c3b75b131bc55d15dcc59568"

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
