#!/bin/zsh
# Build packages/web/sound/music from the recordings in assets/Sound/music, one flat folder; each piece's mood is in packages/web/sound/music.json (docs/audio.md): each piece levelled to about -20 LUFS
# (two passes, linear, so the dynamics stay as played; a piece whose loudness range is over 11 LU is first brought nearer, so its quiet
# passages are not lost under the game) and encoded as Opus 64 kb/s, 48 kHz stereo in .ogg, with no tags or cover art. Also cuts the win and lose endings into sound/fx.
# Usage: packages/web/tools/music.sh   (needs ffmpeg; ALL=1 to encode every piece again). Then pnpm web:build.
set -e
j() { echo $M | python3 -c "import json,sys; print(json.load(sys.stdin)['$1'])"; }
R=${0:A:h}/../../..; A=$R/assets/Sound/music; O=$R/packages/web/sound/music; F=$R/packages/web/sound/fx
level() { # in out [extra filters before levelling] [bitrate]
  local pre=${3:+$3,}
  measure() { M=$(ffmpeg -hide_banner -i $1 -af "${pre}loudnorm=I=-20:TP=-1.5:LRA=11:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p'); }
  measure $1
  # A piece whose loudness range is over 11 LU is first brought nearer (dynamic levelling towards 9 LU), so its quiet passages are not lost under the game.
  if (( $(j input_lra) > 11 )); then pre="${pre}loudnorm=I=-20:TP=-1.5:LRA=9,"; measure $1; fi
  ffmpeg -v error -y -i $1 -map 0:a:0 -map_metadata -1 -af "${pre}loudnorm=I=-20:TP=-1.5:LRA=11:linear=true:measured_I=$(j input_i):measured_TP=$(j input_tp):measured_LRA=$(j input_lra):measured_thresh=$(j input_thresh):offset=$(j target_offset)" -ar 48000 -ac 2 -c:a libopus -b:a ${4:-64k} $2
}
# Silence before and after the music goes, so one piece crossfades into the next without a gap.
TRIM='silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse'
# Only the pieces not encoded yet, unless ALL=1: a piece already in sound/music is left as it is.
mkdir -p $O
for f in $A/*.ogg; do
  [[ -z $ALL && -e $O/${f:t} ]] && continue
  level $f $O/${f:t} $TRIM
  printf "%-36s %5s KB\n" ${f:t:r} $(( $(stat -f %z $O/${f:t}) / 1024 ))
done
# The endings: the last seconds of a piece, faded in, as the win and lose sounds.
ending() { # piece seconds out
  local t=$(mktemp -d)/x.wav; ffmpeg -v error -y -i $A/$1.ogg -af $TRIM $t
  local d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 $t)
  level $t $F/$3.ogg "atrim=start=$(echo "$d - $2" | bc),asetpts=PTS-STARTPTS,afade=t=in:d=0.8" 96k
  rm -r ${t:h}
  echo "$3 <- last $2 s of $1"
}
[[ -n $ALL || ! -e $F/win.ogg ]] && ending brandenburg-3-allegro 9 win
[[ -n $ALL || ! -e $F/lose.ogg ]] && ending albinoni-op9-2-adagio 11 lose
true
