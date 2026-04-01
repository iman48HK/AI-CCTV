# RTSP Stream to HLS

CCTVs with RTSP stream URLs are transcoded to HLS for playback in the web player.

## Prerequisites

**FFmpeg** must be installed on the system where the backend runs.

### Install FFmpeg

- **Windows**: Download from [ffmpeg.org](https://ffmpeg.org/download.html) or use `winget install ffmpeg`
- **macOS**: `brew install ffmpeg`
- **Linux**: `apt install ffmpeg` (Debian/Ubuntu) or `yum install ffmpeg` (RHEL/CentOS)

Verify: `ffmpeg -version`

## How it works

1. When you open a CCTV with an RTSP stream URL, the backend starts FFmpeg to transcode RTSP → HLS.
2. HLS segments are written to `backend/tmp/hls/{cameraId}/`.
3. The frontend uses [hls.js](https://github.com/video-dev/hls.js) to play the HLS stream.
4. When you close the viewer, the transcode process stops and segments are cleaned up.
