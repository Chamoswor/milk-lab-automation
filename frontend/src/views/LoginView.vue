<template>
  <div class="login-container">
    <el-card class="login-card">
      <div class="login-header">
        <el-avatar :size="64" icon="user"></el-avatar>
        <h1 class="login-title">Logg inn</h1>
      </div>
      
      <el-form 
        ref="loginForm" 
        :model="formData" 
        :rules="rules" 
        @submit.prevent="handleLogin"
        label-position="top">
        
        <el-form-item label="Brukernavn" prop="username">
          <el-input 
            v-model="formData.username" 
            prefix-icon="user" 
            placeholder="Skriv inn brukernavn"
            autofocus>
          </el-input>
        </el-form-item>
        
        <el-form-item label="Passord" prop="password">
          <el-input 
            v-model="formData.password" 
            prefix-icon="lock" 
            type="password" 
            placeholder="Skriv inn passord"
            show-password>
          </el-input>
        </el-form-item>
  
        <el-alert
          v-if="errorMessage"
          :title="errorMessage"
          type="error"
          show-icon
          :closable="false"
          class="login-error">
        </el-alert>
  
        <el-form-item class="login-button-container">
          <el-button 
            type="primary" 
            :loading="loading" 
            native-type="submit" 
            class="login-button" 
            @click="submitForm">
            Logg inn
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>
  
<script setup>
import { ref, reactive } from 'vue'
import router from '@/router'
import { LogIn } from '@/middleware/backend.js'
import { useAuthStore } from '../stores/authStore'
import { Lock, User } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

// Form reference
const loginForm = ref(null)

// Reactive state
const formData = reactive({
  username: '',
  password: ''
})
const errorMessage = ref('')
const loading = ref(false)

// Form validation rules
const rules = {
  username: [
    { required: true, message: 'Vennligst skriv inn brukernavn', trigger: 'blur' },
    { min: 3, message: 'Brukernavn må være minst 3 tegn', trigger: 'blur' }
  ],
  password: [
    { required: true, message: 'Vennligst skriv inn passord', trigger: 'blur' },
    { min: 4, message: 'Passord må være minst 4 tegn', trigger: 'blur' }
  ]
}

// Submit form
const submitForm = () => {
  if (!loginForm.value) return
  
  loginForm.value.validate(async (valid) => {
    if (valid) {
      await handleLogin()
    } else {
      return false
    }
  })
}

// Handle login
async function handleLogin() {
  try {
    loading.value = true
    errorMessage.value = ''
    
    const response = await LogIn(formData.username, formData.password)
    console.log('Login response:', response.data)
    
    const loggedIn = response.data.user.loggedIn
    if (!loggedIn) {
      errorMessage.value = 'Feil brukernavn eller passord.'
      return
    }
    
    console.log('Logged in:', loggedIn)

    const currentUser = response.data.user.username

    ElMessage({
      message: `Logget inn som: ${currentUser}`,
      type: 'success'
    })
    
    router.push('/dashboard')
  } catch (error) {
    if (error.response && error.response.data && error.response.data.error) {
      errorMessage.value = error.response.data.error
    } else {
      errorMessage.value = 'Påloggingen mislyktes. Vennligst prøv igjen.'
      console.error('Login error:', error)
    }
  } finally {
    loading.value = false
  }
}
</script>
  
<style scoped>
.login-container {
  max-width: 600px;
  margin: 2rem auto;
  padding: 0 1rem;
}

.login-card {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.login-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24px;
  padding-top: 16px;
}

.login-title {
  margin-top: 16px;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.login-error {
  margin-bottom: 16px;
}

.login-button-container {
  margin-top: 24px;
}

.login-button {
  width: 100%;
  padding: 12px 0;
  font-size: 16px;
  border-radius: 4px;
}

/* Responsive design */
@media (max-width: 480px) {
  .login-card {
    box-shadow: none;
    background-color: transparent;
  }
  
  .login-container {
    padding: 0;
    background-color: #fff;
  }
}
</style>