<script setup>
import { ref, onMounted } from 'vue'
import AdminDashboard from './AdminDashboard.vue'
import LabDashboard from './LabDashboard.vue'
import { GetRole } from '@/middleware/backend'

const role = ref(null)

async function fetchRole() {
  try {
    role.value = await GetRole()
    
  } catch (error) {
    role.value = null
  }
}

onMounted(() => {
  fetchRole()
})

</script>

<template>
  <div>
    <AdminDashboard v-if="role === 'admin'" />
    <LabDashboard v-else-if="role === 'lab'" />
    <p v-else-if="role !== null">You are not authorized to view this page</p>
    <p v-else>Laster...</p>
  </div>
</template>
