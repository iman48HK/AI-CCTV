<template>
  <div class="profile-view">
    <header class="profile-view__header">
      <button type="button" class="profile-view__back" @click="$emit('back')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back
      </button>
      <h1 class="profile-view__title">My Profile</h1>
    </header>

    <main class="profile-view__main">
      <p v-if="loading" class="profile-view__loading">Loading…</p>
      <p v-else-if="error" class="profile-view__error">{{ error }}</p>

      <template v-else>
        <!-- Profile section -->
        <section class="profile-view__section">
          <h2 class="profile-view__section-title">Profile</h2>
          <div class="profile-view__avatar-row">
            <div class="profile-view__avatar-wrap">
              <img
                v-if="user?.avatar?.url"
                :src="user.avatar.url"
                alt="Avatar"
                class="profile-view__avatar"
              />
              <div v-else class="profile-view__avatar-placeholder">
                {{ initials }}
              </div>
            </div>
            <div class="profile-view__avatar-form">
              <button
                type="button"
                class="profile-view__btn profile-view__btn--secondary"
                :disabled="cameraStarting"
                @click="openCamera"
              >
                {{ cameraStarting ? 'Starting camera…' : 'Capture from camera' }}
              </button>
              <template v-if="!avatarIsFromCamera">
                <label class="profile-view__field">
                  <span class="profile-view__label">Or enter avatar URL</span>
                  <input
                    v-model="avatarUrl"
                    type="url"
                    class="profile-view__input"
                    placeholder="https://example.com/avatar.jpg"
                  />
                </label>
              </template>
              <button
                v-else
                type="button"
                class="profile-view__link"
                @click="avatarUrl = ''"
              >
                Use URL instead
              </button>
              <button
                type="button"
                class="profile-view__btn profile-view__btn--primary"
                :disabled="profileSubmitting"
                @click="saveProfile"
              >
                {{ profileSubmitting ? 'Saving…' : 'Update profile' }}
              </button>
            </div>
          </div>
          <div class="profile-view__fields">
            <label class="profile-view__field">
              <span class="profile-view__label">Full name</span>
              <input
                v-model="fullName"
                type="text"
                class="profile-view__input"
                placeholder="Your name"
              />
            </label>
            <label class="profile-view__field profile-view__field--readonly">
              <span class="profile-view__label">Email</span>
              <input
                :value="user?.email"
                type="email"
                class="profile-view__input"
                disabled
              />
            </label>
            <label class="profile-view__field profile-view__field--readonly">
              <span class="profile-view__label">Role</span>
              <input
                :value="roleLabel"
                type="text"
                class="profile-view__input"
                disabled
              />
            </label>
          </div>
        </section>

        <!-- Change password section -->
        <section class="profile-view__section">
          <h2 class="profile-view__section-title">Change password</h2>
          <form class="profile-view__form" @submit.prevent="changePassword">
            <label class="profile-view__field">
              <span class="profile-view__label">Current password</span>
              <input
                v-model="currentPassword"
                type="password"
                class="profile-view__input"
                placeholder="••••••••"
                autocomplete="current-password"
              />
            </label>
            <label class="profile-view__field">
              <span class="profile-view__label">New password</span>
              <input
                v-model="newPassword"
                type="password"
                class="profile-view__input"
                placeholder="••••••••"
                minlength="6"
                autocomplete="new-password"
              />
            </label>
            <label class="profile-view__field">
              <span class="profile-view__label">Confirm new password</span>
              <input
                v-model="confirmPassword"
                type="password"
                class="profile-view__input"
                placeholder="••••••••"
                minlength="6"
                autocomplete="new-password"
              />
            </label>
            <p v-if="passwordError" class="profile-view__error">{{ passwordError }}</p>
            <p v-if="passwordSuccess" class="profile-view__success">{{ passwordSuccess }}</p>
            <button
              type="submit"
              class="profile-view__btn profile-view__btn--primary"
              :disabled="passwordSubmitting"
            >
              {{ passwordSubmitting ? 'Updating…' : 'Change password' }}
            </button>
          </form>
        </section>

        <!-- Logout -->
        <section class="profile-view__section profile-view__section--actions">
          <button
            type="button"
            class="profile-view__btn profile-view__btn--logout"
            @click="$emit('logout')"
          >
            Sign out
          </button>
        </section>
      </template>
    </main>

    <!-- Camera capture modal -->
    <div v-if="showCameraModal" class="profile-view__camera-overlay" @click.self="closeCamera">
      <div class="profile-view__camera-modal">
        <h3 class="profile-view__camera-title">Capture avatar</h3>
        <p v-if="cameraError" class="profile-view__camera-error">{{ cameraError }}</p>
        <template v-else>
          <div class="profile-view__camera-preview">
            <video
              ref="cameraVideo"
              autoplay
              playsinline
              muted
              class="profile-view__camera-video"
            />
          </div>
          <div class="profile-view__camera-actions">
            <button
              type="button"
              class="profile-view__btn profile-view__btn--primary"
              @click="captureFromCamera"
            >
              Take photo
            </button>
            <button
              type="button"
              class="profile-view__btn profile-view__btn--secondary"
              @click="closeCamera"
            >
              Cancel
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { api, ROLES } from '../api.js'
import { assertCameraSecureContext } from '../utils/camera.js'

const emit = defineEmits(['back', 'logout', 'profile-updated'])

const user = ref(null)
const loading = ref(true)
const error = ref('')
const fullName = ref('')
const avatarUrl = ref('')
const profileSubmitting = ref(false)

const showCameraModal = ref(false)
const cameraVideo = ref(null)
const cameraStream = ref(null)
const cameraError = ref('')
const cameraStarting = ref(false)

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordError = ref('')
const passwordSuccess = ref('')
const passwordSubmitting = ref(false)

const roleLabel = computed(() => (user.value?.role ? ROLES[user.value.role] || user.value.role : ''))

const initials = computed(() => {
  const n = user.value?.fullName || ''
  const parts = n.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return n.slice(0, 2).toUpperCase() || '?'
})

const avatarIsFromCamera = computed(() =>
  typeof avatarUrl.value === 'string' && avatarUrl.value.startsWith('data:')
)

async function loadProfile() {
  loading.value = true
  error.value = ''
  try {
    const res = await api('/users/me')
    if (res.status === 401) {
      return
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      error.value = data.error || `Failed to load profile (${res.status})`
      return
    }
    user.value = await res.json()
    fullName.value = user.value.fullName || ''
    avatarUrl.value = user.value.avatar?.url || ''
    emit('profile-updated', user.value)
  } catch (e) {
    error.value = e.message || 'Failed to load profile'
  } finally {
    loading.value = false
  }
}

async function saveProfile() {
  profileSubmitting.value = true
  error.value = ''
  try {
    const res = await api('/users/me', {
      method: 'PATCH',
      body: JSON.stringify({
        fullName: fullName.value || undefined,
        avatarUrl: avatarUrl.value || undefined,
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      error.value = data.error || 'Failed to update profile'
      return
    }
    user.value = await res.json()
    fullName.value = user.value.fullName || ''
    avatarUrl.value = user.value.avatar?.url || ''
    emit('profile-updated', user.value)
  } catch (e) {
    error.value = e.message || 'Failed to update profile'
  } finally {
    profileSubmitting.value = false
  }
}

async function changePassword() {
  passwordError.value = ''
  passwordSuccess.value = ''
  if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
    passwordError.value = 'All password fields are required'
    return
  }
  if (newPassword.value.length < 6) {
    passwordError.value = 'New password must be at least 6 characters'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'New password and confirmation do not match'
    return
  }
  passwordSubmitting.value = true
  try {
    const res = await api('/users/me/change-password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: currentPassword.value,
        newPassword: newPassword.value,
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      passwordError.value = data.error || 'Failed to change password'
      return
    }
    passwordSuccess.value = 'Password updated successfully'
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (e) {
    passwordError.value = e.message || 'Failed to change password'
  } finally {
    passwordSubmitting.value = false
  }
}

async function openCamera() {
  cameraError.value = ''
  cameraStarting.value = true
  showCameraModal.value = true
  try {
    assertCameraSecureContext()
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 400 }, height: { ideal: 400 } },
      audio: false,
    })
    cameraStream.value = stream
    cameraStarting.value = false
    await nextTick()
    if (cameraVideo.value) {
      cameraVideo.value.srcObject = stream
    }
  } catch (e) {
    cameraError.value =
      e.name === 'NotAllowedError'
        ? 'Camera access denied. Please allow camera permission and try again.'
        : e.name === 'InsecureContextError'
          ? e.message
          : e.message || 'Could not access camera'
    cameraStarting.value = false
  }
}

function closeCamera() {
  if (cameraStream.value) {
    cameraStream.value.getTracks().forEach((t) => t.stop())
    cameraStream.value = null
  }
  if (cameraVideo.value) {
    cameraVideo.value.srcObject = null
  }
  showCameraModal.value = false
  cameraError.value = ''
}

function captureFromCamera() {
  const video = cameraVideo.value
  if (!video || !video.videoWidth) return
  const canvas = document.createElement('canvas')
  const size = Math.min(video.videoWidth, video.videoHeight)
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const sx = (video.videoWidth - size) / 2
  const sy = (video.videoHeight - size) / 2
  ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size)
  avatarUrl.value = canvas.toDataURL('image/jpeg', 0.85)
  closeCamera()
}

onMounted(loadProfile)
onUnmounted(closeCamera)
</script>

<style scoped>
.profile-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 1.5rem 20%;
  padding-bottom: 2rem;
}

.profile-view__header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.profile-view__back {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 12px;
  color: #fff;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background 0.2s;
}

.profile-view__back:hover {
  background: rgba(255, 255, 255, 0.25);
}

.profile-view__back svg {
  width: 20px;
  height: 20px;
}

.profile-view__title {
  font-size: 1.5rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
}

.profile-view__main {
  flex: 1;
  max-width: 480px;
}

.profile-view__loading,
.profile-view__error {
  padding: 1rem 0;
  font-size: 0.95rem;
}

.profile-view__error {
  color: #ffb3b3;
}

.profile-view__success {
  padding: 0.5rem 0;
  font-size: 0.9rem;
  color: #a8e6a0;
}

.profile-view__section {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  backdrop-filter: blur(12px);
}

.profile-view__section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin-bottom: 1.25rem;
}

.profile-view__avatar-row {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
  margin-bottom: 1.25rem;
}

.profile-view__avatar-wrap {
  flex-shrink: 0;
}

.profile-view__avatar,
.profile-view__avatar-placeholder {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
}

.profile-view__avatar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 1.5rem;
  font-weight: 600;
}

.profile-view__avatar-form {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.profile-view__fields,
.profile-view__form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.profile-view__field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.profile-view__label {
  font-size: 0.85rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
}

.profile-view__input {
  padding: 0.6rem 0.85rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(0, 0, 0, 0.15);
  color: #fff;
  font-size: 0.95rem;
  outline: none;
}

.profile-view__input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.profile-view__input:focus {
  border-color: rgba(255, 255, 255, 0.6);
}

.profile-view__field--readonly .profile-view__input {
  opacity: 0.8;
  cursor: not-allowed;
}

.profile-view__btn {
  padding: 0.65rem 1.25rem;
  border-radius: 12px;
  border: none;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.15s, background 0.2s;
}

.profile-view__btn--primary {
  background: #fff;
  color: #163645;
  align-self: flex-start;
}

.profile-view__btn--primary:hover:not(:disabled) {
  background: #f0f4f8;
  transform: translateY(-1px);
}

.profile-view__btn--primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.profile-view__btn--secondary {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.35);
}

.profile-view__btn--secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
}

.profile-view__link {
  background: none;
  border: none;
  padding: 0;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
  text-decoration: underline;
  cursor: pointer;
}

.profile-view__link:hover {
  color: #fff;
}

.profile-view__section--actions {
  border: none;
  background: transparent;
  padding: 0;
}

.profile-view__btn--logout {
  background: rgba(255, 100, 100, 0.25);
  color: #ffb3b3;
  border: 1px solid rgba(255, 100, 100, 0.4);
}

.profile-view__btn--logout:hover {
  background: rgba(255, 100, 100, 0.35);
}

@media (max-width: 600px) {
  .profile-view {
    padding-left: 10%;
    padding-right: 10%;
  }

  .profile-view__avatar-row {
    flex-direction: column;
  }
}

/* Camera modal */
.profile-view__camera-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}

.profile-view__camera-modal {
  width: 100%;
  max-width: 360px;
  padding: 1.5rem;
  background: #163645;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.profile-view__camera-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #fff;
  margin-bottom: 1rem;
}

.profile-view__camera-error {
  font-size: 0.9rem;
  color: #ffb3b3;
}

.profile-view__camera-preview {
  position: relative;
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
  background: #000;
  margin-bottom: 1rem;
}

.profile-view__camera-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-view__camera-actions {
  display: flex;
  gap: 0.75rem;
}
</style>
