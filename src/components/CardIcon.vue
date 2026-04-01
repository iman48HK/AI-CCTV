<template>
  <component :is="iconComponent" v-if="iconComponent" />
  <span v-else />
</template>

<script setup>
import { computed } from 'vue'
import CaptureIcon from './icons/CaptureIcon.vue'
import CctvsIcon from './icons/CctvsIcon.vue'
import AlertsIcon from './icons/AlertsIcon.vue'
import UsersIcon from './icons/UsersIcon.vue'
import SettingsIcon from './icons/SettingsIcon.vue'
import MeIcon from './icons/MeIcon.vue'

const props = defineProps({
  name: { type: String, required: true },
})

const icons = {
  capture: CaptureIcon,
  cctvs: CctvsIcon,
  alerts: AlertsIcon,
  users: UsersIcon,
  settings: SettingsIcon,
  me: MeIcon,
}

const iconComponent = computed(() => icons[props.name] || null)
</script>
