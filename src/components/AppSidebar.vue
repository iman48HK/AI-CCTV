<template>
  <aside
    class="sidebar"
    :class="{
      'sidebar--collapsed': collapsed,
      'sidebar--open': mobileOpen,
    }"
  >
    <div class="sidebar__inner">
      <!-- Top: Brand + collapse toggle -->
      <div class="sidebar__brand">
        <div class="sidebar__logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M18 10h-2V8c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-2h2c1.1 0 2-.9 2-2v-4c0-1.1-.9-2-2-2z" />
            <circle cx="12" cy="13" r="2.5" />
          </svg>
        </div>
        <span v-show="!collapsed" class="sidebar__brand-name"><span>AI CCTV</span><span>Dashboard</span></span>
        <button
          type="button"
          class="sidebar__toggle"
          :aria-label="collapsed ? 'Expand menu' : 'Collapse menu'"
          @click="emit('update:collapsed', !collapsed)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path v-if="collapsed" d="M9 18l6-6-6-6" />
            <path v-else d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      <!-- MENU section -->
      <nav class="sidebar__nav">
        <span class="sidebar__section-label">MENU</span>
        <ul class="sidebar__list">
          <li>
            <button
              type="button"
              class="sidebar__item"
              :class="{ 'sidebar__item--active': currentView === 'dashboard' }"
              @click="navigate('dashboard')"
            >
              <span class="sidebar__icon" :title="collapsed ? 'Dashboard' : undefined">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </span>
              <span v-show="!collapsed" class="sidebar__label">Dashboard</span>
              <span v-if="collapsed" class="sidebar__tooltip">Dashboard</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              class="sidebar__item"
              :class="{ 'sidebar__item--active': currentView === 'capture' }"
              @click="navigate('capture')"
            >
              <span class="sidebar__icon" :title="collapsed ? `Capture (${captureCount})` : undefined">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                  <path d="M19 12a7 7 0 1 0-14 0 7 7 0 0 0 14 0z" />
                </svg>
              </span>
              <span v-show="!collapsed" class="sidebar__label">Capture ({{ captureCount }})</span>
              <span v-if="collapsed" class="sidebar__tooltip">Capture ({{ captureCount }})</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              class="sidebar__item"
              :class="{ 'sidebar__item--active': currentView === 'cctvs' }"
              @click="navigate('cctvs')"
            >
              <span class="sidebar__icon" :title="collapsed ? `CCTVs (${cctvsCount})` : undefined">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M18 10h-2V8c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-2h2c1.1 0 2-.9 2-2v-4c0-1.1-.9-2-2-2z" />
                  <circle cx="12" cy="13" r="2.5" />
                </svg>
              </span>
              <span v-show="!collapsed" class="sidebar__label">CCTVs ({{ cctvsCount }})</span>
              <span v-if="collapsed" class="sidebar__tooltip">CCTVs ({{ cctvsCount }})</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              class="sidebar__item"
              :class="{ 'sidebar__item--active': currentView === 'alerts' }"
              @click="navigate('alerts')"
            >
              <span class="sidebar__icon sidebar__icon--badge" :title="collapsed ? `Alerts (${alertsCount})` : undefined">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <span v-if="alertsCount > 0" class="sidebar__badge" aria-hidden="true" />
              </span>
              <span v-show="!collapsed" class="sidebar__label">Alerts ({{ alertsCount }})</span>
              <span v-if="collapsed" class="sidebar__tooltip">Alerts ({{ alertsCount }})</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              class="sidebar__item"
              :class="{ 'sidebar__item--active': currentView === 'users' }"
              @click="navigate('users')"
            >
              <span class="sidebar__icon" :title="collapsed ? `Users (${usersCount})` : undefined">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </span>
              <span v-show="!collapsed" class="sidebar__label">Users ({{ usersCount }})</span>
              <span v-if="collapsed" class="sidebar__tooltip">Users ({{ usersCount }})</span>
            </button>
          </li>
        </ul>

        <span v-show="!collapsed" class="sidebar__section-label">CUSTOMIZATION</span>
        <span v-show="collapsed" class="sidebar__section-label">CUSTOM</span>
        <ul class="sidebar__list">
          <li>
            <button
              type="button"
              class="sidebar__item"
              :class="{ 'sidebar__item--active': currentView === 'settings' }"
              @click="navigate('settings')"
            >
              <span class="sidebar__icon" :title="collapsed ? 'Settings' : undefined">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </span>
              <span v-show="!collapsed" class="sidebar__label">Settings</span>
              <span v-if="collapsed" class="sidebar__tooltip">Settings</span>
            </button>
          </li>
        </ul>
      </nav>

      <!-- Bottom: User profile -->
      <div class="sidebar__profile">
        <button
          type="button"
          class="sidebar__profile-btn"
          :class="{ 'sidebar__profile-btn--active': currentView === 'profile' }"
          @click="navigate('profile')"
        >
          <span class="sidebar__profile-avatar" :title="collapsed && authUser ? authUser.fullName : undefined">
            <img v-if="avatarUrl" :src="avatarUrl" alt="" class="sidebar__profile-img" />
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </span>
          <div v-show="!collapsed" class="sidebar__profile-info">
            <span class="sidebar__profile-name">{{ authUser?.fullName || 'Profile' }}</span>
            <span class="sidebar__profile-role">{{ roleLabel }}</span>
          </div>
          <span v-if="collapsed && authUser" class="sidebar__tooltip">{{ authUser.fullName }}</span>
        </button>
      </div>
    </div>

    <!-- Mobile overlay -->
    <div
      v-if="mobileOpen"
      class="sidebar__backdrop"
      aria-hidden="true"
      @click="$emit('close')"
    />
  </aside>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  currentView: { type: String, default: 'dashboard' },
  captureCount: { type: Number, default: 0 },
  cctvsCount: { type: Number, default: 0 },
  alertsCount: { type: Number, default: 0 },
  usersCount: { type: Number, default: 0 },
  authUser: { type: Object, default: null },
  avatarUrl: { type: String, default: '' },
  collapsed: { type: Boolean, default: false },
  mobileOpen: { type: Boolean, default: false },
})

const emit = defineEmits(['navigate', 'close', 'update:collapsed'])

const roleLabel = computed(() => {
  const r = props.authUser?.role
  if (r === 'admin') return 'Admin'
  if (r === 'operator') return 'Operator'
  if (r === 'viewer') return 'Viewer'
  return 'User'
})

function navigate(route) {
  emit('navigate', route)
  emit('close')
}
</script>

<style scoped>
.sidebar {
  --sidebar-bg: #0f2530;
  --sidebar-accent: #3d8ba8;
  --sidebar-text: #ffffff;
  --sidebar-text-muted: rgba(255, 255, 255, 0.65);
  --sidebar-radius: 14px;
  --sidebar-width: 260px;
  --sidebar-collapsed-width: 72px;

  position: fixed;
  top: 12px;
  left: 12px;
  bottom: 12px;
  width: var(--sidebar-width);
  background: var(--sidebar-bg);
  border-radius: var(--sidebar-radius);
  z-index: 100;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);
  transition: width var(--transition), transform var(--transition);
}

.sidebar--collapsed {
  width: var(--sidebar-collapsed-width);
}

.sidebar__inner {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 1.25rem 0;
}

.sidebar__brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0 1rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 1rem;
}

.sidebar--collapsed .sidebar__brand {
  flex-direction: column;
  gap: 0.5rem;
  padding-bottom: 1rem;
}

.sidebar__logo {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--sidebar-accent);
  color: var(--sidebar-text);
  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar__logo svg {
  width: 22px;
  height: 22px;
}

.sidebar__brand-name {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.05rem;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.1;
  color: var(--sidebar-text);
  letter-spacing: 0.01em;
}

.sidebar__brand-name span {
  white-space: nowrap;
}

.sidebar__toggle {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--sidebar-text-muted);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s, background 0.2s;
}

.sidebar__toggle:hover {
  color: var(--sidebar-text);
  background: rgba(255, 255, 255, 0.1);
}

.sidebar__toggle svg {
  width: 18px;
  height: 18px;
}

.sidebar--collapsed .sidebar__brand {
  padding-left: 0.75rem;
  padding-right: 0.75rem;
}

.sidebar__nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 0.75rem;
}

.sidebar__section-label {
  display: block;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--sidebar-text-muted);
  padding: 0.75rem 0.5rem 0.5rem;
}

.sidebar--collapsed .sidebar__section-label {
  text-align: center;
  padding: 0.5rem 0;
}

.sidebar__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.sidebar__list li {
  margin: 0;
}

.sidebar__item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.65rem 0.75rem;
  margin-bottom: 2px;
  border: none;
  background: transparent;
  color: var(--sidebar-text);
  font-family: inherit;
  font-size: 0.9375rem;
  font-weight: 500;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  position: relative;
  text-align: left;
}

.sidebar__item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.sidebar__item--active {
  background: rgba(61, 139, 168, 0.25);
  color: var(--sidebar-accent);
}

.sidebar__item--active .sidebar__icon {
  color: var(--sidebar-accent);
}

.sidebar--collapsed .sidebar__item {
  justify-content: center;
  padding: 0.65rem;
}

.sidebar__icon {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--sidebar-text);
  transition: color 0.2s;
}

.sidebar__icon svg {
  width: 100%;
  height: 100%;
}

.sidebar__item:hover .sidebar__icon {
  color: var(--sidebar-accent);
}

.sidebar__icon--badge {
  position: relative;
}

.sidebar__badge {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff3b30;
}

.sidebar__label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar__tooltip {
  position: absolute;
  left: calc(100% + 12px);
  top: 50%;
  transform: translateY(-50%);
  padding: 0.4rem 0.75rem;
  background: #2d2d2d;
  color: #fff;
  font-size: 0.8125rem;
  font-weight: 500;
  white-space: nowrap;
  border-radius: 8px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
  z-index: 200;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.sidebar__tooltip::before {
  content: '';
  position: absolute;
  right: 100%;
  top: 50%;
  transform: translateY(-50%);
  border: 6px solid transparent;
  border-right-color: #2d2d2d;
}

.sidebar__item:hover .sidebar__tooltip,
.sidebar__profile-btn:hover .sidebar__tooltip {
  opacity: 1;
}

.sidebar__profile {
  padding: 1rem 0.75rem 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.sidebar__profile-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: none;
  background: transparent;
  color: var(--sidebar-text);
  font-family: inherit;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;
  position: relative;
  text-align: left;
}

.sidebar__profile-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

.sidebar__profile-btn--active {
  background: rgba(61, 139, 168, 0.25);
}

.sidebar--collapsed .sidebar__profile-btn {
  justify-content: center;
}

.sidebar__profile-avatar {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
}

.sidebar__profile-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sidebar__profile-avatar svg {
  width: 20px;
  height: 20px;
  color: var(--sidebar-text-muted);
}

.sidebar__profile-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.sidebar__profile-name {
  font-size: 0.9375rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar__profile-role {
  font-size: 0.75rem;
  color: var(--sidebar-text-muted);
}

.sidebar__backdrop {
  display: none;
}

/* Mobile: overlay sidebar */
@media (max-width: 900px) {
  .sidebar__toggle {
    display: none;
  }

  .sidebar {
    top: 0;
    left: 0;
    bottom: 0;
    border-radius: 0;
    transform: translateX(-100%);
  }

  .sidebar--open {
    transform: translateX(0);
  }

  .sidebar--open.sidebar--collapsed {
    width: var(--sidebar-width);
  }

  .sidebar__backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 99;
  }
}

@media (max-width: 600px) {
  .sidebar {
    width: min(var(--sidebar-width), 85vw);
  }
}
</style>


