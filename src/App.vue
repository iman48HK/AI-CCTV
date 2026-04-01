<template>
  <div v-if="!isAuthenticated" class="app">
    <LoginForm :session-expired="sessionExpired" @logged-in="handleLoggedIn" />
  </div>
  <div v-else class="app app--with-sidebar" :class="{ 'app--sidebar-collapsed': sidebarCollapsed }">
    <AppSidebar
      :current-view="currentView"
      :capture-count="captureCount"
      :cctvs-count="cctvsCount"
      :alerts-count="alertsCount"
      :users-count="usersCount"
      :auth-user="authUser"
      :avatar-url="avatarUrl"
      :collapsed="sidebarCollapsed"
      :mobile-open="sidebarMobileOpen"
      @navigate="handleSidebarNavigate"
      @close="sidebarMobileOpen = false"
      @update:collapsed="sidebarCollapsed = $event"
    />

    <button
      type="button"
      class="app__menu-btn"
      aria-label="Open menu"
      @click="sidebarMobileOpen = true"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M3 12h18M3 6h18M3 18h18" />
      </svg>
    </button>

    <main class="app__main">
      <div v-if="currentView === 'users'" class="app__view">
        <UsersView
          :auth-user="authUser"
          @back="currentView = 'dashboard'"
          @open-departments="currentView = 'departments'"
        />
      </div>
      <div v-else-if="currentView === 'departments'" class="app__view">
        <DepartmentsView @back="currentView = 'users'" />
      </div>
      <div v-else-if="currentView === 'profile'" class="app__view">
        <ProfileView
          @back="currentView = 'dashboard'"
          @logout="handleLogout"
        />
      </div>
      <div v-else-if="currentView === 'capture'" class="app__view">
        <CaptureView @back="currentView = 'dashboard'" />
      </div>
      <div v-else-if="currentView === 'cctvs'" class="app__view">
        <CCTVsView :auth-user="authUser" @back="currentView = 'dashboard'" />
      </div>
      <div v-else-if="currentView === 'settings'" class="app__view">
        <SettingsView :auth-user="authUser" @back="currentView = 'dashboard'" />
      </div>
      <div v-else-if="currentView === 'alerts'" class="app__view">
        <AlertsView @back="currentView = 'dashboard'" />
      </div>
      <div v-else class="app__view">
        <DashboardView
          :refresh-trigger="dashboardRefreshTrigger"
          @navigate="handleSidebarNavigate"
        />
      </div>

      <footer class="app__footer">
        <span class="app__copyright">© 2026 CCTV · v1.0</span>
      </footer>
    </main>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { api } from './api.js'
import AppSidebar from './components/AppSidebar.vue'
import LoginForm from './components/LoginForm.vue'
import UsersView from './views/UsersView.vue'
import DepartmentsView from './views/DepartmentsView.vue'
import CaptureView from './views/CaptureView.vue'
import CCTVsView from './views/CCTVsView.vue'
import SettingsView from './views/SettingsView.vue'
import ProfileView from './views/ProfileView.vue'
import DashboardView from './views/DashboardView.vue'
import AlertsView from './views/AlertsView.vue'

const dashboardRefreshTrigger = ref(0)
const currentView = ref('dashboard')
const sidebarCollapsed = ref(false)
const sidebarMobileOpen = ref(false)
const captureCount = ref(0)
const cctvsCount = ref(0)
const alertsCount = ref(0)
const usersCount = ref(0)
const authUser = ref(null)
const avatarUrl = computed(() => authUser.value?.avatar?.url || '')
const isAuthenticated = ref(false)
const sessionExpired = ref(false)

function onSessionExpired() {
  handleLogout()
  sessionExpired.value = true
}

onMounted(() => {
  window.addEventListener('auth:session-expired', onSessionExpired)

  const token = localStorage.getItem('authToken')
  isAuthenticated.value = !!token
  try {
    const u = localStorage.getItem('authUser')
    authUser.value = u ? JSON.parse(u) : null
  } catch (_) {}
  fetchDashboardCounts()
})
watch(currentView, (v) => {
  if (v === 'dashboard') {
    fetchDashboardCounts()
    dashboardRefreshTrigger.value++
  } else if (v === 'alerts') {
    fetchDashboardCounts()
  }
})

async function fetchDashboardCounts() {
  if (!isAuthenticated.value) return
  try {
    const [peopleRes, camerasRes, usersRes, statsRes] = await Promise.all([
      api('/people'),
      api('/cameras'),
      api('/users'),
      api('/dashboard/stats'),
    ])
    if (peopleRes.ok) captureCount.value = (await peopleRes.json()).length
    if (camerasRes.ok) cctvsCount.value = (await camerasRes.json()).length
    if (usersRes.ok) usersCount.value = (await usersRes.json()).length
    if (statsRes.ok) {
      const s = await statsRes.json()
      alertsCount.value = s.alertsTotal ?? 0
    }
  } catch (_) {}
}
onUnmounted(() => {
  window.removeEventListener('auth:session-expired', onSessionExpired)
})

function handleLoggedIn(data) {
  sessionExpired.value = false
  isAuthenticated.value = true
  authUser.value = data?.user ?? null
  if (data?.user) localStorage.setItem('authUser', JSON.stringify(data.user))
}

function handleLogout() {
  localStorage.removeItem('authToken')
  localStorage.removeItem('authUser')
  isAuthenticated.value = false
  authUser.value = null
  currentView.value = 'dashboard'
  sessionExpired.value = false
}

function handleSidebarNavigate(route) {
  currentView.value = route
}

function navigate(route) {
  if (['users', 'capture', 'cctvs', 'settings', 'profile', 'alerts', 'dashboard'].includes(route)) {
    currentView.value = route
  }
}
</script>

<style scoped>
.app {
  min-height: 100vh;
}

.app--with-sidebar {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app__menu-btn {
  display: none;
  position: fixed;
  top: 1rem;
  left: 1rem;
  z-index: 90;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow);
  transition: background 0.2s, transform 0.2s;
}

.app__menu-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.app__menu-btn svg {
  width: 22px;
  height: 22px;
}

.app__main {
  position: relative;
  flex: 1;
  margin-left: calc(260px + 24px);
  margin-top: 12px;
  margin-right: 12px;
  margin-bottom: 12px;
  min-height: 0;
  transition: margin-left var(--transition);
}

.app--sidebar-collapsed .app__main {
  margin-left: calc(72px + 24px);
}

.app__view {
  min-height: 100%;
  padding: 1rem 0;
}

.app__footer {
  margin-top: auto;
  padding: 1.5rem 0.5rem 0.5rem;
  text-align: center;
}

.app__copyright {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 500;
}

/* Tablet/mobile: sidebar overlay, show menu button */
@media (max-width: 900px) {
  .app__main {
    margin-left: 12px;
    margin-top: 60px;
  }

  .app--sidebar-collapsed .app__main {
    margin-left: 12px;
  }

  .app__menu-btn {
    display: flex;
  }
}

/* Mobile: 1 column */
@media (max-width: 600px) {
  .dashboard {
    padding-left: 10%;
    padding-right: 10%;
    padding-bottom: 1.5rem;
  }

  .dashboard__grid {
    grid-template-columns: 1fr;
    grid-template-rows: repeat(6, auto);
    gap: 20px;
    max-width: 280px;
  }

  .dashboard__header {
    flex-direction: column;
    align-items: flex-start;
    margin-bottom: 1.25rem;
  }

  .dashboard__title {
    font-size: 1.1rem;
  }

  .dashboard__footer {
    padding-top: 1.5rem;
  }
}
</style>
