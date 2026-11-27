#!/usr/bin/env sh
# Regera os ícones do PWA a partir dos SVGs desta pasta (precisa do ImageMagick: `magick`).
#   sh scripts/icons/generate.sh
# icon.svg           -> ícones "any" (cantos arredondados, fundo transparente)
# icon-full-bleed.svg -> "maskable" (o Android aplica a máscara; o glifo já fica na zona segura de 80%)
#                        e apple-touch-icon (iOS precisa de fundo opaco, senão os cantos ficam pretos)
set -eu
cd "$(dirname "$0")"
render() { magick -background none -density 600 "$1" -resize "$2x$2" -strip "PNG32:$3"; }
render icon.svg 192 ../../public/icons/icon-192.png
render icon.svg 512 ../../public/icons/icon-512.png
render icon-full-bleed.svg 512 ../../public/icons/icon-maskable-512.png
render icon-full-bleed.svg 180 ../../src/app/apple-icon.png
echo "Ícones gerados."
