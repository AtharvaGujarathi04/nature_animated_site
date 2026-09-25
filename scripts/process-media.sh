#!/usr/bin/env bash
# Processes the raw clips in media-src/ into web-ready assets in public/media/.
# Usage: bash scripts/process-media.sh        (requires ffmpeg + ffprobe)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/media-src"
OUT="$ROOT/public/media"
BG_URL="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_202655_a7f5aca0-2f80-4bc9-bcb5-96ac95662003.mp4"
FF="ffmpeg -v error -y"

mkdir -p "$OUT/sprout" "$OUT/character"

# ---------------------------------------------------------------- background
if [[ ! -f "$SRC/forest-bg.mp4" ]]; then
  echo "Downloading background clip..."
  curl -sSfL -o "$SRC/forest-bg.mp4" "$BG_URL" || {
    echo "Could not download $BG_URL - place it at media-src/forest-bg.mp4" >&2; exit 1; }
fi
ffprobe -v error -show_entries stream=width,height,r_frame_rate,nb_frames:format=duration -of compact "$SRC/forest-bg.mp4"

# The source doesn't loop (the plane jumps back at the seam), so crossfade the
# last second into the first and drop the first second: the new last frame
# flows straight into the new first frame.
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SRC/forest-bg.mp4")
XF=1
OFF=$(awk "BEGIN{print $DUR-$XF}")
LOOP_FILTER="[0:v]setpts=PTS-STARTPTS,format=yuv420p[a];[0:v]trim=0:$XF,setpts=PTS-STARTPTS,format=yuv420p[b];[a][b]xfade=transition=fade:duration=$XF:offset=$OFF,trim=start=$XF,setpts=PTS-STARTPTS"

echo "Background 1080p loop..."
$FF -i "$SRC/forest-bg.mp4" -filter_complex "$LOOP_FILTER" -an \
  -c:v libx264 -preset slow -crf 27 -pix_fmt yuv420p -movflags +faststart "$OUT/forest-bg.mp4"
echo "Background 720p mobile fallback..."
$FF -i "$OUT/forest-bg.mp4" -vf "scale=-2:720" -an \
  -c:v libx264 -preset slow -crf 28 -pix_fmt yuv420p -movflags +faststart "$OUT/forest-bg-720.mp4"
$FF -i "$OUT/forest-bg.mp4" -vf "select=eq(n\,0),scale=1280:-2" -frames:v 1 -q:v 5 "$OUT/forest-bg-poster.jpg"

# ---------------------------------------------------------------- sprout
# Remove the "KlingAI 3.0" watermark (bottom-right, over blurred foliage) with delogo,
# then export a WebP sequence (max 1080px tall) for canvas scroll-scrubbing.
echo "Sprout sequence..."
SPROUT_VF="delogo=x=610:y=1120:w=154:h=38,scale=-2:1080:flags=lanczos"
rm -f "$OUT"/sprout/*.webp
$FF -i "$SRC/plant.mp4" -vf "$SPROUT_VF" -c:v libwebp -quality 72 -compression_level 6 "$OUT/sprout/%03d.webp"
N=$(ls "$OUT"/sprout/*.webp | wc -l)
cp "$OUT/sprout/001.webp" "$OUT/sprout-first.webp"
cp "$OUT/sprout/$(printf %03d "$N").webp" "$OUT/sprout-last.webp"
$FF -i "$OUT/sprout-first.webp" -q:v 4 "$OUT/sprout-first.jpg"
$FF -i "$OUT/sprout-last.webp" -q:v 4 "$OUT/sprout-last.jpg"
echo "  $N frames"

# ---------------------------------------------------------------- character
# Background is pure black; the watermark sits on black below the leaf, so a
# black box removes it without touching the leaf. Keying happens in a shader.
echo "Character..."
CHAR_VF="drawbox=x=654:y=1062:w=150:h=34:color=black:t=fill"
rm -f "$OUT"/character/*.png
$FF -i "$SRC/character.mp4" -vf "$CHAR_VF,scale=-2:480:flags=lanczos" -compression_level 9 "$OUT/character/%03d.png"
$FF -i "$SRC/character.mp4" -vf "$CHAR_VF,select=eq(n\,0),scale=-2:720:flags=lanczos" -frames:v 1 "$OUT/character-poster.png"
# Ping-pong (forward + reverse) so the wave loops without a hard cut.
$FF -i "$SRC/character.mp4" -filter_complex "[0:v]$CHAR_VF,scale=-2:720:flags=lanczos,split[f][r0];[r0]reverse[r];[f][r]concat=n=2:v=1,format=yuv420p" \
  -an -c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p -movflags +faststart "$OUT/character-loop.mp4"

echo "Done."
du -sh "$OUT"/* | sort -h
