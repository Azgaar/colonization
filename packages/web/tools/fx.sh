#!/bin/zsh
# Build packages/web/sound/fx from the Kenney CC0 packs in assets/Sound (docs/audio.md): pick, sequence, level to about -24 dB mean with a limiter.
# Usage: packages/web/tools/fx.sh   (needs ffmpeg). Change a pick below, run it, then pnpm web:build.
set -e
R=${0:A:h}/../../..; P=$R/assets/Sound; O=$R/packages/web/sound/fx; T=$(mktemp -d)
seq() { # out, then pairs: file delay_ms
  local out=$1; shift; local ins=() fl="" i=0 labels=""
  while (( $# )); do ins+=(-i "$P/$1.ogg"); fl+="[$i]adelay=$2|$2[a$i];"; labels+="[a$i]"; i=$((i+1)); shift 2; done
  ffmpeg -v error -y "${ins[@]}" -filter_complex "${fl}${labels}amix=inputs=$i:normalize=0:duration=longest" -ac 2 -c:a vorbis -strict -2 $T/$out.ogg
}
one() { ffmpeg -v error -y -i "$P/$2.ogg" -ac 2 -c:a vorbis -strict -2 $T/$1.ogg; }
one turn    interface-sounds/confirmation_002
one reveal  interface-sounds/maximize_001
one card    casino-audio/card-place-1
one event   casino-audio/card-slide-1
one dice    casino-audio/dice-throw-1
one coins   rpg-audio/handleCoins
one sail    rpg-audio/creak1
one build   impact-sounds/impactPlank_medium_000
one bell    impact-sounds/impactBell_heavy_000
seq march   impact-sounds/footstep_grass_000 0 impact-sounds/footstep_grass_001 280 impact-sounds/footstep_grass_002 560
seq found   impact-sounds/impactWood_heavy_000 0 impact-sounds/impactWood_heavy_001 260
seq battle  impact-sounds/impactMetal_heavy_000 0 impact-sounds/impactMetal_medium_000 140 impact-sounds/impactMetal_heavy_001 330
seq war     impact-sounds/impactSoft_heavy_000 0 impact-sounds/impactSoft_heavy_001 420 impact-sounds/impactSoft_heavy_002 840
for f in $T/*.ogg; do
  m=$(ffmpeg -hide_banner -i $f -af volumedetect -f null - 2>&1 | awk '/mean_volume/{print $5}')
  g=$(echo "-24 - ($m)" | bc)
  ffmpeg -v error -y -i $f -af "volume=${g}dB,alimiter=limit=0.89:level=false" -ac 2 -c:a vorbis -strict -2 $O/${f:t}
  printf "%-8s mean %6s -> gain %5s dB\n" ${f:t:r} $m $g
done
rm -r $T
