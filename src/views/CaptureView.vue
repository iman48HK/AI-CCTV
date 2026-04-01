<template>
  <div class="capture-view">
    <header class="capture-view__header">
      <button type="button" class="capture-view__back" @click="$emit('back')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back
      </button>
      <h1 class="capture-view__title">People for Detection</h1>
    </header>

    <p class="capture-view__subtitle">Manage people (visitors/external) for face identification. Not internal users.</p>

    <main class="capture-view__main">
      <div class="capture-view__toolbar">
        <button type="button" class="capture-view__btn capture-view__btn--primary" @click="startAddPerson">
          Add Person
        </button>
      </div>

      <p v-if="error" class="capture-view__error">{{ error }}</p>
      <p v-if="loading" class="capture-view__loading">Loading…</p>

      <div v-else-if="people.length === 0" class="capture-view__empty">
        No people yet. Add a person and capture 5 photos for identification.
      </div>

      <div v-else class="capture-view__grid">
        <div v-for="p in people" :key="p._id" class="capture-view__card">
          <div class="capture-view__card-thumb">
            <img v-if="p.photos?.[0]" :src="p.photos[0]" alt="" />
            <span v-else class="capture-view__card-placeholder">No photo</span>
          </div>
          <div class="capture-view__card-body">
            <strong>{{ p.name }}</strong>
            <p v-if="p.notes" class="capture-view__card-notes">{{ p.notes }}</p>
            <span class="capture-view__card-meta">{{ p.photos?.length || 0 }}/5 photos</span>
          </div>
          <div class="capture-view__card-actions">
            <button type="button" class="capture-view__act" @click="viewPhotos(p)">View</button>
            <button type="button" class="capture-view__act" @click="startEditPerson(p)">Edit</button>
            <button type="button" class="capture-view__act capture-view__act--warn" @click="deletePerson(p)">Delete</button>
          </div>
        </div>
      </div>
    </main>

    <!-- Step 1: Name & notes -->
    <div v-if="showForm" class="capture-view__modal" @click.self="closeForm">
      <div class="capture-view__modal-inner">
        <h2>{{ editing ? 'Edit Person' : 'Add Person' }}</h2>
        <form v-if="!showCamera" @submit.prevent="goToCamera">
          <label>
            <span>Name</span>
            <input v-model="form.name" required placeholder="e.g. John Doe" />
          </label>
          <label>
            <span>Notes (optional)</span>
            <input v-model="form.notes" placeholder="e.g. Visitor, Contractor" />
          </label>
          <div class="capture-view__modal-actions">
            <button type="button" @click="closeForm">Cancel</button>
            <button type="submit">{{ editing ? 'Update photos' : 'Next: Capture photos' }}</button>
          </div>
        </form>

        <!-- Step 2: Camera capture (5 photos) -->
        <div v-else class="capture-view__camera">
          <div class="capture-view__camera-preview" ref="cameraContainer">
            <video v-show="stream" ref="videoEl" autoplay playsinline muted />
            <p v-if="cameraError" class="capture-view__camera-error">{{ cameraError }}</p>
            <p v-else-if="!stream && !cameraError" class="capture-view__camera-loading">Starting camera…</p>
          </div>
          <p class="capture-view__camera-hint">Capture 5 photos from different angles for better identification.</p>
          <div class="capture-view__camera-thumbs">
            <div
              v-for="(img, i) in capturedPhotos"
              :key="`${i}-${retakeIndex === i ? 'retake' : 'done'}`"
              class="capture-view__thumb"
            >
              <img :src="img" alt="" />
              <div class="capture-view__thumb-actions">
                <button type="button" class="capture-view__thumb-retake" @click="retakePhoto(i)">Retake</button>
                <button type="button" class="capture-view__thumb-remove" @click="removePhoto(i)">×</button>
              </div>
            </div>
            <div
              v-for="i in (5 - capturedPhotos.length)"
              :key="`empty-${i}`"
              class="capture-view__thumb capture-view__thumb--empty"
            >
              {{ capturedPhotos.length + i === 5 ? '5' : capturedPhotos.length + i }}
            </div>
          </div>
          <div class="capture-view__camera-actions">
            <button
              type="button"
              class="capture-view__btn"
              :disabled="capturedPhotos.length >= 5 && retakeIndex === null"
              @click="capturePhoto"
            >
              {{ capturedPhotos.length >= 5 && retakeIndex === null
                ? '5/5 captured'
                : retakeIndex !== null
                  ? `Capture to replace photo ${retakeIndex + 1}`
                  : `Capture (${capturedPhotos.length}/5)` }}
            </button>
            <div class="capture-view__modal-actions">
              <button v-if="retakeIndex !== null" type="button" @click="cancelRetake">Cancel retake</button>
              <button type="button" @click="closeForm">Cancel</button>
              <button
                type="button"
                class="capture-view__btn--primary"
                :disabled="capturedPhotos.length !== 5"
                @click="savePerson"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Photo gallery modal -->
    <div v-if="viewingPerson" class="capture-view__modal" @click.self="viewingPerson = null">
      <div class="capture-view__modal-inner capture-view__modal-inner--gallery">
        <h2>{{ viewingPerson.name }} – all 5 photos</h2>
        <div class="capture-view__gallery">
          <div
            v-for="(img, i) in viewingPerson.photos"
            :key="i"
            class="capture-view__gallery-item"
          >
            <img :src="img" :alt="`Photo ${i + 1}`" />
            <span class="capture-view__gallery-label">Photo {{ i + 1 }}</span>
          </div>
        </div>
        <div class="capture-view__modal-actions">
          <button type="button" @click="viewingPerson = null">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { api } from '../api.js'
import { assertCameraSecureContext } from '../utils/camera.js'

defineEmits(['back'])

const people = ref([])
const loading = ref(false)
const error = ref('')
const showForm = ref(false)
const showCamera = ref(false)
const editing = ref(null)
const viewingPerson = ref(null)

const form = ref({ name: '', notes: '' })
const capturedPhotos = ref([])
const videoEl = ref(null)
const cameraContainer = ref(null)
const stream = ref(null)
const cameraError = ref('')
const retakeIndex = ref(null)
const retakeBackup = ref(null)

async function fetchPeople() {
  loading.value = true
  error.value = ''
  try {
    const res = await api('/people')
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to load people')
    people.value = await res.json()
  } catch (e) {
    error.value = e.message || 'Failed to load people'
  } finally {
    loading.value = false
  }
}

function startAddPerson() {
  editing.value = null
  form.value = { name: '', notes: '' }
  capturedPhotos.value = []
  showCamera.value = false
  showForm.value = true
}

function viewPhotos(p) {
  viewingPerson.value = p
}

function startEditPerson(p) {
  editing.value = p
  form.value = { name: p.name, notes: p.notes || '' }
  capturedPhotos.value = p.photos ? [...p.photos] : []
  showCamera.value = false
  showForm.value = true
}

function closeForm() {
  stopCamera()
  showForm.value = false
  showCamera.value = false
  editing.value = null
  form.value = { name: '', notes: '' }
  capturedPhotos.value = []
  retakeIndex.value = null
  retakeBackup.value = null
  cameraError.value = ''
  fetchPeople()
}

function goToCamera() {
  if (!form.value.name?.trim()) return
  showCamera.value = true
  if (editing.value?.photos) {
    capturedPhotos.value = [...editing.value.photos]
  } else {
    capturedPhotos.value = []
  }
}

async function startCamera() {
  cameraError.value = ''
  try {
    assertCameraSecureContext()
    await nextTick()
    const s = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
    })
    stream.value = s
    await nextTick()
    if (videoEl.value) {
      videoEl.value.srcObject = s
    }
  } catch (e) {
    cameraError.value =
      e.name === 'NotAllowedError'
        ? 'Camera access denied. Please allow camera in your browser.'
        : e.name === 'InsecureContextError'
          ? e.message
          : e.message || 'Failed to access camera'
  }
}

function stopCamera() {
  if (stream.value) {
    stream.value.getTracks().forEach((t) => t.stop())
    stream.value = null
  }
  if (videoEl.value) {
    videoEl.value.srcObject = null
  }
}

function capturePhoto() {
  if (!videoEl.value) return
  if (capturedPhotos.value.length >= 5 && retakeIndex.value === null) return
  const v = videoEl.value
  if (v.readyState < 2) return
  const canvas = document.createElement('canvas')
  canvas.width = v.videoWidth
  canvas.height = v.videoHeight
  const ctx = canvas.getContext('2d')
  ctx.drawImage(v, 0, 0)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
  if (retakeIndex.value !== null) {
    const next = [...capturedPhotos.value]
    next.splice(retakeIndex.value, 0, dataUrl)
    capturedPhotos.value = next
    retakeIndex.value = null
    retakeBackup.value = null
  } else {
    capturedPhotos.value = [...capturedPhotos.value, dataUrl]
  }
}

function retakePhoto(index) {
  retakeBackup.value = capturedPhotos.value[index]
  capturedPhotos.value = capturedPhotos.value.filter((_, i) => i !== index)
  retakeIndex.value = index
}

function removePhoto(index) {
  capturedPhotos.value = capturedPhotos.value.filter((_, i) => i !== index)
  if (retakeIndex.value === index) {
    retakeIndex.value = null
    retakeBackup.value = null
  } else if (retakeIndex.value !== null && retakeIndex.value > index) {
    retakeIndex.value--
  }
}

function cancelRetake() {
  if (retakeIndex.value !== null && retakeBackup.value) {
    const next = [...capturedPhotos.value]
    next.splice(retakeIndex.value, 0, retakeBackup.value)
    capturedPhotos.value = next
  }
  retakeIndex.value = null
  retakeBackup.value = null
}

async function savePerson() {
  if (capturedPhotos.value.length !== 5) return
  error.value = ''
  try {
    if (editing.value) {
      const res = await api(`/people/${editing.value._id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: form.value.name.trim(),
          notes: form.value.notes.trim(),
          photos: capturedPhotos.value,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to update')
      }
    } else {
      const res = await api('/people', {
        method: 'POST',
        body: JSON.stringify({
          name: form.value.name.trim(),
          notes: form.value.notes.trim(),
          photos: capturedPhotos.value,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to create')
      }
    }
    closeForm()
  } catch (e) {
    error.value = e.message
  }
}

async function deletePerson(p) {
  if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return
  try {
    const res = await api(`/people/${p._id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete')
    await fetchPeople()
  } catch (e) {
    error.value = e.message
  }
}

watch(showCamera, (visible) => {
  if (visible) {
    startCamera()
  } else {
    stopCamera()
  }
})

onMounted(() => fetchPeople())
onUnmounted(() => stopCamera())
</script>

<style scoped>
.capture-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 1.5rem 5%;
}

.capture-view__header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.capture-view__back {
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

.capture-view__back svg {
  width: 18px;
  height: 18px;
}

.capture-view__title {
  font-size: 1.4rem;
  font-weight: 600;
  color: #fff;
}

.capture-view__subtitle {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
}

.capture-view__main {
  flex: 1;
}

.capture-view__toolbar {
  margin-bottom: 1rem;
}

.capture-view__btn {
  padding: 0.5rem 1rem;
  border-radius: 999px;
  border: none;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.capture-view__btn--primary {
  background: #fff;
  color: #163645;
}

.capture-view__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.capture-view__error {
  color: #ffb3b3;
  margin-bottom: 1rem;
}

.capture-view__loading {
  color: rgba(255, 255, 255, 0.8);
}

.capture-view__empty {
  color: rgba(255, 255, 255, 0.7);
  padding: 2rem;
  text-align: center;
}

.capture-view__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
}

.capture-view__card {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.capture-view__card-thumb {
  aspect-ratio: 1;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.capture-view__card-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.capture-view__card-placeholder {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9rem;
}

.capture-view__card-body {
  padding: 0.75rem 1rem;
}

.capture-view__card-body strong {
  color: #fff;
}

.capture-view__card-notes {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 0.25rem;
}

.capture-view__card-meta {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  display: block;
  margin-top: 0.25rem;
}

.capture-view__card-actions {
  padding: 0 1rem 1rem;
  display: flex;
  gap: 0.5rem;
}

.capture-view__act {
  padding: 0.25rem 0.5rem;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 0.8rem;
  cursor: pointer;
}

.capture-view__act--warn {
  background: rgba(255, 100, 100, 0.3);
}

.capture-view__modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
  overflow-y: auto;
}

.capture-view__modal-inner {
  width: 100%;
  max-width: 480px;
  padding: 1.5rem;
  background: #163645;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.capture-view__modal-inner h2 {
  margin-bottom: 1rem;
  font-size: 1.2rem;
  color: #fff;
}

.capture-view__modal-inner label {
  display: block;
  margin-bottom: 0.75rem;
}

.capture-view__modal-inner label span {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.9);
}

.capture-view__modal-inner input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(0, 0, 0, 0.2);
  color: #fff;
}

.capture-view__modal-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1.25rem;
}

.capture-view__modal-actions button {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: none;
  font-size: 0.9rem;
  cursor: pointer;
}

.capture-view__modal-actions button[type="button"] {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.capture-view__modal-actions button[type="submit"],
.capture-view__modal-actions .capture-view__btn--primary {
  background: #fff;
  color: #163645;
}

.capture-view__camera {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.capture-view__camera-preview {
  position: relative;
  aspect-ratio: 4/3;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
}

.capture-view__camera-preview video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.capture-view__camera-loading,
.capture-view__camera-error {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  padding: 1rem;
  text-align: center;
}

.capture-view__camera-error {
  color: #ffb3b3;
}

.capture-view__camera-hint {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
}

.capture-view__camera-thumbs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.capture-view__thumb {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.capture-view__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.capture-view__thumb-actions {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  background: rgba(0, 0, 0, 0.5);
}

.capture-view__thumb-retake {
  padding: 0.2rem 0.4rem;
  border: none;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.9);
  color: #163645;
  font-size: 0.7rem;
  font-weight: 500;
  cursor: pointer;
}

.capture-view__thumb-remove {
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
}

.capture-view__thumb--empty {
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9rem;
}

.capture-view__camera-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.capture-view__modal-inner--gallery {
  max-width: 640px;
}

.capture-view__gallery {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 1rem;
}

@media (min-width: 520px) {
  .capture-view__gallery {
    grid-template-columns: repeat(3, 1fr);
  }
}

.capture-view__gallery-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
}

.capture-view__gallery-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.capture-view__gallery-label {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0.25rem 0.5rem;
  background: rgba(0, 0, 0, 0.6);
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.8rem;
  text-align: center;
}
</style>
