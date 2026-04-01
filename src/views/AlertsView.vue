<template>
  <div class="alerts-view">
    <header class="alerts-view__header">
      <button type="button" class="alerts-view__back" @click="$emit('back')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back
      </button>
      <h1 class="alerts-view__title">Alerts</h1>
    </header>

    <main class="alerts-view__main">
      <!-- Search bar -->
      <div class="alerts-view__search-wrap">
        <span class="alerts-view__search-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </span>
        <input
          v-model="searchQuery"
          type="search"
          class="alerts-view__search"
          placeholder="Search alerts by message or type…"
          @input="debouncedSearch"
        />
      </div>

      <!-- Filters -->
      <div class="alerts-view__filters">
        <label class="alerts-view__filter">
          <span>From</span>
          <input v-model="dateFrom" type="date" class="alerts-view__input" />
        </label>
        <label class="alerts-view__filter">
          <span>To</span>
          <input v-model="dateTo" type="date" class="alerts-view__input" />
        </label>
        <label class="alerts-view__filter">
          <span>Type</span>
          <select v-model="typeFilter" class="alerts-view__select">
            <option value="">All</option>
            <option value="unknown_face">Unknown Face</option>
            <option value="recognized">Recognized</option>
            <option value="fall_detected">Fall Detected</option>
            <option value="intrusion">Intrusion</option>
            <option value="offline_camera">Offline Camera</option>
            <option value="other">Other</option>
          </select>
        </label>
        <button type="button" class="alerts-view__btn" @click="fetchAlerts">
          Search
        </button>
      </div>

      <p v-if="error" class="alerts-view__error">{{ error }}</p>
      <p v-else-if="loading" class="alerts-view__loading">Loading…</p>
      <p v-else-if="alerts.length === 0" class="alerts-view__empty">
        No alerts found. {{ searchQuery || dateFrom || dateTo || typeFilter ? 'Try different filters.' : '' }}
      </p>

      <div v-else class="alerts-view__list">
        <article
          v-for="a in alerts"
          :key="a._id"
          class="alerts-view__card"
          :class="`alerts-view__card--${a.type || 'other'}`"
        >
          <span class="alerts-view__card-type">{{ typeLabel(a.type) }}</span>
          <p class="alerts-view__card-message">{{ a.message }}</p>
          <div class="alerts-view__card-meta">
            <span v-if="a.camera?.name" class="alerts-view__card-camera">{{ a.camera.name }}</span>
            <span v-if="a.person?.name" class="alerts-view__card-person">{{ a.person.name }}</span>
            <time :datetime="a.createdAt">{{ formatDate(a.createdAt) }}</time>
          </div>
        </article>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { api } from '../api.js'

defineEmits(['back'])

const alerts = ref([])
const loading = ref(false)
const error = ref('')
const searchQuery = ref('')
const dateFrom = ref('')
const dateTo = ref('')
const typeFilter = ref('')

let searchTimeout

function typeLabel(type) {
  const labels = {
    unknown_face: 'Unknown Face',
    recognized: 'Recognized',
    fall_detected: 'Fall Detected',
    intrusion: 'Intrusion',
    offline_camera: 'Offline Camera',
  }
  return labels[type] || 'Other'
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function debouncedSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(fetchAlerts, 300)
}

function buildQuery() {
  const params = new URLSearchParams()
  if (searchQuery.value.trim()) params.set('search', searchQuery.value.trim())
  if (dateFrom.value) params.set('from', dateFrom.value)
  if (dateTo.value) params.set('to', dateTo.value)
  if (typeFilter.value) params.set('type', typeFilter.value)
  return params.toString()
}

async function fetchAlerts() {
  loading.value = true
  error.value = ''
  try {
    const q = buildQuery()
    const res = await api(`/alerts${q ? `?${q}` : ''}`)
    if (!res.ok) throw new Error('Failed to load alerts')
    alerts.value = await res.json()
  } catch (e) {
    error.value = e.message || 'Failed to load alerts'
    alerts.value = []
  } finally {
    loading.value = false
  }
}

watch([dateFrom, dateTo, typeFilter], fetchAlerts)

fetchAlerts()
</script>

<style scoped>
.alerts-view {
  padding: 0 0.5rem;
}

.alerts-view__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.alerts-view__back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 10px;
  background: var(--bg-card);
  color: #fff;
  cursor: pointer;
  transition: background 0.2s;
}

.alerts-view__back:hover {
  background: var(--bg-card-active);
}

.alerts-view__back svg {
  width: 20px;
  height: 20px;
}

.alerts-view__title {
  font-size: 1.5rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
}

.alerts-view__search-wrap {
  position: relative;
  margin-bottom: 1rem;
}

.alerts-view__search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: rgba(255, 255, 255, 0.5);
}

.alerts-view__search-icon svg {
  width: 100%;
  height: 100%;
}

.alerts-view__search {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 3rem;
  border-radius: 12px;
  border: 1px solid var(--card-border);
  background: var(--bg-card);
  color: #fff;
  font-size: 1rem;
}

.alerts-view__search::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.alerts-view__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.alerts-view__filter {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.alerts-view__filter span {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
}

.alerts-view__input,
.alerts-view__select {
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--card-border);
  background: var(--bg-card);
  color: #fff;
  font-size: 0.9rem;
}

.alerts-view__select option {
  background: #163645;
  color: #fff;
}

.alerts-view__btn {
  align-self: flex-end;
  padding: 0.5rem 1.25rem;
  border-radius: 8px;
  border: none;
  background: rgba(61, 139, 168, 0.8);
  color: #fff;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.alerts-view__btn:hover {
  background: rgba(61, 139, 168, 1);
}

.alerts-view__error,
.alerts-view__loading,
.alerts-view__empty {
  color: rgba(255, 255, 255, 0.9);
}

.alerts-view__list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.alerts-view__card {
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  border-left: 4px solid rgba(61, 139, 168, 0.8);
}

.alerts-view__card--unknown_face { border-left-color: #f59e0b; }
.alerts-view__card--fall_detected { border-left-color: #ef4444; }
.alerts-view__card--intrusion { border-left-color: #ef4444; }
.alerts-view__card--recognized { border-left-color: #22c55e; }
.alerts-view__card--offline_camera { border-left-color: #94a3b8; }

.alerts-view__card-type {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 0.35rem;
}

.alerts-view__card-message {
  font-size: 0.95rem;
  color: #fff;
  margin: 0 0 0.5rem 0;
  line-height: 1.4;
}

.alerts-view__card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
}

.alerts-view__card-camera,
.alerts-view__card-person {
  color: rgba(255, 255, 255, 0.8);
}

@media (max-width: 600px) {
  .alerts-view__filters {
    flex-direction: column;
  }
}
</style>
