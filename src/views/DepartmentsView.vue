<template>
  <div class="dept-view">
    <header class="dept-view__header">
      <button type="button" class="dept-view__back" @click="$emit('back')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back
      </button>
      <h1 class="dept-view__title">Departments</h1>
    </header>

    <main class="dept-view__main">
      <div class="dept-view__toolbar">
        <button type="button" class="dept-view__btn dept-view__btn--primary" @click="showCreate = true">
          Add Department
        </button>
      </div>

      <p v-if="error" class="dept-view__error">{{ error }}</p>
      <p v-if="loading" class="dept-view__loading">Loading…</p>

      <div v-else class="dept-view__list">
        <div v-for="d in departments" :key="d._id" class="dept-view__card">
          <div class="dept-view__card-head">
            <h3>{{ d.name }}</h3>
            <span v-if="d.description" class="dept-view__desc">{{ d.description }}</span>
          </div>
          <div class="dept-view__card-actions">
            <button type="button" class="dept-view__act" @click="openAddAdmin(d)">Add department admin</button>
          </div>
        </div>
      </div>
    </main>

    <!-- Create department modal -->
    <div v-if="showCreate" class="dept-view__modal" @click.self="showCreate = false">
      <div class="dept-view__modal-inner">
        <h2>Add Department</h2>
        <form @submit.prevent="createDepartment">
          <label>
            <span>Name</span>
            <input v-model="deptForm.name" required />
          </label>
          <label>
            <span>Description</span>
            <input v-model="deptForm.description" />
          </label>
          <div class="dept-view__modal-actions">
            <button type="button" @click="showCreate = false">Cancel</button>
            <button type="submit">Create</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Add department admin modal -->
    <div v-if="addingAdmin" class="dept-view__modal" @click.self="addingAdmin = null">
      <div class="dept-view__modal-inner">
        <h2>Add department admin ({{ addingAdmin.name }})</h2>
        <form @submit.prevent="createDepartmentAdmin">
          <label>
            <span>Full name</span>
            <input v-model="adminForm.fullName" required />
          </label>
          <label>
            <span>Email</span>
            <input v-model="adminForm.email" type="email" required />
          </label>
          <label>
            <span>Initial password (min 6 chars)</span>
            <input v-model="adminForm.password" type="password" minlength="6" required />
          </label>
          <div class="dept-view__modal-actions">
            <button type="button" @click="addingAdmin = null; adminForm = {}">Cancel</button>
            <button type="submit">Create</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api.js'

const emit = defineEmits(['back'])

const departments = ref([])
const loading = ref(false)
const error = ref('')
const showCreate = ref(false)
const addingAdmin = ref(null)

const deptForm = ref({ name: '', description: '' })
const adminForm = ref({ fullName: '', email: '', password: '' })

async function fetchDepartments() {
  loading.value = true
  error.value = ''
  try {
    const res = await api('/departments')
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to load')
    departments.value = await res.json()
  } catch (e) {
    error.value = e.message || 'Failed to load departments'
  } finally {
    loading.value = false
  }
}

function openAddAdmin(d) {
  addingAdmin.value = d
  adminForm.value = { fullName: '', email: '', password: '' }
}

async function createDepartment() {
  try {
    const res = await api('/departments', {
      method: 'POST',
      body: JSON.stringify(deptForm.value),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      throw new Error(d.error || 'Failed to create')
    }
    showCreate.value = false
    deptForm.value = { name: '', description: '' }
    await fetchDepartments()
  } catch (e) {
    error.value = e.message
  }
}

async function createDepartmentAdmin() {
  try {
    const res = await api(`/departments/${addingAdmin.value._id}/department-admins`, {
      method: 'POST',
      body: JSON.stringify(adminForm.value),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      throw new Error(d.error || 'Failed to create admin')
    }
    addingAdmin.value = null
    adminForm.value = { fullName: '', email: '', password: '' }
    await fetchDepartments()
  } catch (e) {
    error.value = e.message
  }
}

onMounted(fetchDepartments)
</script>

<style scoped>
.dept-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 1.5rem 5%;
}

.dept-view__header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.dept-view__back {
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

.dept-view__back svg {
  width: 18px;
  height: 18px;
}

.dept-view__title {
  font-size: 1.4rem;
  font-weight: 600;
  color: #fff;
}

.dept-view__toolbar {
  margin-bottom: 1rem;
}

.dept-view__btn {
  padding: 0.5rem 1rem;
  border-radius: 999px;
  border: none;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
}

.dept-view__btn--primary {
  background: #fff;
  color: #163645;
}

.dept-view__error {
  color: #ffb3b3;
  margin-bottom: 1rem;
}

.dept-view__loading {
  color: rgba(255, 255, 255, 0.8);
}

.dept-view__list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dept-view__card {
  padding: 1rem 1.25rem;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
}

.dept-view__card-head h3 {
  font-size: 1.1rem;
  color: #fff;
  margin-bottom: 0.25rem;
}

.dept-view__desc {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.75);
}

.dept-view__card-actions {
  margin-top: 0.75rem;
}

.dept-view__act {
  padding: 0.35rem 0.75rem;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 0.85rem;
  cursor: pointer;
}

.dept-view__modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}

.dept-view__modal-inner {
  width: 100%;
  max-width: 400px;
  padding: 1.5rem;
  background: #163645;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.dept-view__modal-inner h2 {
  margin-bottom: 1rem;
  font-size: 1.2rem;
  color: #fff;
}

.dept-view__modal-inner label {
  display: block;
  margin-bottom: 0.75rem;
}

.dept-view__modal-inner label span {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.9);
}

.dept-view__modal-inner input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(0, 0, 0, 0.2);
  color: #fff;
}

.dept-view__modal-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1.25rem;
}

.dept-view__modal-actions button {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: none;
  font-size: 0.9rem;
  cursor: pointer;
}

.dept-view__modal-actions button[type="button"] {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.dept-view__modal-actions button[type="submit"] {
  background: #fff;
  color: #163645;
}
</style>
