import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Camera from '../models/Camera.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HLS_DIR = path.join(__dirname, '../../tmp/hls');
const THUMBNAIL_DIR = path.join(__dirname, '../../tmp/thumbnails');
const THUMBNAIL_CACHE_MS = 60000;

const activeProcesses = new Map();

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export async function startTranscode(cameraId) {
  if (activeProcesses.has(cameraId)) {
    return { hlsUrl: `/api/stream/hls/${cameraId}/playlist.m3u8` };
  }

  const camera = await Camera.findById(cameraId);
  if (!camera) throw new Error('Camera not found');
  const streamUrl = (camera.streamUrl || '').trim();
  if (!streamUrl.toLowerCase().startsWith('rtsp://')) {
    throw new Error('Camera has no RTSP stream URL');
  }

  const outputDir = path.join(HLS_DIR, cameraId);
  ensureDir(outputDir);

  const playlistPath = path.join(outputDir, 'playlist.m3u8');

  return new Promise((resolve, reject) => {
    const cmd = ffmpeg(streamUrl)
      .inputOptions(['-rtsp_transport tcp'])
      .outputOptions([
        '-c:v libx264',
        '-preset ultrafast',
        '-tune zerolatency',
        '-r 15',
        '-g 30',
        '-keyint_min 30',
        '-sc_threshold 0',
        '-b:v 800k',
        '-maxrate 800k',
        '-bufsize 1200k',
        '-profile:v baseline',
        '-level 3.0',
        '-c:a aac',
        '-b:a 96k',
        '-ar 44100',
        '-f hls',
        '-hls_time 2',
        '-hls_list_size 5',
        '-hls_flags delete_segments+append_list',
        '-hls_segment_filename', path.join(outputDir, 'segment%03d.ts'),
      ])
      .output(playlistPath)
      .on('start', (commandLine) => {
        // eslint-disable-next-line no-console
        console.log('[stream] Started transcoding', cameraId);
      })
      .on('error', (err) => {
        activeProcesses.delete(cameraId);
        // eslint-disable-next-line no-console
        console.error('[stream] Transcode error', cameraId, err.message);
        reject(err);
      })
      .on('end', () => {
        activeProcesses.delete(cameraId);
      });

    cmd.run();
    activeProcesses.set(cameraId, cmd);

    const maxWait = 20000;
    const interval = 500;
    let elapsed = 0;
    let settled = false;
    const check = () => {
      if (settled) return;
      if (fs.existsSync(playlistPath)) {
        settled = true;
        resolve({ hlsUrl: `/api/stream/hls/${cameraId}/playlist.m3u8` });
        return;
      }
      if (elapsed >= maxWait) {
        settled = true;
        activeProcesses.delete(cameraId);
        reject(new Error('Stream failed to start. Check that the RTSP URL is correct and the camera is online.'));
        return;
      }
      elapsed += interval;
      setTimeout(check, interval);
    };
    setTimeout(check, 1500);
  });
}

export function stopTranscode(cameraId) {
  const proc = activeProcesses.get(cameraId);
  if (proc) {
    proc.kill('SIGKILL');
    activeProcesses.delete(cameraId);
    const outputDir = path.join(HLS_DIR, cameraId);
    try {
      fs.rmSync(outputDir, { recursive: true, force: true });
    } catch (_) {}
    // eslint-disable-next-line no-console
    console.log('[stream] Stopped transcoding', cameraId);
  }
}

export function getHlsDir() {
  return HLS_DIR;
}

export async function getThumbnailPath(cameraId) {
  const camera = await Camera.findById(cameraId);
  if (!camera) return null;
  const streamUrl = (camera.streamUrl || '').trim();
  if (!streamUrl.toLowerCase().startsWith('rtsp://')) return null;

  ensureDir(THUMBNAIL_DIR);
  const thumbPath = path.join(THUMBNAIL_DIR, `${cameraId}.jpg`);
  const stat = fs.existsSync(thumbPath) ? fs.statSync(thumbPath) : null;
  if (stat && Date.now() - stat.mtimeMs < THUMBNAIL_CACHE_MS) {
    return thumbPath;
  }

  return new Promise((resolve, reject) => {
    const tmpPath = path.join(THUMBNAIL_DIR, `${cameraId}.tmp.jpg`);
    const cmd = ffmpeg(streamUrl)
      .inputOptions(['-rtsp_transport tcp', '-analyzeduration 500000', '-probesize 500000'])
      .outputOptions([
        '-vframes 1',
        '-f image2',
        '-vf scale=320:-2',
        '-q:v 8',
      ])
      .output(tmpPath)
      .on('end', () => {
        try {
          if (fs.existsSync(tmpPath)) {
            fs.renameSync(tmpPath, thumbPath);
            resolve(thumbPath);
          } else {
            resolve(null);
          }
        } catch (_) {
          resolve(null);
        }
      })
      .on('error', (err) => {
        try {
          fs.unlinkSync(tmpPath);
        } catch (_) {}
        reject(err);
      });
    cmd.run();
  });
}
