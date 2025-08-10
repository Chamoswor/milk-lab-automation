<template>
    <div class="user-list-container">
      <el-card class="user-list-card">
        <template #header>
          <div class="card-header">
            <h2><el-icon><UserFilled /></el-icon> Brukeroversikt</h2>
            <div class="header-actions">
              <el-input
                v-model="searchQuery"
                placeholder="Søk etter brukere..."
                prefix-icon="Search"
                clearable
                class="search-input"
              />
              <el-button 
                type="primary" 
                @click="navigateToAddUser" 
                :icon="Plus"
              >
                Legg til ny bruker
              </el-button>
            </div>
          </div>
        </template>
        
        <!-- Tabell for brukere -->
        <el-table
          v-loading="loading"
          :data="filteredUsers"
          style="width: 100%"
          @row-click="handleRowClick"
          row-key="id"
          :highlight-current-row="true"
          empty-text="Ingen brukere funnet"
        >
          <el-table-column prop="username" label="Brukernavn" sortable>
            <template #default="{ row }">
              <el-tag
                :type="getTagTypeByRole(row.role)"
                effect="plain"
                class="role-indicator"
              >
                <el-icon class="role-icon"><component :is="getRoleIcon(row.role)" /></el-icon>
              </el-tag>
              {{ row.username }}
            </template>
          </el-table-column>
          <el-table-column prop="role" label="Rolle" sortable width="150">
            <template #default="{ row }">
              <el-tag :type="getTagTypeByRole(row.role)">
                {{ capitalizeFirstLetter(row.role) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="unit" label="Enhet" sortable />
          <el-table-column prop="lastLogin" label="Sist innlogget" sortable width="200">
            <template #default="{ row }">
              <span v-if="row.lastLogin">
                {{ formatDate(row.lastLogin) }}
              </span>
              <el-tag v-else type="info" effect="plain">Aldri innlogget</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Status" width="120">
            <template #default="{ row }">
              <el-tag :type="row.active ? 'success' : 'danger'" effect="dark">
                {{ row.active ? 'Aktiv' : 'Inaktiv' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column fixed="right" label="Handlinger" width="120">
            <template #default="{ row }">
              <el-button 
                type="primary" 
                text 
                :icon="Edit" 
                @click.stop="editUser(row)"
              >
                Rediger
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        
        <div class="pagination-container">
          <el-pagination
            :current-page="currentPage"
            :page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next"
            :total="totalUsers"
            @update:current-page="currentPage = $event"
            @update:page-size="pageSize = $event"
            background
          />
        </div>
      </el-card>
      
      <!-- Dialog for å redigere bruker -->
      <el-dialog
        v-model="editDialog.visible"
        title="Rediger bruker"
        width="500px"
        :close-on-click-modal="false"
        destroy-on-close
      >
        <el-form
          ref="editForm"
          :model="editDialog.form"
          :rules="formRules"
          label-position="top"
        >
          <el-form-item prop="username" label="Brukernavn">
            <el-input 
              v-model="editDialog.form.username" 
              placeholder="Brukernavn"
              prefix-icon="User"
            />
          </el-form-item>
          
          <el-form-item prop="role" label="Rolle">
            <el-select 
              v-model="editDialog.form.role" 
              placeholder="Velg rolle"
              style="width: 100%"
            >
              <el-option label="Admin" value="admin" />
              <el-option label="Bruker" value="user" />
              <el-option label="Lab" value="lab" />
            </el-select>
          </el-form-item>
          
          <el-form-item prop="unit" label="Enhet">
            <el-input 
              v-model="editDialog.form.unit" 
              placeholder="Enhet"
              prefix-icon="OfficeBuilding"
            />
          </el-form-item>
          
          <el-form-item label="Status">
            <el-switch
              v-model="editDialog.form.active"
              active-text="Aktiv"
              inactive-text="Inaktiv"
              inline-prompt
            />
          </el-form-item>
          
          <el-divider content-position="center">Endre passord (valgfritt)</el-divider>
          
          <el-form-item prop="newPassword" label="Nytt passord">
            <el-input 
              v-model="editDialog.form.newPassword" 
              type="password" 
              placeholder="La stå tomt for å beholde nåværende passord"
              show-password
              prefix-icon="Lock"
            />
          </el-form-item>
          
          <el-form-item prop="confirmPassword" label="Bekreft nytt passord">
            <el-input 
              v-model="editDialog.form.confirmPassword" 
              type="password" 
              placeholder="Bekreft nytt passord"
              show-password
              prefix-icon="Lock"
            />
          </el-form-item>
        </el-form>
        
        <template #footer>
          <div class="dialog-footer">
            <el-button @click="editDialog.visible = false">Avbryt</el-button>
            <el-button type="danger" @click="confirmDelete" :disabled="!editDialog.form.id">
              <el-icon><Delete /></el-icon> Slett bruker
            </el-button>
            <el-button type="primary" @click="saveChanges" :loading="editDialog.loading">
              <el-icon><Check /></el-icon> Lagre endringer
            </el-button>
          </div>
        </template>
      </el-dialog>
      
      <!-- Bekreftelsesdialog for sletting -->
      <el-dialog
        v-model="deleteDialog.visible"
        title="Bekreft sletting"
        width="400px"
      >
        <div class="delete-confirmation">
          <el-icon class="warning-icon"><Warning /></el-icon>
          <p>Er du sikker på at du vil slette brukeren <strong>{{ deleteDialog.username }}</strong>?</p>
          <p class="warning-text">Dette kan ikke angres!</p>
        </div>

        <template #footer>
          <div class="dialog-footer">
            <el-button @click="deleteDialog.visible = false">Avbryt</el-button>
            <el-button type="danger" @click="deleteUser" :loading="deleteDialog.loading">
              Ja, slett bruker
            </el-button>
          </div>
        </template>
      </el-dialog>

      <!-- Dialog for å legge til ny bruker -->
      <el-dialog
      v-model="addUserDialog.visible"
      title="Legg til ny bruker"
      width="600px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <AddUserView 
        :dialog-mode="true"
        @user-added="handleUserAdded"
        ref="addUserComponent"
      />
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="addUserDialog.visible = false">Avbryt</el-button>
          <el-button 
            type="primary" 
            @click="submitAddUserForm" 
            :loading="addUserDialog.loading"
          >
            <el-icon><Plus /></el-icon> Legg til bruker
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>
  
<script>
  import { ref, reactive, computed, onMounted, inject } from 'vue';
  import { useRouter } from 'vue-router';
  import { 
    UserFilled, Search, Plus, Edit, Check, Delete, Warning,
    User, Lock, OfficeBuilding, Setting, Briefcase, Monitor 
  } from '@element-plus/icons-vue';
  import { ElMessage, ElMessageBox } from 'element-plus';
  import { 
    admin_getUsers, 
    admin_updateUser, 
    admin_deleteUser 
  } from '@/middleware/backend';
  import AddUserView from '@/views/admin/AddUserView.vue';

  export default {
    name: 'UserListView',
    components: {
      UserFilled, Search, Plus, Edit, Check, Delete, Warning,
      User, Lock, OfficeBuilding, AddUserView
    },
    setup() {
      const router = useRouter();
      const editForm = ref(null);
      const addUserComponent = ref(null);
      const changeView = inject('changeView');
      
      // Ny state for brukerleggingsdialog
      const addUserDialog = reactive({
        visible: false,
        loading: false
      });
      
      // Data
      const users = ref([]);
      const loading = ref(true);
      const currentPage = ref(1);
      const pageSize = ref(10);
      const totalUsers = ref(0);
      const searchQuery = ref('');
      
      // Edit dialog state
      const editDialog = reactive({
        visible: false,
        loading: false,
        form: {
          id: null,
          username: '',
          role: '',
          unit: '',
          active: true,
          newPassword: '',
          confirmPassword: ''
        }
      });


      
      // Delete dialog state
      const deleteDialog = reactive({
        visible: false,
        loading: false,
        userId: null,
        username: ''
      });
      
      // Form validation rules
      const formRules = {
        username: [
          { required: true, message: 'Brukernavn er påkrevd', trigger: 'blur' },
          { min: 3, message: 'Brukernavn må være minst 3 tegn', trigger: 'blur' }
        ],
        role: [
          { required: true, message: 'Rolle er påkrevd', trigger: 'change' }
        ],
        confirmPassword: [
          { 
            validator: (rule, value, callback) => {
              if (editDialog.form.newPassword && value !== editDialog.form.newPassword) {
                callback(new Error('Passordene er ikke like'));
              } else {
                callback();
              }
            },
            trigger: 'blur'
          }
        ]
      };
      
      // Computed properties
      const filteredUsers = computed(() => {
        if (!searchQuery.value) {
          return users.value;
        }
        
        const query = searchQuery.value.toLowerCase();
        return users.value.filter(user => 
          user.username.toLowerCase().includes(query) ||
          user.role.toLowerCase().includes(query) ||
          (user.unit && user.unit.toLowerCase().includes(query))
        );
      });
      
      // Methods
      const fetchUsers = async () => {
        loading.value = true;
        try {
          const response = await admin_getUsers({
            page: currentPage.value,
            pageSize: pageSize.value
          });
          
          if (response.success) {
            users.value = response.data.users;
            totalUsers.value = response.data.total;
          } else {
            ElMessage.error(response.message || 'Kunne ikke hente brukere');
          }
        } catch (error) {
          ElMessage.error('En feil oppstod under henting av brukere');
          console.error(error);
        } finally {
          loading.value = false;
        }
      };
      
      const handleRowClick = (row) => {
        editUser(row);
      };
      
      const editUser = (user) => {
        editDialog.form = {
          id: user.id,
          username: user.username,
          role: user.role,
          unit: user.unit || '',
          active: user.active !== false, // Default to true if not specified
          newPassword: '',
          confirmPassword: ''
        };
        editDialog.visible = true;
      };
      
      const saveChanges = async () => {
        if (!editForm.value) return;
        
        await editForm.value.validate(async (valid) => {
          if (!valid) return;
          
          editDialog.loading = true;
          
          try {
            // Prepare data for API
            const userData = {
              id: editDialog.form.id,
              username: editDialog.form.username,
              role: editDialog.form.role,
              unit: editDialog.form.unit,
              active: editDialog.form.active
            };
            
            // Only include password if a new one was entered
            if (editDialog.form.newPassword) {
              userData.password = editDialog.form.newPassword;
            }
            
            // Forsøk å oppdatere brukeren
            let response;
            try {
              response = await admin_updateUser(userData);
            } catch (apiError) {
              console.error('API-feil ved oppdatering av bruker:', apiError);
              ElMessage.error(`Serverfeil: ${apiError.message || 'Ukjent feil'}`);
              editDialog.loading = false;
              return;
            }
            
            // Kontroller at response ikke er null eller undefined
            if (response && response.success) {
              ElMessage.success('Bruker oppdatert');
              editDialog.visible = false;
              fetchUsers(); // Refresh the list
            } else {
              const errorMessage = response?.message || 'Kunne ikke oppdatere bruker';
              ElMessage.error(errorMessage);
              console.error('Feil ved oppdatering av bruker:', response || 'Ingen respons');
            }
          } catch (error) {
            console.error('En feil oppstod under oppdatering av bruker:', error);
            ElMessage.error(`En feil oppstod under oppdatering av bruker: ${error.message || 'Ukjent feil'}`);
          } finally {
            editDialog.loading = false;
          }
        });
      };
      
      const confirmDelete = () => {
        deleteDialog.userId = editDialog.form.id;
        deleteDialog.username = editDialog.form.username;
        deleteDialog.visible = true;
      };
      
      const deleteUser = async () => {
        deleteDialog.loading = true;
        
        try {
          const response = await admin_deleteUser({ id: deleteDialog.userId });
          
          if (response.success) {
            ElMessage.success('Bruker slettet');
            deleteDialog.visible = false;
            editDialog.visible = false;
            fetchUsers(); // Refresh the list
          } else {
            ElMessage.error(response.message || 'Kunne ikke slette bruker');
          }
        } catch (error) {
          ElMessage.error('En feil oppstod under sletting av bruker');
          console.error(error);
        } finally {
          deleteDialog.loading = false;
        }
      };
      
      // Modifiser navigateToAddUser-funksjonen
      const navigateToAddUser = () => {
        // Åpne dialogen istedenfor å navigere
        addUserDialog.visible = true;
      };
      
      // Funksjoner for å håndtere legg til bruker-dialog
      const submitAddUserForm = async () => {
        if (!addUserComponent.value) return;
        
        addUserDialog.loading = true;
        try {
          const success = await addUserComponent.value.submitForm();
          if (success) {
            addUserDialog.visible = false;
            fetchUsers(); // Oppdater brukerlisten
          }
        } finally {
          addUserDialog.loading = false;
        }
      };
      
      const handleUserAdded = () => {
        ElMessage.success('Bruker lagt til');
        addUserDialog.visible = false;
        fetchUsers(); // Oppdater brukerlisten
      };
      
      // Eksisterende livssyklus-hooks
      onMounted(() => {
        fetchUsers();
      });
      
      const handleSizeChange = (size) => {
        pageSize.value = size;
        fetchUsers();
      };
      
      const handleCurrentChange = (page) => {
        currentPage.value = page;
        fetchUsers();
      };
      
      // Helper functions
      const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString('nb-NO', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      };
      
      const getTagTypeByRole = (role) => {
        const types = {
          admin: 'danger',
          user: 'primary',
          lab: 'warning'
        };
        return types[role] || 'info';
      };
      
      const getRoleIcon = (role) => {
        const icons = {
          admin: Setting,
          user: User,
          lab: Monitor
        };
        return icons[role] || User;
      };
      
      const capitalizeFirstLetter = (string) => {
        if (!string) return '';
        return string.charAt(0).toUpperCase() + string.slice(1);
      };
      
      // Lifecycle hooks
      onMounted(() => {
        fetchUsers();
      });
      
      return {
        // Views
        AddUserView,

        // Data
        users,
        loading,
        searchQuery,
        currentPage,
        pageSize,
        totalUsers,
        editDialog,
        deleteDialog,
        editForm,
        formRules,
        filteredUsers,
        
        // Methods
        handleRowClick,
        editUser,
        saveChanges,
        confirmDelete,
        deleteUser,
        navigateToAddUser,
        handleSizeChange,
        handleCurrentChange,
        formatDate,
        getTagTypeByRole,
        getRoleIcon,
        capitalizeFirstLetter,
        addUserDialog,
        addUserComponent,
        submitAddUserForm,
        handleUserAdded,
        
        // Icons
        Plus, Edit, Delete, Check, Warning,
        Setting, User, Briefcase, Monitor
      };
    }
  }
  </script>
  
  <style scoped>
  .user-list-container {
    margin: 2rem auto;
    padding: 0 1rem;
    max-width: 1200px;
  }
  
  .user-list-card {
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
  }
  
  .card-header h2 {
    margin: 0;
    font-size: 1.5rem;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .header-actions {
    display: flex;
    gap: 16px;
    align-items: center;
    flex-wrap: wrap;
  }
  
  .search-input {
    width: 240px;
  }
  
  .pagination-container {
    margin-top: 20px;
    display: flex;
    justify-content: center;
  }
  
  .dialog-footer {
    display: flex;
    justify-content: space-between;
  }
  
  .delete-confirmation {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  .warning-icon {
    font-size: 48px;
    color: #f56c6c;
    margin-bottom: 16px;
  }
  
  .warning-text {
    color: #f56c6c;
    font-weight: bold;
  }
  
  .role-indicator {
    margin-right: 8px;
    padding: 2px;
  }
  
  .role-icon {
    margin-right: 2px;
  }
  
  :deep(.el-table .el-table__row) {
    cursor: pointer;
  }
  
  :deep(.el-table .el-table__row:hover) {
    background-color: #f5f7fa;
  }
  
  @media (max-width: 768px) {
    .card-header {
      flex-direction: column;
      align-items: flex-start;
    }
    
    .header-actions {
      width: 100%;
    }
    
    .search-input {
      width: 100%;
    }
    
    .dialog-footer {
      flex-direction: column;
      gap: 12px;
    }
    
    .dialog-footer .el-button {
      width: 100%;
    }
  }
  </style>