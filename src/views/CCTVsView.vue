<template>
  <div class="cctvs-view">
    <header class="cctvs-view__header">
      <button type="button" class="cctvs-view__back" @click="$emit('back')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back
      </button>
      <h1 class="cctvs-view__title">CCTVs</h1>
    </header>

    <main class="cctvs-view__main">
      <div class="cctvs-view__toolbar">
        <button type="button" class="cctvs-view__btn cctvs-view__btn--primary" @click="showAdd = true">
          Add CCTV
        </button>
        <button type="button" class="cctvs-view__btn cctvs-view__btn--outline" @click="openDetect({ name: 'Local Camera' })">
          Local Camera
        </button>
      </div>

      <p v-if="error" class="cctvs-view__error">{{ error }}</p>
      <p v-if="syncMsg" class="cctvs-view__sync-msg">{{ syncMsg }}</p>
      <p v-if="loading" class="cctvs-view__loading">Loading…</p>

      <div v-else-if="cameras.length === 0" class="cctvs-view__empty">
        No CCTVs yet. Add a CCTV to start live detection.
      </div>
      <div v-else class="cctvs-view__grid">
        <div v-for="cam in cameras" :key="cam._id" class="cctvs-view__card">
          <div
            class="cctvs-view__card-thumb"
            @click="openPlayer(cam)"
          >
            <img
              v-if="thumbnailUrls[cam._id]"
              :src="thumbnailUrls[cam._id]"
              :alt="cam.name"
              class="cctvs-view__card-thumb-img"
              @load="thumbnailImgLoading[cam._id] = false"
              @error="thumbnailImgLoading[cam._id] = false"
            />
            <div v-if="(thumbnailLoading[cam._id] || thumbnailImgLoading[cam._id])" class="cctvs-view__card-thumb-spinner" aria-hidden="true" />
            <div v-else-if="!thumbnailUrls[cam._id]" class="cctvs-view__card-thumb-placeholder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M18 10h-2V8c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-2h2c1.1 0 2-.9 2-2v-4c0-1.1-.9-2-2-2z" />
                <circle cx="12" cy="13" r="2.5" />
              </svg>
              <span>No preview</span>
            </div>
          </div>
          <h3>{{ cam.name }}</h3>
          <p v-if="cam.location" class="cctvs-view__card-loc">{{ cam.location }}</p>
          <label class="cctvs-view__card-checkbox">
            <input
              type="checkbox"
              :checked="cam.facialFallDetection ?? false"
              :disabled="detectionCheckboxSaving[cam._id]"
              @change="saveFacialFallDetection(cam, $event.target.checked)"
            />
            Facial and fall detection
          </label>
        </div>
      </div>
    </main>

    <!-- Add camera modal -->
    <div v-if="showAdd" class="cctvs-view__modal" @click.self="showAdd = false">
      <div class="cctvs-view__modal-inner cctvs-view__modal-inner--wide">
        <h2>Add Camera</h2>
        <form @submit.prevent="addCamera">
          <label>
            <span>Name</span>
            <input v-model="form.name" required />
          </label>
          <label>
            <span>Stream URL (optional)</span>
            <input v-model="form.streamUrl" placeholder="rtsp:// or http://" />
          </label>
          <label>
            <span>Location</span>
            <input v-model="form.location" />
          </label>

          <div v-if="isSystemAdmin" class="cctvs-view__pin-section">
            <span class="cctvs-view__pin-label">Site plan &amp; pin (optional)</span>
            <label class="cctvs-view__select-label">
              <span>Site plan</span>
              <select v-model="form.sitePlanId" @change="onSitePlanSelected">
                <option value="">— None —</option>
                <option v-for="sp in sitePlans" :key="sp._id" :value="sp._id">{{ sp.planId }} — {{ sp.description || sp.filename }}</option>
              </select>
            </label>
            <div
              v-if="form.sitePlanImageUrl"
              ref="mapContainer"
              class="cctvs-view__map-container"
              @click="onMapClick"
            >
              <img :src="form.sitePlanImageUrl" alt="Site plan" class="cctvs-view__map-img" />
              <div
                v-if="form.pinX != null && form.pinY != null"
                class="cctvs-view__pin"
                :style="{ left: form.pinX + '%', top: form.pinY + '%' }"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                </svg>
              </div>
            </div>
            <p v-if="form.sitePlanImageUrl" class="cctvs-view__pin-hint">Click on the plan to place the camera pin</p>
          </div>

          <div class="cctvs-view__modal-actions">
            <button type="button" @click="showAdd = false">Cancel</button>
            <button type="submit">Add</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Live stream modal -->
    <div v-if="detecting" class="cctvs-view__modal cctvs-view__modal--detect" @click.self="closeDetect">
      <div class="cctvs-view__detect-inner">
        <h2>Live — {{ detecting.name }}</h2>
        <p v-if="detectEnabled" class="cctvs-view__detect-hint">Detecting faces against people recorded in Capture. CompreFace required.</p>
        <div class="cctvs-view__detect-preview" ref="detectPreview">
          <video
            ref="detectVideo"
            autoplay
            playsinline
            muted
            class="cctvs-view__detect-video"
            @play="videoPlaying = true"
            @pause="videoPlaying = false"
          />
          <div v-if="detectError" class="cctvs-view__detect-error">{{ detectError }}</div>
          <div v-else-if="!detectReady" class="cctvs-view__detect-loading">{{ detectStreamUrl ? 'Starting stream…' : 'Starting camera…' }}</div>
          <div v-if="detectEnabled && recognitions.length > 0" class="cctvs-view__recognitions">
            <div v-for="r in recognitions" :key="r.name" class="cctvs-view__recognition">
              {{ r.name }} ({{ Math.round(r.similarity * 100) }}%)
            </div>
          </div>
        </div>
        <div class="cctvs-view__detect-actions">
          <button
            type="button"
            class="cctvs-view__btn cctvs-view__btn--play"
            :title="videoPlaying ? 'Pause' : 'Play'"
            @click="togglePlayPause"
          >
            {{ videoPlaying ? 'Pause' : 'Play' }}
          </button>
          <button type="button" class="cctvs-view__btn" @click="closeDetect">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { api } from '../api.js'
import { assertCameraSecureContext } from '../utils/camera.js'
import Hls from 'hls.js'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

const props = defineProps({ authUser: { type: Object, default: null } })
const emit = defineEmits(['back'])
const isSystemAdmin = computed(() => props.authUser?.role === 'system_admin')

const cameras = ref([])
const loading = ref(false)
const error = ref('')
const syncMsg = ref('')
const showAdd = ref(false)
const detecting = ref(null)
const detectVideo = ref(null)
const detectPreview = ref(null)
const detectStream = ref(null)
const detectStreamUrl = ref(null)
const detectReady = ref(false)
const detectEnabled = ref(false)
const videoPlaying = ref(true)
const detectError = ref('')
const recognitions = ref([])
let hlsInstance = null

const form = ref({
  name: '',
  streamUrl: '',
  location: '',
  sitePlanId: '',
  sitePlanImageUrl: '',
  pinX: null,
  pinY: null,
})
const sitePlans = ref([])
const loadingSitePlans = ref(false)

const thumbnailUrls = ref({})
const thumbnailLoading = ref({})
const thumbnailImgLoading = ref({})
const detectionCheckboxSaving = ref({})

const mapContainer = ref(null)

let detectInterval = null

async function fetchCameras() {
  loading.value = true
  error.value = ''
  try {
    const res = await api('/cameras')
    if (!res.ok) throw new Error('Failed to load cameras')
    cameras.value = await res.json()
    loadThumbnails()
  } catch (e) {
    error.value = e.message || 'Failed to load cameras'
  } finally {
    loading.value = false
  }
}

async function loadThumbnails() {
  const rtspCams = cameras.value.filter(isRtspCamera)
  rtspCams.forEach((cam) => {
    thumbnailLoading.value[cam._id] = true
    thumbnailImgLoading.value[cam._id] = true
  })
  await Promise.allSettled(
    rtspCams.map(async (cam) => {
      try {
        const res = await api(`/stream/thumbnail/${cam._id}`)
        if (res.ok) {
          const blob = await res.blob()
          thumbnailUrls.value[cam._id] = URL.createObjectURL(blob)
        }
      } finally {
        thumbnailLoading.value[cam._id] = false
        thumbnailImgLoading.value[cam._id] = false
      }
    })
  )
}

function openPlayer(cam) {
  openDetect(cam, cam.facialFallDetection ?? false)
}

async function saveFacialFallDetection(cam, value) {
  detectionCheckboxSaving.value[cam._id] = true
  try {
    const res = await api(`/cameras/${cam._id}`, {
      method: 'PATCH',
      body: JSON.stringify({ facialFallDetection: value }),
    })
    if (res.ok) {
      const updated = await res.json()
      const idx = cameras.value.findIndex((c) => c._id === cam._id)
      if (idx >= 0) cameras.value[idx] = updated
    } else {
      const d = await res.json().catch(() => ({}))
      error.value = d.error || 'Failed to save setting'
    }
  } catch (e) {
    error.value = e.message || 'Failed to save setting'
  } finally {
    detectionCheckboxSaving.value[cam._id] = false
  }
}

function resetAddForm() {
  form.value = {
    name: '',
    streamUrl: '',
    location: '',
    sitePlanId: '',
    sitePlanImageUrl: '',
    pinX: null,
    pinY: null,
  }
}

async function fetchSitePlans() {
  if (!isSystemAdmin.value) return
  loadingSitePlans.value = true
  try {
    const res = await api('/site-plans')
    if (res.ok) sitePlans.value = await res.json()
    else sitePlans.value = []
  } catch (_) {
    sitePlans.value = []
  } finally {
    loadingSitePlans.value = false
  }
}

async function onSitePlanSelected() {
  form.value.sitePlanImageUrl = ''
  form.value.pinX = null
  form.value.pinY = null
  const id = form.value.sitePlanId
  if (!id) return
  const plan = sitePlans.value.find((p) => p._id === id)
  if (!plan) return
  const url = `/api/uploads/siteplans/${plan.filename}`
  if (plan.mimeType === 'application/pdf') {
    try {
      const res = await fetch(url, { credentials: 'include' })
      const arrayBuffer = await res.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      const page = await pdf.getPage(1)
      const scale = 2
      const viewport = page.getViewport({ scale })
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')
      await page.render({ canvasContext: ctx, viewport }).promise
      form.value.sitePlanImageUrl = canvas.toDataURL('image/jpeg', 0.8)
    } catch (err) {
      error.value = 'Could not load PDF plan: ' + (err.message || 'Unknown error')
    }
  } else {
    form.value.sitePlanImageUrl = url
  }
}

function onMapClick(e) {
  const el = mapContainer.value
  if (!el || !form.value.sitePlanImageUrl) return
  const rect = el.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * 100
  const y = ((e.clientY - rect.top) / rect.height) * 100
  form.value.pinX = Math.max(0, Math.min(100, x))
  form.value.pinY = Math.max(0, Math.min(100, y))
}

async function addCamera() {
  try {
    const payload = {
      name: form.value.name,
      streamUrl: form.value.streamUrl,
      location: form.value.location,
    }
    if (form.value.sitePlanId) {
      payload.sitePlanId = form.value.sitePlanId
      if (form.value.pinX != null) payload.pinX = form.value.pinX
      if (form.value.pinY != null) payload.pinY = form.value.pinY
    }
    const res = await api('/cameras', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      throw new Error(d.error || 'Failed to add camera')
    }
    showAdd.value = false
    resetAddForm()
    await fetchCameras()
  } catch (e) {
    error.value = e.message
  }
}

async function syncCompreFace() {
  syncMsg.value = ''
  try {
    const res = await api('/compreface/sync', { method: 'POST' })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      throw new Error(d.error || 'Sync failed')
    }
    const data = await res.json()
    syncMsg.value = `Synced ${data.synced} people to CompreFace.`
  } catch (e) {
    syncMsg.value = e.message
  }
}

function isRtspCamera(cam) {
  const url = (cam?.streamUrl || '').trim()
  return cam?._id && url.toLowerCase().startsWith('rtsp://')
}

async function openDetect(cam, enableDetection = false) {
  detecting.value = cam
  detectEnabled.value = enableDetection
  detectError.value = ''
  detectReady.value = false
  detectStreamUrl.value = null
  recognitions.value = []
  if (hlsInstance) {
    hlsInstance.destroy()
    hlsInstance = null
  }

  if (cam._id && !isRtspCamera(cam)) {
    detectError.value = 'This camera has no RTSP stream URL. Add an rtsp:// URL to view the live stream.'
    detectReady.value = true
    return
  }

  if (isRtspCamera(cam)) {
    detectStreamUrl.value = true
    try {
      const res = await api(`/stream/start/${cam._id}`, { method: 'POST' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to start stream')
      }
      const { hlsUrl } = await res.json()
      const fullUrl = new URL(hlsUrl, window.location.origin).href
      await playHlsStream(fullUrl)
      detectReady.value = true
      detectStreamUrl.value = fullUrl
      if (enableDetection) detectInterval = setInterval(captureAndRecognize, 2000)
    } catch (e) {
      detectError.value = e.message || 'Could not start RTSP stream'
      detectStreamUrl.value = null
    }
    return
  }

  try {
    assertCameraSecureContext()
    detectStream.value = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
    })
    if (detectVideo.value) {
      detectVideo.value.srcObject = detectStream.value
    }
    detectReady.value = true
    if (enableDetection) detectInterval = setInterval(captureAndRecognize, 2000)
  } catch (e) {
    detectError.value =
      e.name === 'NotAllowedError'
        ? 'Camera access denied.'
        : e.name === 'InsecureContextError'
          ? e.message
          : e.message || 'Could not access camera'
  }
}

function getFriendlyHlsError(details) {
  if (details === 'manifestLoadError' || details === 'manifestParsingError') {
    return 'Could not load stream. The camera may be offline, or the stream is still starting. Try again in a few seconds.'
  }
  if (details === 'manifestLoadTimeOut') {
    return 'Stream took too long to load. The camera may be offline. Try again.'
  }
  return details || 'Stream error. Please try again.'
}

async function playHlsStream(url) {
  const video = detectVideo.value
  if (!video) return
  const token = localStorage.getItem('authToken')
  const maxRetries = 3
  const retryDelay = 2000

  async function tryLoad() {
    if (hlsInstance) {
      hlsInstance.destroy()
      hlsInstance = null
    }
    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
      maxBufferLength: 10,
      maxMaxBufferLength: 20,
      maxBufferSize: 10 * 1000 * 1000,
      maxBufferHole: 0.5,
      xhrSetup: (xhr) => {
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      },
    })
    hlsInstance = hls
    hls.loadSource(url)
    hls.attachMedia(video)
    return new Promise((resolve, reject) => {
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {})
        resolve()
      })
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          reject(new Error(getFriendlyHlsError(data.details)))
        }
      })
    })
  }

  if (Hls.isSupported()) {
    let lastErr
    for (let i = 0; i < maxRetries; i++) {
      try {
        await tryLoad()
        return
      } catch (e) {
        lastErr = e
        if (i < maxRetries - 1) {
          await new Promise((r) => setTimeout(r, retryDelay))
        }
      }
    }
    throw lastErr
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = url
    video.play().catch(() => {})
  } else {
    throw new Error('HLS playback not supported in this browser')
  }
}

function togglePlayPause() {
  const video = detectVideo.value
  if (!video || (!video.srcObject && !video.src)) return
  if (video.paused) {
    video.play().catch(() => {})
  } else {
    video.pause()
  }
}

function closeDetect() {
  if (detectInterval) {
    clearInterval(detectInterval)
    detectInterval = null
  }
  if (detectStream.value) {
    detectStream.value.getTracks().forEach((t) => t.stop())
    detectStream.value = null
  }
  if (hlsInstance) {
    hlsInstance.destroy()
    hlsInstance = null
  }
  if (detectVideo.value) {
    detectVideo.value.srcObject = null
    detectVideo.value.src = ''
  }
  if (detecting.value && isRtspCamera(detecting.value)) {
    api(`/stream/stop/${detecting.value._id}`, { method: 'POST' }).catch(() => {})
  }
  detecting.value = null
  detectReady.value = false
  detectStreamUrl.value = null
  recognitions.value = []
}

async function captureAndRecognize() {
  const video = detectVideo.value
  if (!video || video.readyState < 2) return
  if (!video.srcObject && !video.src) return

  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')
  ctx.drawImage(video, 0, 0)
  const image = canvas.toDataURL('image/jpeg', 0.8)

  try {
    const res = await api('/recognize', {
      method: 'POST',
      body: JSON.stringify({ image }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      return
    }
    const data = await res.json()
    const result = data.result || []
    const list = []
    for (const face of result) {
      const subs = face.subjects || []
      for (const s of subs) {
        if (s.similarity > 0.5) list.push({ name: s.subject, similarity: s.similarity })
      }
    }
    recognitions.value = list.slice(0, 5)
  } catch (_) {}
}

onMounted(fetchCameras)
onUnmounted(() => {
  closeDetect()
  Object.values(thumbnailUrls.value).forEach((url) => URL.revokeObjectURL(url))
})
watch(detecting, (v) => {
  if (!v) closeDetect()
})

watch(showAdd, (v) => {
  if (!v) resetAddForm()
  else if (isSystemAdmin.value) fetchSitePlans()
})
</script>

<style scoped>
.cctvs-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 1.5rem 5%;
}

.cctvs-view__header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.cctvs-view__back {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 999px;
  color: #fff;
  font-size: 0.9rem;
  cursor: pointer;
}

.cctvs-view__back svg {
  width: 18px;
  height: 18px;
}

.cctvs-view__title {
  font-size: 1.4rem;
  font-weight: 600;
  color: #fff;
}

.cctvs-view__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.cctvs-view__btn {
  padding: 0.5rem 1rem;
  border-radius: 999px;
  border: none;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.cctvs-view__btn--primary {
  background: #fff;
  color: #163645;
}

.cctvs-view__btn--outline {
  border: 1px solid rgba(255, 255, 255, 0.5);
}

.cctvs-view__error {
  color: #ffb3b3;
  margin-bottom: 1rem;
}

.cctvs-view__sync-msg {
  color: #a8e6a8;
  margin-bottom: 1rem;
}

.cctvs-view__loading {
  color: rgba(255, 255, 255, 0.8);
}

.cctvs-view__empty {
  color: rgba(255, 255, 255, 0.7);
  padding: 2rem;
  text-align: center;
}

.cctvs-view__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.cctvs-view__card {
  padding: 1.25rem;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  color: #fff;
  text-align: center;
}

.cctvs-view__card-thumb {
  position: relative;
  aspect-ratio: 16/9;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  margin-bottom: 0.75rem;
}

.cctvs-view__card-thumb:hover {
  opacity: 0.9;
}

.cctvs-view__card-thumb-spinner {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.cctvs-view__card-thumb-spinner::after {
  content: '';
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: cctvs-spinner 0.8s linear infinite;
}

@keyframes cctvs-spinner {
  to { transform: rotate(360deg); }
}

.cctvs-view__card-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cctvs-view__card-thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.6);
  gap: 0.25rem;
}

.cctvs-view__card-thumb-placeholder svg {
  width: 40px;
  height: 40px;
}

.cctvs-view__card-thumb-placeholder span {
  font-size: 0.8rem;
}

.cctvs-view__card-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  margin-top: 0.5rem;
  user-select: none;
}

.cctvs-view__card-checkbox input {
  width: auto;
}

.cctvs-view__card h3 {
  font-size: 1.1rem;
  margin-bottom: 0.25rem;
}

.cctvs-view__card-loc,
.cctvs-view__card-hint {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.75);
  margin-bottom: 0.75rem;
}


.cctvs-view__modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}

.cctvs-view__modal-inner {
  width: 100%;
  max-width: 400px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 1.5rem;
  background: #163645;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.cctvs-view__modal-inner--wide {
  max-width: 560px;
}

.cctvs-view__pin-section {
  margin: 1rem 0;
}

.cctvs-view__pin-label {
  display: block;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 0.5rem;
}

.cctvs-view__select-label {
  display: block;
  margin-bottom: 0.75rem;
}

.cctvs-view__select-label span {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.9);
}

.cctvs-view__select-label select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(0, 0, 0, 0.2);
  color: #fff;
  font-size: 0.9rem;
}

.cctvs-view__pin-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.cctvs-view__file-input {
  display: none;
}

.cctvs-view__map-container {
  position: relative;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
  cursor: crosshair;
  min-height: 200px;
  max-height: 320px;
}

.cctvs-view__map-img {
  display: block;
  width: 100%;
  height: auto;
  max-height: 320px;
  object-fit: contain;
}

.cctvs-view__pin {
  position: absolute;
  transform: translate(-50%, -100%);
  width: 28px;
  height: 28px;
  color: #e53935;
  pointer-events: none;
}

.cctvs-view__pin svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8));
}

.cctvs-view__pin-hint {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 0.5rem;
}

.cctvs-view__modal-inner h2 {
  margin-bottom: 1rem;
  font-size: 1.2rem;
  color: #fff;
}

.cctvs-view__modal-inner label {
  display: block;
  margin-bottom: 0.75rem;
}

.cctvs-view__modal-inner label span {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.9);
}

.cctvs-view__modal-inner input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(0, 0, 0, 0.2);
  color: #fff;
}

.cctvs-view__modal-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1.25rem;
}

.cctvs-view__modal-actions button {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: none;
  font-size: 0.9rem;
  cursor: pointer;
}

.cctvs-view__modal-actions button[type="button"] {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.cctvs-view__modal-actions button[type="submit"] {
  background: #fff;
  color: #163645;
}

.cctvs-view__detect-inner {
  width: 100%;
  max-width: 640px;
  padding: 1.5rem;
  background: #163645;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.cctvs-view__detect-inner h2 {
  margin-bottom: 0.5rem;
  font-size: 1.2rem;
  color: #fff;
}

.cctvs-view__detect-hint {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.75);
  margin-bottom: 1rem;
}

.cctvs-view__detect-preview {
  position: relative;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
  aspect-ratio: 4/3;
}

.cctvs-view__detect-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cctvs-view__detect-error,
.cctvs-view__detect-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: rgba(0, 0, 0, 0.6);
}

.cctvs-view__recognitions {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 0.9rem;
}

.cctvs-view__recognition {
  margin-bottom: 0.25rem;
}

.cctvs-view__detect-actions {
  margin-top: 1rem;
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}
</style>
