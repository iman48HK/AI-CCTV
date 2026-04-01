<template>
  <div class="settings-view">
    <header class="settings-view__header">
      <button type="button" class="settings-view__back" @click="$emit('back')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back
      </button>
      <h1 class="settings-view__title">Settings</h1>
    </header>

    <main class="settings-view__main">
      <template v-if="!isSystemAdmin">
        <p class="settings-view__restricted">Settings management is available to System Administrators only.</p>
      </template>
      <template v-else>
        <section class="settings-view__section">
          <h2>Site plans</h2>
          <p class="settings-view__hint">Create site plans (ID, description) and upload an image or PDF. Use them when adding CCTVs to place a pin on the plan.</p>

          <button type="button" class="settings-view__btn settings-view__btn--primary" @click="openCreate">
            Add site plan
          </button>

          <p v-if="error" class="settings-view__error">{{ error }}</p>
          <p v-if="loading" class="settings-view__loading">Loading…</p>
          <div v-else-if="plans.length === 0" class="settings-view__empty">No site plans yet.</div>
          <ul v-else class="settings-view__list">
            <li v-for="p in plans" :key="p._id" class="settings-view__item">
              <div class="settings-view__item-info">
                <strong>{{ p.planId }}</strong>
                <span v-if="p.description" class="settings-view__item-desc">{{ p.description }}</span>
                <span class="settings-view__item-file">{{ p.filename }}</span>
              </div>
              <div class="settings-view__item-actions">
                <a v-if="planFileUrl(p)" :href="planFileUrl(p)" target="_blank" rel="noopener" class="settings-view__link">Open</a>
                <button type="button" class="settings-view__btn settings-view__btn--small" @click="openEdit(p)">Edit</button>
                <button type="button" class="settings-view__btn settings-view__btn--small settings-view__btn--danger" @click="confirmDelete(p)">Delete</button>
              </div>
            </li>
          </ul>
        </section>

        <section class="settings-view__section">
          <h2>User roles</h2>
          <p class="settings-view__hint">Add and manage custom roles that can be assigned when creating/editing users.</p>

          <form class="settings-view__role-form" @submit.prevent="createRole">
            <label>
              <span>Role name</span>
              <input v-model="roleForm.label" placeholder="e.g. Security Supervisor" required />
            </label>
            <button type="submit" class="settings-view__btn settings-view__btn--primary">Add role</button>
          </form>

          <ul class="settings-view__list">
            <li v-for="r in roles" :key="r._id || r.key" class="settings-view__item">
              <div class="settings-view__item-info">
                <strong>{{ r.label }}</strong>
                <span class="settings-view__item-file">{{ r.key }}</span>
              </div>
              <div class="settings-view__item-actions">
                <button
                  v-if="!r.isSystem"
                  type="button"
                  class="settings-view__btn settings-view__btn--small settings-view__btn--danger"
                  @click="deleteRole(r)"
                >
                  Delete
                </button>
                <span v-else class="settings-view__item-file">Built-in</span>
              </div>
            </li>
          </ul>
        </section>

        <!-- Create / Edit modal -->
        <div v-if="showForm" class="settings-view__modal" @click.self="closeForm">
          <div class="settings-view__modal-inner">
            <h2>{{ editingPlan ? 'Edit site plan' : 'Add site plan' }}</h2>
            <form @submit.prevent="submitPlan">
              <label>
                <span>Plan ID</span>
                <input v-model="form.planId" required :readonly="!!editingPlan" />
              </label>
              <label>
                <span>Description</span>
                <input v-model="form.description" placeholder="Optional" />
              </label>
              <label>
                <span>{{ editingPlan ? 'Replace file (optional)' : 'File (image or PDF)' }}</span>
                <input ref="fileInput" type="file" accept="image/*,application/pdf" @change="onFileChange" />
                <span v-if="form.fileName" class="settings-view__file-name">{{ form.fileName }}</span>
              </label>
              <p v-if="formError" class="settings-view__error">{{ formError }}</p>
              <div class="settings-view__modal-actions">
                <button type="button" @click="closeForm">Cancel</button>
                <button type="submit">{{ editingPlan ? 'Update' : 'Create' }}</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Delete confirm -->
        <div v-if="deletingPlan" class="settings-view__modal" @click.self="deletingPlan = null">
          <div class="settings-view__modal-inner">
            <h2>Delete site plan?</h2>
            <p>This will remove "{{ deletingPlan.planId }}". CCTVs using this plan will keep their pin position but the plan file will be removed.</p>
            <div class="settings-view__modal-actions">
              <button type="button" @click="deletingPlan = null">Cancel</button>
              <button type="button" class="settings-view__btn--danger" @click="doDelete">Delete</button>
            </div>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { api } from '../api.js'

const props = defineProps({ authUser: { type: Object, default: null } })
defineEmits(['back'])

const isSystemAdmin = computed(() => props.authUser?.role === 'system_admin')

const plans = ref([])
const loading = ref(false)
const error = ref('')
const showForm = ref(false)
const editingPlan = ref(null)
const form = ref({ planId: '', description: '', file: null, fileName: '' })
const formError = ref('')
const fileInput = ref(null)
const deletingPlan = ref(null)
const roles = ref([])
const roleForm = ref({ label: '' })

function planFileUrl(plan) {
  if (!plan?.filename) return null
  return `/api/uploads/siteplans/${plan.filename}`
}

async function fetchPlans() {
  if (!isSystemAdmin.value) return
  loading.value = true
  error.value = ''
  try {
    const res = await api('/site-plans')
    if (!res.ok) throw new Error('Failed to load site plans')
    plans.value = await res.json()
  } catch (e) {
    error.value = e.message || 'Failed to load'
  } finally {
    loading.value = false
  }
}

async function fetchRoles() {
  if (!isSystemAdmin.value) return
  try {
    const res = await api('/roles')
    if (!res.ok) throw new Error('Failed to load roles')
    roles.value = await res.json()
  } catch (e) {
    error.value = e.message || 'Failed to load roles'
  }
}

function openCreate() {
  editingPlan.value = null
  form.value = { planId: '', description: '', file: null, fileName: '' }
  formError.value = ''
  showForm.value = true
  if (fileInput.value) fileInput.value.value = ''
}

function openEdit(p) {
  editingPlan.value = p
  form.value = { planId: p.planId, description: p.description || '', file: null, fileName: '' }
  formError.value = ''
  showForm.value = true
  if (fileInput.value) fileInput.value.value = ''
}

function onFileChange(e) {
  const file = e.target?.files?.[0]
  form.value.file = file || null
  form.value.fileName = file ? file.name : ''
}

function closeForm() {
  showForm.value = false
  editingPlan.value = null
}

async function submitPlan() {
  formError.value = ''
  if (!editingPlan.value && !form.value.file) {
    formError.value = 'Please select a file (image or PDF).'
    return
  }
  try {
    const fd = new FormData()
    fd.append('planId', form.value.planId.trim())
    fd.append('description', (form.value.description || '').trim())
    if (form.value.file) fd.append('file', form.value.file)

    const token = localStorage.getItem('authToken')
    const url = (editingPlan.value ? `/site-plans/${editingPlan.value._id}` : '/site-plans')
    const method = editingPlan.value ? 'PATCH' : 'POST'
    const res = await fetch(`/api${url}`, {
      method,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
      credentials: 'include',
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Request failed')
    closeForm()
    await fetchPlans()
  } catch (e) {
    formError.value = e.message || 'Failed to save'
  }
}

function confirmDelete(p) {
  deletingPlan.value = p
}

async function doDelete() {
  if (!deletingPlan.value) return
  try {
    const res = await api(`/site-plans/${deletingPlan.value._id}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      throw new Error(d.error || 'Delete failed')
    }
    deletingPlan.value = null
    await fetchPlans()
  } catch (e) {
    error.value = e.message
  }
}

async function createRole() {
  const label = roleForm.value.label.trim()
  if (!label) return
  try {
    const res = await api('/roles', {
      method: 'POST',
      body: JSON.stringify({ label }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      throw new Error(d.error || 'Failed to create role')
    }
    roleForm.value.label = ''
    await fetchRoles()
  } catch (e) {
    error.value = e.message || 'Failed to create role'
  }
}

async function deleteRole(role) {
  if (!role?._id) return
  if (!confirm(`Delete role "${role.label}"?`)) return
  try {
    const res = await api(`/roles/${role._id}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      throw new Error(d.error || 'Failed to delete role')
    }
    await fetchRoles()
  } catch (e) {
    error.value = e.message || 'Failed to delete role'
  }
}

onMounted(() => {
  fetchPlans()
  fetchRoles()
})
watch(isSystemAdmin, (v) => {
  if (v) {
    fetchPlans()
    fetchRoles()
  }
})
</script>

<style scoped>
.settings-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 1.5rem 5%;
}

.settings-view__header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.settings-view__back {
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

.settings-view__back svg { width: 18px; height: 18px; }

.settings-view__title { font-size: 1.4rem; font-weight: 600; color: #fff; }

.settings-view__main { flex: 1; }

.settings-view__restricted {
  color: rgba(255, 255, 255, 0.8);
  padding: 1rem 0;
}

.settings-view__section { margin-bottom: 2rem; }

.settings-view__section h2 { font-size: 1.1rem; color: #fff; margin-bottom: 0.5rem; }

.settings-view__hint {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.75);
  margin-bottom: 1rem;
}

.settings-view__btn {
  padding: 0.5rem 1rem;
  border-radius: 999px;
  border: none;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.settings-view__btn--primary { background: #fff; color: #163645; }

.settings-view__btn--small { padding: 0.35rem 0.75rem; font-size: 0.85rem; }

.settings-view__btn--danger { background: #c62828; color: #fff; }

.settings-view__error { color: #ffb3b3; margin: 0.5rem 0; }

.settings-view__loading { color: rgba(255, 255, 255, 0.8); }

.settings-view__empty { color: rgba(255, 255, 255, 0.7); padding: 1rem 0; }

.settings-view__list { list-style: none; padding: 0; margin: 1rem 0 0; }

.settings-view__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  margin-bottom: 0.5rem;
  color: #fff;
}

.settings-view__item-info { display: flex; flex-direction: column; gap: 0.25rem; }

.settings-view__item-desc,
.settings-view__item-file { font-size: 0.85rem; color: rgba(255, 255, 255, 0.7); }

.settings-view__item-actions { display: flex; gap: 0.5rem; align-items: center; }

.settings-view__role-form {
  display: flex;
  gap: 0.75rem;
  align-items: flex-end;
  margin: 0.75rem 0 1rem;
  flex-wrap: wrap;
}

.settings-view__role-form label {
  min-width: 240px;
}

.settings-view__link { color: #81d4fa; text-decoration: none; font-size: 0.9rem; }

.settings-view__file-name { font-size: 0.85rem; color: rgba(255, 255, 255, 0.8); display: block; margin-top: 0.25rem; }

.settings-view__modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}

.settings-view__modal-inner {
  width: 100%;
  max-width: 420px;
  padding: 1.5rem;
  background: #163645;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.settings-view__modal-inner h2 { margin-bottom: 1rem; font-size: 1.2rem; color: #fff; }

.settings-view__modal-inner label { display: block; margin-bottom: 0.75rem; }

.settings-view__modal-inner label span { display: block; margin-bottom: 0.25rem; font-size: 0.9rem; color: rgba(255, 255, 255, 0.9); }

.settings-view__modal-inner input,
.settings-view__modal-inner select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(0, 0, 0, 0.2);
  color: #fff;
  box-sizing: border-box;
}

.settings-view__modal-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1.25rem;
}

.settings-view__modal-actions button {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: none;
  font-size: 0.9rem;
  cursor: pointer;
}

.settings-view__modal-actions button[type="button"] { background: rgba(255, 255, 255, 0.2); color: #fff; }

.settings-view__modal-actions button[type="submit"],
.settings-view__modal-actions button:not([type="button"]) { background: #fff; color: #163645; }

.settings-view__btn--danger { background: #c62828; color: #fff; }
</style>
