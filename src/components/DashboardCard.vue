<template>
  <button
    type="button"
    class="dashboard-card"
    :class="{ 'dashboard-card--pressed': isPressed, 'dashboard-card--avatar': isAvatar }"
    @mousedown="onPressStart"
    @mouseup="onPressEnd"
    @mouseleave="onPressEnd"
    @touchstart.passive="onPressStart"
    @touchend="onPressEnd"
    @touchcancel="onPressEnd"
  >
    <span class="dashboard-card__icon">
      <slot name="icon" />
    </span>
    <span class="dashboard-card__label">{{ label }}</span>
    <span v-if="subLabel" class="dashboard-card__sublabel">{{ subLabel }}</span>
  </button>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  label: { type: String, required: true },
  subLabel: { type: String, default: '' },
  isAvatar: { type: Boolean, default: false },
})

const isPressed = ref(false)

function onPressStart() {
  isPressed.value = true
}

function onPressEnd() {
  isPressed.value = false
}
</script>

<style scoped>
.dashboard-card {
  --card-bg: var(--bg-card);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1.75rem 1.25rem;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius);
  color: #fff;
  font-family: inherit;
  font-size: 1.125rem; /* 18px */
  font-weight: 500;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  box-shadow: var(--shadow);
  transition:
    transform var(--transition),
    box-shadow var(--transition),
    background var(--transition);
  min-height: 160px;
  aspect-ratio: 1;
}

.dashboard-card:hover {
  transform: scale(1.02);
  box-shadow: var(--shadow-hover);
}

.dashboard-card:focus-visible {
  outline: 2px solid var(--text-primary);
  outline-offset: 2px;
}

.dashboard-card--pressed,
.dashboard-card:active {
  background: var(--bg-card-active);
  transform: translateY(2px);
  box-shadow: var(--shadow-press);
}

.dashboard-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  position: relative;
  flex-shrink: 0;
}

.dashboard-card__icon :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
  color: #fff;
}

.dashboard-card__label {
  text-align: center;
  line-height: 1.2;
  font-size: 1.125rem; /* 18px */
}

@media (min-width: 769px) {
  .dashboard-card__label {
    font-size: 1.25rem; /* 20px high readability */
  }
}

.dashboard-card__sublabel {
  font-size: 0.875rem;
  font-weight: 500;
  color: #fff;
}

/* Me / Profile card: avatar emphasis */
.dashboard-card--avatar .dashboard-card__icon {
  width: 72px;
  height: 72px;
}
</style>
