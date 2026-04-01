<template>
  <div class="dashboard-view">
    <header class="dashboard-view__header">
      <h1 class="dashboard-view__title">Dashboard</h1>
      <span class="dashboard-view__datetime">
        <time class="dashboard-view__time" :datetime="timeISO">{{ currentTime }}</time>
        <time class="dashboard-view__date" :datetime="todayISO">{{ today }}</time>
      </span>
    </header>

    <main class="dashboard-view__main">
      <p v-if="error" class="dashboard-view__error">{{ error }}</p>
      <p v-else-if="loading" class="dashboard-view__loading">Loading…</p>

      <template v-else>
        <!-- Stats cards -->
        <section class="dashboard-view__stats">
          <div class="dashboard-view__stat-card" @click="$emit('navigate', 'cctvs')">
            <span class="dashboard-view__stat-icon dashboard-view__stat-icon--cctv">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M18 10h-2V8c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-2h2c1.1 0 2-.9 2-2v-4c0-1.1-.9-2-2-2z" />
                <circle cx="12" cy="13" r="2.5" />
              </svg>
            </span>
            <span class="dashboard-view__stat-value">{{ stats.cctvs }}</span>
            <span class="dashboard-view__stat-label">CCTVs</span>
          </div>

          <div class="dashboard-view__stat-card" @click="$emit('navigate', 'users')">
            <span class="dashboard-view__stat-icon dashboard-view__stat-icon--users">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </span>
            <span class="dashboard-view__stat-value">{{ usersTotal }}</span>
            <span class="dashboard-view__stat-label">Users</span>
          </div>

          <div class="dashboard-view__stat-card" @click="$emit('navigate', 'capture')">
            <span class="dashboard-view__stat-icon dashboard-view__stat-icon--visitors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
                <path d="M19 12a7 7 0 1 0-14 0 7 7 0 0 0 14 0z" />
              </svg>
            </span>
            <span class="dashboard-view__stat-value">{{ stats.visitors }}</span>
            <span class="dashboard-view__stat-label">Visitors</span>
          </div>

          <div class="dashboard-view__stat-card" @click="$emit('navigate', 'alerts')">
            <span class="dashboard-view__stat-icon dashboard-view__stat-icon--alerts">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </span>
            <span class="dashboard-view__stat-value">{{ stats.alertsTotal }}</span>
            <span class="dashboard-view__stat-label">Alerts</span>
          </div>
        </section>

        <!-- Users by role -->
        <section class="dashboard-view__section">
          <h2 class="dashboard-view__section-title">Users by Role</h2>
          <div class="dashboard-view__role-grid">
            <div
              v-for="(count, role) in stats.usersByRole"
              :key="role"
              class="dashboard-view__role-item"
            >
              <span class="dashboard-view__role-name">{{ role }}</span>
              <span class="dashboard-view__role-count">{{ count }}</span>
            </div>
            <p v-if="Object.keys(stats.usersByRole || {}).length === 0" class="dashboard-view__empty">
              No users yet.
            </p>
          </div>
        </section>

        <!-- Alerts by period -->
        <section class="dashboard-view__section">
          <h2 class="dashboard-view__section-title">Alerts by Period</h2>
          <div class="dashboard-view__alerts-chart">
            <div
              v-for="(count, date) in alertsByPeriodSorted"
              :key="date"
              class="dashboard-view__alerts-bar-wrap"
            >
              <div class="dashboard-view__alerts-bar" :style="{ height: barHeight(count) + '%' }" />
              <span class="dashboard-view__alerts-date">{{ formatDateShort(date) }}</span>
              <span class="dashboard-view__alerts-count">{{ count }}</span>
            </div>
            <p v-if="Object.keys(stats.alertsByPeriod || {}).length === 0" class="dashboard-view__empty">
              No alerts in this period.
            </p>
          </div>
        </section>

        <!-- Quick navigation -->
        <section class="dashboard-view__quick-nav">
          <button type="button" class="dashboard-view__quick-btn" @click="$emit('navigate', 'capture')">
            Capture
          </button>
          <button type="button" class="dashboard-view__quick-btn" @click="$emit('navigate', 'cctvs')">
            CCTVs
          </button>
          <button type="button" class="dashboard-view__quick-btn" @click="$emit('navigate', 'alerts')">
            Alerts
          </button>
          <button type="button" class="dashboard-view__quick-btn" @click="$emit('navigate', 'users')">
            Users
          </button>
          <button type="button" class="dashboard-view__quick-btn" @click="$emit('navigate', 'settings')">
            Settings
          </button>
          <button type="button" class="dashboard-view__quick-btn" @click="$emit('navigate', 'profile')">
            Me
          </button>
        </section>
      </template>
    </main>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { api } from '../api.js'

const props = defineProps({
  refreshTrigger: { type: Number, default: 0 },
})

defineEmits(['navigate'])

const stats = ref({
  cctvs: 0,
  visitors: 0,
  usersByRole: {},
  alertsByPeriod: {},
  alertsTotal: 0,
})
const loading = ref(true)
const error = ref('')
const currentTime = ref('')

function updateTime() {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
}

const usersTotal = computed(() => {
  const u = stats.value.usersByRole || {}
  return Object.values(u).reduce((s, n) => s + n, 0)
})

const alertsByPeriodSorted = computed(() => {
  const p = stats.value.alertsByPeriod || {}
  return Object.fromEntries(
    Object.entries(p).sort(([a], [b]) => b.localeCompare(a)).slice(0, 14)
  )
})

const maxAlertCount = computed(() => {
  const vals = Object.values(stats.value.alertsByPeriod || {})
  return Math.max(1, ...vals)
})

function barHeight(count) {
  if (maxAlertCount.value <= 0) return 0
  return Math.round((count / maxAlertCount.value) * 100)
}

function formatDateShort(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

const today = computed(() =>
  new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
)
const todayISO = computed(() => new Date().toISOString().slice(0, 10))
const timeISO = computed(() => {
  const now = new Date()
  return now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0')
})

async function fetchStats() {
  loading.value = true
  error.value = ''
  try {
    const res = await api('/dashboard/stats')
    if (!res.ok) throw new Error('Failed to load stats')
    stats.value = await res.json()
  } catch (e) {
    error.value = e.message || 'Failed to load dashboard'
  } finally {
    loading.value = false
  }
}

let timeInterval
onMounted(() => {
  updateTime()
  timeInterval = setInterval(updateTime, 1000)
  fetchStats()
})
onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval)
})
watch(() => props.refreshTrigger, fetchStats)
</script>

<style scoped>
.dashboard-view {
  padding: 0 0.5rem;
}

.dashboard-view__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.dashboard-view__title {
  font-size: 1.5rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  letter-spacing: 0.02em;
}

.dashboard-view__datetime {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.75);
}

.dashboard-view__time {
  font-variant-numeric: tabular-nums;
}

.dashboard-view__error,
.dashboard-view__loading {
  color: rgba(255, 255, 255, 0.9);
}

.dashboard-view__stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.dashboard-view__stat-card {
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: var(--radius);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: background var(--transition), transform var(--transition);
}

.dashboard-view__stat-card:hover {
  background: var(--bg-card-active);
  transform: translateY(-2px);
}

.dashboard-view__stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dashboard-view__stat-icon svg {
  width: 22px;
  height: 22px;
  color: #fff;
}

.dashboard-view__stat-icon--cctv { background: rgba(61, 139, 168, 0.5); }
.dashboard-view__stat-icon--users { background: rgba(96, 165, 250, 0.5); }
.dashboard-view__stat-icon--visitors { background: rgba(74, 222, 128, 0.5); }
.dashboard-view__stat-icon--alerts { background: rgba(251, 146, 60, 0.5); }

.dashboard-view__stat-value {
  font-size: 1.75rem;
  font-weight: 600;
  color: #fff;
}

.dashboard-view__stat-label {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
}

.dashboard-view__section {
  margin-bottom: 2rem;
}

.dashboard-view__section-title {
  font-size: 1rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 1rem;
}

.dashboard-view__role-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 0.75rem;
}

.dashboard-view__role-item {
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: 0.75rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dashboard-view__role-name {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.9);
}

.dashboard-view__role-count {
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
}

.dashboard-view__alerts-chart {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  min-height: 120px;
  flex-wrap: wrap;
}

.dashboard-view__alerts-bar-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  flex: 1;
  min-width: 40px;
}

.dashboard-view__alerts-bar {
  width: 100%;
  max-width: 32px;
  min-height: 4px;
  background: rgba(61, 139, 168, 0.6);
  border-radius: 6px 6px 0 0;
  transition: height 0.3s ease;
}

.dashboard-view__alerts-date {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.6);
}

.dashboard-view__alerts-count {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.dashboard-view__quick-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.dashboard-view__quick-btn {
  padding: 0.5rem 1rem;
  border-radius: 10px;
  border: 1px solid var(--card-border);
  background: var(--bg-card);
  color: #fff;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.dashboard-view__quick-btn:hover {
  background: var(--bg-card-active);
}

.dashboard-view__empty {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
}

@media (max-width: 600px) {
  .dashboard-view__stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .dashboard-view__role-grid {
    grid-template-columns: 1fr;
  }
}
</style>
