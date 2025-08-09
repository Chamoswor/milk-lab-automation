<template>
  <div class="add-user-container" :class="{ 'dialog-mode': dialogMode }">
    <el-card v-if="!dialogMode" class="add-user-card">
      <template #header>
        <div class="card-header">
          <h2><el-icon><User /></el-icon> Legg til ny bruker</h2>
        </div>
      </template>
      
      <el-form 
        ref="userForm" 
        :model="formData" 
        :rules="rules" 
        label-position="top" 
        @submit.prevent="submitForm"
        status-icon
      >
        <!-- Eksisterende skjemafelt -->
        <el-form-item prop="username" label="Brukernavn">
          <el-input 
            v-model="formData.username" 
            placeholder="Skriv inn brukernavn"
            prefix-icon="User"
          />
        </el-form-item>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item prop="password" label="Passord">
              <el-input 
                v-model="formData.password" 
                type="password" 
                placeholder="Skriv inn passord"
                prefix-icon="Lock"
                show-password
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item prop="password_repeat" label="Gjenta passord">
              <el-input 
                v-model="formData.password_repeat" 
                type="password" 
                placeholder="Gjenta passord"
                prefix-icon="Lock"
                show-password
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item prop="role" label="Rolle">
              <el-select 
                v-model="formData.role" 
                placeholder="Velg rolle"
                style="width: 100%"
              >
                <el-option label="Admin" value="admin" />
                <el-option label="Bruker" value="user" />
                <el-option label="Lab" value="lab" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item prop="unit" label="Enhet">
              <el-input 
                v-model="formData.unit" 
                placeholder="Skriv inn enhet"
                prefix-icon="OfficeBuilding"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-alert
          v-if="error"
          :title="error"
          type="error"
          show-icon
          class="mb-4"
        />
        
        <el-alert
          v-if="success"
          :title="success"
          type="success"
          show-icon
          class="mb-4"
        />
        
        <!-- Knapper for frittstående modus -->
        <div v-if="!dialogMode" class="form-actions">
          <el-button 
            type="primary" 
            native-type="submit" 
            :loading="isLoading" 
            :icon="isLoading ? 'Loading' : 'Plus'"
            round
          >
            {{ isLoading ? 'Legger til...' : 'Legg til bruker' }}
          </el-button>
          <el-button 
            @click="resetForm" 
            :icon="Delete"
            round
          >
            Nullstill skjema
          </el-button>
        </div>
      </el-form>
    </el-card>
    
    <!-- For dialog-modus: uten card-wrapper -->
    <el-form 
      v-if="dialogMode"
      ref="userForm" 
      :model="formData" 
      :rules="rules" 
      label-position="top" 
      status-icon
    >
      <!-- Samme skjemafelt som over -->
      <el-form-item prop="username" label="Brukernavn">
        <el-input 
          v-model="formData.username" 
          placeholder="Skriv inn brukernavn"
          prefix-icon="User"
        />
      </el-form-item>
      
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item prop="password" label="Passord">
            <el-input 
              v-model="formData.password" 
              type="password" 
              placeholder="Skriv inn passord"
              prefix-icon="Lock"
              show-password
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item prop="password_repeat" label="Gjenta passord">
            <el-input 
              v-model="formData.password_repeat" 
              type="password" 
              placeholder="Gjenta passord"
              prefix-icon="Lock"
              show-password
            />
          </el-form-item>
        </el-col>
      </el-row>
      
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item prop="role" label="Rolle">
            <el-select 
              v-model="formData.role" 
              placeholder="Velg rolle"
              style="width: 100%"
            >
              <el-option label="Admin" value="admin" />
              <el-option label="Bruker" value="user" />
              <el-option label="Lab" value="lab" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item prop="unit" label="Enhet">
            <el-input 
              v-model="formData.unit" 
              placeholder="Skriv inn enhet"
              prefix-icon="OfficeBuilding"
            />
          </el-form-item>
        </el-col>
      </el-row>
      
      <el-alert
        v-if="error"
        :title="error"
        type="error"
        show-icon
        class="mb-4"
      />
    </el-form>
  </div>
</template>

<script>
import { ref, reactive } from 'vue';
import { User, Lock, OfficeBuilding, Plus, Delete } from '@element-plus/icons-vue';
import { admin_addUser } from '@/middleware/backend';

export default {
  name: 'AddUserView',
  props: {
    dialogMode: {
      type: Boolean,
      default: false
    }
  },
  emits: ['user-added'],
  components: {
    User,
    Lock,
    OfficeBuilding,
    Delete
  },
  setup(props, { emit }) {
    const userForm = ref(null);
    const isLoading = ref(false);
    const error = ref(null);
    const success = ref(null);
    
    const formData = reactive({
      username: '',
      password: '',
      password_repeat: '',
      role: '',
      unit: ''
    });
    
    const validatePass = (rule, value, callback) => {
      if (value === '') {
        callback(new Error('Vennligst skriv inn passordet'));
      } else {
        if (formData.password_repeat !== '') {
          userForm.value?.validateField('password_repeat');
        }
        callback();
      }
    };
    
    const validatePassRepeat = (rule, value, callback) => {
      if (value === '') {
        callback(new Error('Vennligst gjenta passordet'));
      } else if (value !== formData.password) {
        callback(new Error('Passordene er ikke like'));
      } else {
        callback();
      }
    };
    
    const rules = {
      username: [
        { required: true, message: 'Brukernavn er påkrevd', trigger: 'blur' },
        { min: 3, message: 'Brukernavn må være minst 3 tegn', trigger: 'blur' }
      ],
      password: [
        { required: true, message: 'Passord er påkrevd', trigger: 'blur' },
        { validator: validatePass, trigger: 'blur' }
      ],
      password_repeat: [
        { required: true, message: 'Gjenta passord er påkrevd', trigger: 'blur' },
        { validator: validatePassRepeat, trigger: 'blur' }
      ],
      role: [
        { required: true, message: 'Rolle er påkrevd', trigger: 'change' }
      ]
    };
    
    const submitForm = async () => {
      if (!userForm.value) return false;
      
      try {
        await userForm.value.validate();
        error.value = null;
        isLoading.value = true;
        
        const response = await admin_addUser(formData);
        
        if (response.success) {
          if (!props.dialogMode) {
            success.value = response.message;
          }
          
          resetForm();
          emit('user-added', response.data);
          return true;
        } else {
          error.value = response.message;
          return false;
        }
      } catch (err) {
        error.value = 'En feil oppstod. Vennligst prøv igjen.';
        return false;
      } finally {
        isLoading.value = false;
      }
    };
    
    const resetForm = () => {
      if (userForm.value) {
        userForm.value.resetFields();
      }
      Object.assign(formData, {
        username: '',
        password: '',
        password_repeat: '',
        role: '',
        unit: ''
      });
      error.value = null;
    };
    
    return {
      userForm,
      formData,
      rules,
      error,
      success,
      isLoading,
      submitForm,
      resetForm,
      Delete
    };
  }
}
</script>

<style scoped>
.add-user-container {
  max-width: 600px;
  margin: 2rem auto;
  padding: 0 1rem;
}

/* Dialog-modus stiler */
.dialog-mode {
  margin: 0;
  padding: 0;
  max-width: 100%;
}

.add-user-card {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  align-items: center;
}

.card-header h2 {
  margin: 0;
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-actions {
  display: flex;
  justify-content: flex-start;
  gap: 12px;
  margin-top: 1.5rem;
}

.mb-4 {
  margin-bottom: 1rem;
}

:deep(.el-input__wrapper),
:deep(.el-select) {
  border-radius: 4px;
}

:deep(.el-alert) {
  margin: 16px 0;
}
</style>