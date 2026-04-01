<template>
  <div class="login">
    <div class="login__card">
      <h1 class="login__title">AI CCTV Dashboard</h1>
      <p class="login__subtitle">Sign in with your hospital account</p>
      <p v-if="sessionExpired" class="login__session-expired">Your session has expired. Please sign in again.</p>

      <form class="login__form" @submit.prevent="onSubmit">
        <label class="login__field">
          <span class="login__label">Email</span>
          <input
            v-model="email"
            type="email"
            required
            autocomplete="username"
            class="login__input"
            placeholder="you@example.com"
          />
        </label>

        <label class="login__field">
          <span class="login__label">Password</span>
          <input
            v-model="password"
            type="password"
            required
            minlength="6"
            autocomplete="current-password"
            class="login__input"
            placeholder="••••••••"
          />
        </label>

        <p v-if="error" class="login__error">{{ error }}</p>

        <button type="submit" class="login__button" :disabled="submitting">
          <span v-if="!submitting">Sign in</span>
          <span v-else>Signing in…</span>
        </button>
      </form>

      <p class="login__hint">
        First-time setup: ask IT for the
        <strong>system admin</strong> account.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({ sessionExpired: { type: Boolean, default: false } })
const emit = defineEmits(['logged-in'])

const email = ref('')
const password = ref('')
const error = ref('')
const submitting = ref(false)

const API_BASE = '/api'

function getErrorMessage(err, fallback) {
  if (!err) return fallback
  if (err.message?.includes('Failed to fetch') || err.message?.includes('Load failed')) {
    return 'Cannot reach the API. Start MongoDB (Windows: Admin PowerShell → Start-Service MongoDB), then run npm run dev:all from the project root—or two terminals: npm run dev and npm run dev:backend.'
  }
  if (err.message?.includes('NetworkError') || err.message?.includes('network')) {
    return 'Network error. Ensure MongoDB is running and the backend is listening on port 4000 (npm run dev:all or cd backend && npm run dev).'
  }
  return err.message || fallback
}

async function onSubmit() {
  error.value = ''
  submitting.value = true
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value }),
    })

    if (!res.ok) {
      const text = await res.text()
      let data = {}
      try {
        data = text ? JSON.parse(text) : {}
      } catch {
        const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 180)
        error.value = snippet
          ? `Login failed (${res.status}). Response was not JSON — is the API running on port 4000? (${snippet})`
          : `Login failed (${res.status}). Is the API running? Try: npm run dev:all`
        submitting.value = false
        return
      }
      const base = data.error || `Login failed (${res.status})`
      error.value = data.detail ? `${base} (${data.detail})` : base
      submitting.value = false
      return
    }

    const textOk = await res.text()
    let data
    try {
      data = JSON.parse(textOk)
    } catch {
      error.value = 'Invalid response from server (not JSON).'
      submitting.value = false
      return
    }
    localStorage.setItem('authToken', data.token)
    localStorage.setItem('authUser', JSON.stringify(data.user))

    emit('logged-in', data)
  } catch (e) {
    error.value = getErrorMessage(e, 'Unable to reach the API. Start MongoDB, then run npm run dev:all from the project root.')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.login__card {
  width: 100%;
  max-width: 420px;
  padding: 2.25rem 2rem;
  border-radius: 32px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(18px);
  color: #fff;
}

.login__title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.login__subtitle {
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 1.75rem;
}

.login__form {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.login__field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.login__label {
  font-size: 0.85rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
}

.login__input {
  padding: 0.6rem 0.75rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(0, 0, 0, 0.12);
  color: #fff;
  font-size: 0.95rem;
  outline: none;
}

.login__input::placeholder {
  color: rgba(255, 255, 255, 0.55);
}

.login__input:focus-visible {
  border-color: #fff;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.6);
}

.login__button {
  margin-top: 0.5rem;
  width: 100%;
  padding: 0.7rem 1.2rem;
  border-radius: 999px;
  border: none;
  background: #ffffff;
  color: #163645;
  font-weight: 600;
  font-size: 0.98rem;
  cursor: pointer;
  transition:
    background 0.2s ease,
    transform 0.15s ease,
    box-shadow 0.15s ease;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.35);
}

.login__button:hover:enabled {
  background: #f4f7fb;
  transform: translateY(-1px);
}

.login__button:active:enabled {
  transform: translateY(1px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4);
}

.login__button:disabled {
  opacity: 0.7;
  cursor: default;
}

.login__error {
  font-size: 0.85rem;
  color: #ffd2d2;
}

.login__session-expired {
  font-size: 0.9rem;
  color: #ffc07d;
  margin-bottom: 0.5rem;
}

.login__hint {
  margin-top: 1.25rem;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.75);
}
</style>

