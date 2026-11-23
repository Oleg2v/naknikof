#!/usr/bin/env bash
# Lighthouse reports for the deployed demo → docs/reports/lighthouse-{ru,he}-{mobile,desktop}.{html,json}
# usage: CHROME_PATH=/path/to/chrome bash scripts/lighthouse.sh [baseUrl]
set -euo pipefail
BASE="${1:-https://kolbassnik.kikkey.com}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/docs/reports"
mkdir -p "$OUT"
for lang in ru he; do
  for ff in mobile desktop; do
    preset=(); [ "$ff" = desktop ] && preset=(--preset=desktop)
    npx -y lighthouse@13 "$BASE/$lang/" --quiet "${preset[@]}" --form-factor="$ff" \
      --chrome-flags="--headless=new --no-sandbox" --output=html --output=json \
      --output-path="$OUT/lighthouse-$lang-$ff"
    mv "$OUT/lighthouse-$lang-$ff.report.html" "$OUT/lighthouse-$lang-$ff.html"
    mv "$OUT/lighthouse-$lang-$ff.report.json" "$OUT/lighthouse-$lang-$ff.json"
  done
done
