#!/bin/zsh
# Build packages/web/sound/music from the recordings in assets/Sound/music (docs/audio.md): each piece levelled to about -20 LUFS
# (two passes, linear, so the dynamics stay as played) and encoded as Opus 64 kb/s in .ogg. Also cuts the win and lose endings into sound/fx.
# Usage: packages/web/tools/music.sh   (needs ffmpeg). Then pnpm web:build.
set -e
j() { echo $M | python3 -c "import json,sys; print(json.load(sys.stdin)['$1'])"; }
R=${0:A:h}/../../..; A=$R/assets/Sound/music; O=$R/packages/web/sound/music; F=$R/packages/web/sound/fx
level() { # in out [extra filters before levelling]
  local pre=${3:+$3,}
  M=$(ffmpeg -hide_banner -i $1 -af "${pre}loudnorm=I=-20:TP=-1.5:LRA=18:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')
  ffmpeg -v error -y -i $1 -af "${pre}loudnorm=I=-20:TP=-1.5:LRA=18:linear=true:measured_I=$(j input_i):measured_TP=$(j input_tp):measured_LRA=$(j input_lra):measured_thresh=$(j input_thresh):offset=$(j target_offset)" -ar 48000 -ac 2 -c:a libopus -b:a ${4:-64k} $2
}
# Silence before and after the music goes, so one piece crossfades into the next without a gap.
TRIM='silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse'
for f in $A/*/*.ogg; do
  mood=${f:h:t}; mkdir -p $O/$mood
  level $f $O/$mood/${f:t} $TRIM
  printf "%-8s %-32s %5s KB\n" $mood ${f:t:r} $(( $(stat -f %z $O/$mood/${f:t}) / 1024 ))
done
# The endings: the last seconds of a piece, faded in, as the win and lose sounds.
ending() { # piece seconds out
  local t=$(mktemp -d)/x.wav; ffmpeg -v error -y -i $A/$1.ogg -af $TRIM $t
  local d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 $t)
  level $t $F/$3.ogg "atrim=start=$(echo "$d - $2" | bc),asetpts=PTS-STARTPTS,afade=t=in:d=0.8" 96k
  rm -r ${t:h}
  echo "$3 <- last $2 s of $1"
}
ending explore/brandenburg-3-allegro 9 win
ending title/albinoni-op9-2-adagio 11 lose
