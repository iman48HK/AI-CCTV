<template>
  <div class="users-view">
    <header class="users-view__header">
      <button type="button" class="users-view__back" @click="$emit('back')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back
      </button>
      <h1 class="users-view__title">{{ canManage ? 'User Management' : 'Users' }}</h1>
    </header>

    <main class="users-view__main">
      <div v-if="canManage" class="users-view__toolbar">
        <button type="button" class="users-view__btn users-view__btn--primary" @click="showCreate = true">
          Add User
        </button>
        <a
          v-if="isSystemAdmin"
          href="#"
          class="users-view__link"
          @click.prevent="$emit('open-departments')"
        >
          Manage Departments →
        </a>
      </div>

      <p v-if="error" class="users-view__error">{{ error }}</p>
      <p v-if="loading" class="users-view__loading">Loading…</p>

      <div v-else class="users-view__table-wrap">
        <table class="users-view__table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Department</th>
              <th>Status</th>
              <th v-if="canManage">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u._id">
              <td>{{ u.fullName }}</td>
              <td>{{ u.email }}</td>
              <td>{{ roleLabel(u.role) }}</td>
              <td>{{ u.department?.name || '—' }}</td>
              <td>
                <span :class="['users-view__badge', u.isSuspended ? 'users-view__badge--suspended' : 'users-view__badge--active']">
                  {{ u.isSuspended ? 'Suspended' : 'Active' }}
                </span>
              </td>
              <td v-if="canManage" class="users-view__actions">
                <button type="button" class="users-view__act" @click="openEdit(u)">Edit</button>
                <button
                  v-if="u.isSuspended"
                  type="button"
                  class="users-view__act"
                  @click="reactivate(u)"
                >
                  Reactivate
                </button>
                <button
                  v-else
                  type="button"
                  class="users-view__act users-view__act--warn"
                  @click="suspend(u)"
                >
                  Suspend
                </button>
                <button type="button" class="users-view__act" @click="openReset(u)">Reset password</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>

    <!-- Create/Edit modal -->
    <div v-if="showCreate || editing" class="users-view__modal" @click.self="closeModal">
      <div class="users-view__modal-inner">
        <h2>{{ editing ? 'Edit User' : 'Add User' }}</h2>
        <form @submit.prevent="editing ? saveEdit() : createUser()">
          <label>
            <span>Full name</span>
            <input v-model="form.fullName" required />
          </label>
          <label>
            <span>Email</span>
            <input v-model="form.email" type="email" required :readonly="!!editing" />
          </label>
          <label v-if="!editing">
            <span>Initial password (min 6 chars)</span>
            <input v-model="form.password" type="password" minlength="6" :required="!editing" />
          </label>
          <label>
            <span>Role</span>
            <select v-model="form.role" required>
              <option value="">Select role</option>
              <option
                v-for="r in selectableRoles"
                :key="r.key"
                :value="r.key"
              >
                {{ r.label }}
              </option>
            </select>
          </label>
          <label v-if="isSystemAdmin && !editing">
            <span>Department</span>
            <select v-model="form.departmentId">
              <option value="">None</option>
              <option v-for="d in departments" :key="d._id" :value="d._id">{{ d.name }}</option>
            </select>
          </label>
          <div class="users-view__modal-actions">
            <button type="button" @click="closeModal">Cancel</button>
            <button type="submit">{{ editing ? 'Save' : 'Create' }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Reset password modal -->
    <div v-if="resetting" class="users-view__modal" @click.self="resetting = null">
      <div class="users-view__modal-inner">
        <h2>Reset password for {{ resetting.fullName }}</h2>
        <form @submit.prevent="resetPassword">
          <label>
            <span>New password (min 6 chars)</span>
            <input v-model="newPassword" type="password" minlength="6" required />
          </label>
          <div class="users-view__modal-actions">
            <button type="button" @click="resetting = null; newPassword = ''">Cancel</button>
            <button type="submit">Reset</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { api, roleLabel as getRoleLabel } from '../api.js'

const props = defineProps({
  authUser: { type: Object, default: () => ({}) },
})

defineEmits(['back', 'open-departments'])

const users = ref([])
const departments = ref([])
const loading = ref(false)
const error = ref('')
const roleOptions = ref([])
const showCreate = ref(false)
const editing = ref(null)
const resetting = ref(null)
const newPassword = ref('')

const form = ref({
  fullName: '',
  email: '',
  password: '',
  role: '',
  departmentId: '',
})

const isSystemAdmin = computed(() => props.authUser?.role === 'system_admin')
const canManage = computed(
  () =>
    props.authUser?.role === 'system_admin' || props.authUser?.role === 'department_admin'
)

function roleLabel(role) {
  return getRoleLabel(role, roleOptions.value)
}

const selectableRoles = computed(() => {
  if (isSystemAdmin.value) return roleOptions.value
  return roleOptions.value.filter((r) => r.key !== 'system_admin')
})

async function fetchUsers() {
  loading.value = true
  error.value = ''
  try {
    const res = await api('/users')
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to load users')
    users.value = await res.json()
  } catch (e) {
    error.value = e.message || 'Failed to load users'
  } finally {
    loading.value = false
  }
}

async function fetchRoles() {
  try {
    const res = await api('/roles')
    if (!res.ok) throw new Error('Failed to load roles')
    roleOptions.value = await res.json()
  } catch (_) {
    roleOptions.value = []
  }
}

function closeModal() {
  showCreate.value = false
  editing.value = null
  form.value = { fullName: '', email: '', password: '', role: '', departmentId: '' }
}

function openEdit(u) {
  editing.value = u
  form.value = {
    fullName: u.fullName,
    email: u.email,
    role: u.role,
    departmentId: u.department?._id || u.department || '',
  }
}

async function saveEdit() {
  try {
    const res = await api(`/users/${editing.value._id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        fullName: form.value.fullName,
        role: form.value.role,
        departmentId: form.value.departmentId || undefined,
      }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      throw new Error(d.error || 'Failed to update')
    }
    closeModal()
    await fetchUsers()
  } catch (e) {
    error.value = e.message
  }
}

async function createUser() {
  error.value = ''
  try {
    const body = {
      fullName: form.value.fullName,
      email: form.value.email,
      password: form.value.password,
      role: form.value.role,
    }
    if (isSystemAdmin.value && form.value.departmentId) {
      body.departmentId = form.value.departmentId
    }
    const res = await api('/users', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      throw new Error(d.error || 'Failed to create user')
    }
    closeModal()
    await fetchUsers()
  } catch (e) {
    error.value = e.message
  }
}

async function suspend(u) {
  if (!confirm(`Suspend ${u.fullName}?`)) return
  try {
    const res = await api(`/users/${u._id}/suspend`, { method: 'POST' })
    if (!res.ok) throw new Error('Failed to suspend')
    await fetchUsers()
  } catch (e) {
    error.value = e.message
  }
}

async function reactivate(u) {
  try {
    const res = await api(`/users/${u._id}/reactivate`, { method: 'POST' })
    if (!res.ok) throw new Error('Failed to reactivate')
    await fetchUsers()
  } catch (e) {
    error.value = e.message
  }
}

function openReset(u) {
  resetting.value = u
  newPassword.value = ''
}

async function resetPassword() {
  try {
    const res = await api(`/users/${resetting.value._id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword: newPassword.value }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      throw new Error(d.error || 'Failed to reset password')
    }
    resetting.value = null
    newPassword.value = ''
    await fetchUsers()
  } catch (e) {
    error.value = e.message
  }
}

async function fetchDepartments() {
  if (!isSystemAdmin.value) return
  try {
    const res = await api('/departments')
    if (res.ok) departments.value = await res.json()
  } catch (_) {}
}

onMounted(() => {
  fetchRoles()
  fetchUsers()
  fetchDepartments()
})
watch(
  () => props.authUser,
  () => {
    fetchRoles()
    fetchUsers()
    fetchDepartments()
  },
  { immediate: false }
)
</script>

<style scoped>
.users-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 1.5rem 5%;
}

.users-view__header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.users-view__back {
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

.users-view__back svg {
  width: 18px;
  height: 18px;
}

.users-view__title {
  font-size: 1.4rem;
  font-weight: 600;
  color: #fff;
}

.users-view__toolbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.users-view__btn {
  padding: 0.5rem 1rem;
  border-radius: 999px;
  border: none;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
}

.users-view__btn--primary {
  background: #fff;
  color: #163645;
}

.users-view__link {
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.9rem;
}

.users-view__error {
  color: #ffb3b3;
  margin-bottom: 1rem;
}

.users-view__loading {
  color: rgba(255, 255, 255, 0.8);
}

.users-view__table-wrap {
  overflow-x: auto;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.users-view__table {
  width: 100%;
  border-collapse: collapse;
  color: #fff;
}

.users-view__table th,
.users-view__table td {
  padding: 0.75rem 1rem;
  text-align: left;
}

.users-view__table th {
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.users-view__table td {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.users-view__badge {
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  font-size: 0.8rem;
}

.users-view__badge--active {
  background: rgba(100, 200, 100, 0.4);
}

.users-view__badge--suspended {
  background: rgba(255, 150, 100, 0.4);
}

.users-view__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.users-view__act {
  padding: 0.25rem 0.5rem;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 0.8rem;
  cursor: pointer;
}

.users-view__act--warn {
  background: rgba(255, 100, 100, 0.3);
}

.users-view__modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}

.users-view__modal-inner {
  width: 100%;
  max-width: 400px;
  padding: 1.5rem;
  background: #163645;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.users-view__modal-inner h2 {
  margin-bottom: 1rem;
  font-size: 1.2rem;
  color: #fff;
}

.users-view__modal-inner label {
  display: block;
  margin-bottom: 0.75rem;
}

.users-view__modal-inner label span {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.9);
}

.users-view__modal-inner input,
.users-view__modal-inner select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(0, 0, 0, 0.2);
  color: #fff;
}

.users-view__modal-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1.25rem;
}

.users-view__modal-actions button {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: none;
  font-size: 0.9rem;
  cursor: pointer;
}

.users-view__modal-actions button[type="button"] {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.users-view__modal-actions button[type="submit"] {
  background: #fff;
  color: #163645;
}
</style>
