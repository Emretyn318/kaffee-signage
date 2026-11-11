#!/usr/bin/env bash
# Samsung Tizen paketini (KaffeeSignage.wgt) imzalayıp ../tizen/ klasörüne koyar.
# Gerekli: npm i tizen-tv-dev-cli (Tizen genel dağıtıcı sertifikasıyla imzalar)
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
TMP=$(mktemp -d); cp -r "$HERE/KaffeeSignage" "$TMP/"
node -e "require('tizen-tv-dev-cli').buildPackage.handleCommand('$TMP/KaffeeSignage','.wgt')" || true
sleep 2; cp "$TMP/KaffeeSignage.wgt" "$HERE/../tizen/"
SIZE=$(stat -c%s "$HERE/../tizen/KaffeeSignage.wgt")
VER=$(grep -o 'version="[0-9.]*"' "$HERE/KaffeeSignage/config.xml" | head -2 | tail -1 | cut -d'"' -f2)
printf '<?xml version="1.0" encoding="UTF-8"?>\n<widget>\n  <ver>%s</ver>\n  <size>%s</size>\n  <widgetname>KaffeeSignage</widgetname>\n</widget>\n' "$VER" "$SIZE" > "$HERE/../tizen/sssp_config.xml"
echo "OK: $SIZE bytes, v$VER"
# Kısa adres deposu (emretyn318.github.io) varsa oraya da kopyala
SHORT="$HERE/../../emretyn318.github.io"
if [ -d "$SHORT/.git" ]; then cp "$HERE/../tizen/KaffeeSignage.wgt" "$HERE/../tizen/sssp_config.xml" "$SHORT/"; echo "Kısa adrese de kopyalandı: $SHORT"; fi
