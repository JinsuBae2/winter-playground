#!/bin/sh
# assets/*.png 원본을 게임이 쓰는 가벼운 assets/web/*.webp 로 바꾼다. 원본은 건드리지 않는다.
# 새 이미지를 assets/ 에 넣은 뒤 `npm run assets` 로 다시 돌린다. cwebp 필요(brew install webp).
set -e
cd "$(dirname "$0")/../assets"
mkdir -p web
for f in *.png; do
  n="${f%.png}"
  case "$n" in
    icon) for s in 180 192 512; do sips -s format png -z $s $s "$f" --out "web/icon-$s.png" >/dev/null; done ;;
    plate) cwebp -quiet -q 82 -resize 720 720 "$f" -o "web/$n.webp" ;;
    *) cwebp -quiet -q 82 "$f" -o "web/$n.webp" ;;
  esac
done
du -sh . web | sed 's/^/  /'
