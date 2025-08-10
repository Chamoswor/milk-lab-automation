<template>
    <div class="db-editor-container">
      <el-card class="db-editor-card">
        <template #header>
          <div class="card-header">
            <h2><el-icon><Files /></el-icon> Database Administrator</h2>
            <div class="header-actions">
              <el-input
                v-model="searchQuery"
                placeholder="Søk i tabeller..."
                prefix-icon="Search"
                clearable
                class="search-input"
              />
              <el-button 
                type="primary" 
                @click="createTableDialog.visible = true" 
                :icon="Plus"
              >
                Opprett ny tabell
              </el-button>
            </div>
          </div>
        </template>
        
        <!-- Sidebar med tabeller og hovedinnhold -->
        <div class="db-layout">
          <!-- Sidebar med liste over tabeller -->
          <div class="tables-sidebar">
            <h3 class="sidebar-title">Tabeller</h3>
            <div v-if="loadingTables" class="loading-container">
              <el-skeleton :rows="5" animated />
            </div>
            <el-menu
              v-else
              :default-active="activeTable ? activeTable : ''"
              @select="selectTable"
              class="tables-menu"
            >
            <el-menu-item
                v-for="table in filteredTables || []"
                :key="table"
                :index="table"
                >
                <el-icon><Grid /></el-icon>
                <span>{{ table }}</span>
            </el-menu-item>
            </el-menu>
            <div v-if="filteredTables && filteredTables.length === 0 && !loadingTables" class="empty-tables">
                <p v-if="searchQuery">Ingen tabeller funnet for "{{ searchQuery }}"</p>
                <p v-else>Ingen tabeller i databasen</p>
            </div>
          </div>
          
          <!-- Hovedinnhold: Tabell eller velkomstmelding -->
          <div class="table-content">
            <div v-if="!activeTable" class="welcome-message">
              <el-empty description="Velg en tabell fra listen for å se data">
                <template #image>
                  <el-icon class="empty-icon"><files /></el-icon>
                </template>
                <el-button @click="createTableDialog.visible = true" type="primary" icon="plus">
                  Opprett ny tabell
                </el-button>
              </el-empty>
            </div>
            
            <template v-else>
              <div class="table-header">
                <div class="table-title">
                  <h3>{{ activeTable }}</h3>
                  <div class="table-actions">
                    <el-button-group>
                      <el-button 
                        size="small" 
                        @click="refreshTableData" 
                        :icon="Refresh"
                        :loading="loadingData"
                      >
                        Oppdater
                      </el-button>
                      <el-button 
                        size="small" 
                        @click="showTableStructure" 
                        :icon="View"
                      >
                        Struktur
                      </el-button>
                      <el-button 
                        size="small" 
                        type="danger" 
                        @click="confirmDeleteTable" 
                        :icon="Delete"
                      >
                        Slett tabell
                      </el-button>
                    </el-button-group>
                    <el-button 
                      type="primary" 
                      size="small" 
                      @click="addRowDialog.visible = true" 
                      :icon="Plus"
                    >
                      Legg til rad
                    </el-button>
                  </div>
                </div>
                
                <el-input
                  v-model="tableSearchQuery"
                  placeholder="Søk i data..."
                  prefix-icon="Search"
                  clearable
                  class="table-search-input"
                />
              </div>
              
              <!-- Tabell for data -->
              <el-table
                v-loading="loadingData"
                :data="filteredTableData"
                style="width: 100%"
                border
                max-height="calc(100vh - 300px)"
                @row-click="editRow"
                row-key="id"
                :highlight-current-row="true"
                empty-text="Ingen data funnet"
              >
                <el-table-column 
                  v-for="column in tableColumns" 
                  :key="column.name"
                  :prop="column.name"
                  :label="column.name"
                  sortable
                >
                  <template #default="{ row }">
                    <span :class="{ 'is-null': row[column.name] === null }">
                      {{ formatCellValue(row[column.name]) }}
                    </span>
                  </template>
                </el-table-column>
                
                <el-table-column fixed="right" label="Handlinger" width="150">
                  <template #default="{ row }">
                    <el-button-group>
                      <el-button 
                        type="primary" 
                        text 
                        :icon="Edit" 
                        @click.stop="editRow(row)"
                      />
                      <el-button 
                        type="danger" 
                        text 
                        :icon="Delete" 
                        @click.stop="confirmDeleteRow(row)"
                      />
                    </el-button-group>
                  </template>
                </el-table-column>
              </el-table>
              
              <div class="pagination-container">
                <el-pagination
                  :current-page="currentPage"
                  :page-size="pageSize"
                  :page-sizes="[10, 20, 50, 100]"
                  layout="total, sizes, prev, pager, next"
                  :total="totalRows"
                  @update:current-page="currentPage = $event; fetchTableData()"
                  @update:page-size="pageSize = $event; fetchTableData()"
                  background
                />
              </div>
            </template>
          </div>
        </div>
      </el-card>
      
      <!-- Dialog for å opprette ny tabell -->
      <el-dialog
        v-model="createTableDialog.visible"
        title="Opprett ny tabell"
        width="600px"
        :close-on-click-modal="false"
        destroy-on-close
      >
        <el-form 
          ref="createTableForm"
          :model="createTableDialog.form"
          :rules="createTableRules"
          label-position="top"
        >
          <el-form-item prop="tableName" label="Tabellnavn">
            <el-input 
              v-model="createTableDialog.form.tableName" 
              placeholder="Skriv inn tabellnavn"
              prefix-icon="Edit"
            />
          </el-form-item>
          
          <h4>Kolonner</h4>
          <el-alert 
            v-if="createTableDialog.form.columns.length === 0"
            type="warning"
            show-icon
            title="Ingen kolonner lagt til" 
            description="Tabellen må ha minst én kolonne"
            class="mb-4"
          />
          
          <div class="columns-container">
            <div
              v-for="(column, index) in createTableDialog.form.columns"
              :key="index"
              class="column-item"
            >
              <div class="column-fields">
                <el-input 
                  v-model="column.name" 
                  placeholder="Kolonnenavn"
                  class="column-name"
                />
                <el-select 
                  v-model="column.type" 
                  placeholder="Type"
                  class="column-type"
                >
                  <el-option label="INT" value="INT" />
                  <el-option label="VARCHAR(255)" value="VARCHAR(255)" />
                  <el-option label="TEXT" value="TEXT" />
                  <el-option label="DATE" value="DATE" />
                  <el-option label="DATETIME" value="DATETIME" />
                  <el-option label="BOOLEAN" value="BOOLEAN" />
                  <el-option label="FLOAT" value="FLOAT" />
                  <el-option label="DECIMAL(10,2)" value="DECIMAL(10,2)" />
                  <el-option label="TIMESTAMP" value="TIMESTAMP" />
                </el-select>
                <div class="column-options">
                  <el-checkbox v-model="column.primaryKey">PK</el-checkbox>
                  <el-checkbox v-model="column.notNull">NOT NULL</el-checkbox>
                  <el-checkbox v-model="column.autoIncrement">AUTO_INCREMENT</el-checkbox>
                </div>
              </div>
              <el-button 
                type="danger" 
                circle 
                :icon="Delete" 
                @click="removeColumn(index)"
                class="remove-column-btn"
              />
            </div>
          </div>
          
          <el-button 
            type="primary" 
            plain 
            :icon="Plus" 
            @click="addColumn"
            class="add-column-btn"
          >
            Legg til kolonne
          </el-button>
        </el-form>
        
        <template #footer>
          <div class="dialog-footer">
            <el-button @click="createTableDialog.visible = false">Avbryt</el-button>
            <el-button 
              type="primary" 
              @click="createTable" 
              :loading="createTableDialog.loading"
              :disabled="createTableDialog.form.columns.length === 0"
            >
              <el-icon><Plus /></el-icon> Opprett tabell
            </el-button>
          </div>
        </template>
      </el-dialog>
      
      <!-- Dialog for å redigere rad -->
      <el-dialog
        v-model="editRowDialog.visible"
        title="Rediger rad"
        width="500px"
        :close-on-click-modal="false"
        destroy-on-close
      >
        <el-form
          ref="editRowForm"
          :model="editRowDialog.form"
          label-position="top"
        >
          <el-form-item 
            v-for="column in tableColumns" 
            :key="column.name"
            :label="column.name"
          >
            <el-input 
              v-if="!isSpecialColumnType(column.type)"
              v-model="editRowDialog.form[column.name]" 
              :placeholder="column.name"
            />
            <el-date-picker
              v-else-if="isDateColumnType(column.type)"
              v-model="editRowDialog.form[column.name]"
              :type="column.type.toLowerCase().includes('time') ? 'datetime' : 'date'"
              style="width: 100%"
            />
            <el-switch
              v-else-if="isBooleanColumnType(column.type)"
              v-model="editRowDialog.form[column.name]"
              active-text="True"
              inactive-text="False"
            />
            <el-input-number
              v-else-if="isNumberColumnType(column.type)"
              v-model="editRowDialog.form[column.name]"
              :precision="column.type.toLowerCase().includes('decimal') ? 2 : 0"
              style="width: 100%"
            />
          </el-form-item>
        </el-form>
        
        <template #footer>
          <div class="dialog-footer">
            <el-button @click="editRowDialog.visible = false">Avbryt</el-button>
            <el-button type="primary" @click="saveRowChanges" :loading="editRowDialog.loading">
              <el-icon><Check /></el-icon> Lagre endringer
            </el-button>
          </div>
        </template>
      </el-dialog>
      
      <!-- Dialog for å legge til rad -->
      <el-dialog
        v-model="addRowDialog.visible"
        title="Legg til ny rad"
        width="500px"
        :close-on-click-modal="false"
        destroy-on-close
      >
        <el-form
          ref="addRowForm"
          :model="addRowDialog.form"
          label-position="top"
        >
          <el-form-item 
            v-for="column in tableColumns" 
            :key="column.name"
            :label="column.name"
            :required="isColumnRequired(column)"
          >
            <el-input 
              v-if="!isSpecialColumnType(column.type)"
              v-model="addRowDialog.form[column.name]" 
              :placeholder="column.name"
              :disabled="column.autoIncrement"
            />
            <el-date-picker
              v-else-if="isDateColumnType(column.type)"
              v-model="addRowDialog.form[column.name]"
              :type="column.type.toLowerCase().includes('time') ? 'datetime' : 'date'"
              style="width: 100%"
            />
            <el-switch
              v-else-if="isBooleanColumnType(column.type)"
              v-model="addRowDialog.form[column.name]"
              active-text="True"
              inactive-text="False"
            />
            <el-input-number
              v-else-if="isNumberColumnType(column.type)"
              v-model="addRowDialog.form[column.name]"
              :precision="column.type.toLowerCase().includes('decimal') ? 2 : 0"
              style="width: 100%"
              :disabled="column.autoIncrement"
            />
          </el-form-item>
        </el-form>
        
        <template #footer>
          <div class="dialog-footer">
            <el-button @click="addRowDialog.visible = false">Avbryt</el-button>
            <el-button type="primary" @click="addNewRow" :loading="addRowDialog.loading">
              <el-icon><Plus /></el-icon> Legg til rad
            </el-button>
          </div>
        </template>
      </el-dialog>
      
      <!-- Dialog for å vise tabellstruktur -->
      <el-dialog
        v-model="structureDialog.visible"
        :title="`Tabellstruktur: ${activeTable}`"
        width="700px"
      >
        <el-tabs>
          <el-tab-pane label="Kolonner">
            <el-table
              :data="tableColumns"
              style="width: 100%"
              border
            >
              <el-table-column prop="name" label="Navn" width="150" />
              <el-table-column prop="type" label="Type" width="150" />
              <el-table-column prop="allowNull" label="NULL" width="80">
                <template #default="{ row }">
                  <el-tag :type="row.allowNull ? 'info' : 'danger'" size="small">
                    {{ row.allowNull ? 'Ja' : 'Nei' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="defaultValue" label="Standard" width="100">
                <template #default="{ row }">
                  {{ row.defaultValue === null ? 'NULL' : row.defaultValue }}
                </template>
              </el-table-column>
              <el-table-column prop="primaryKey" label="Primærnøkkel" width="120">
                <template #default="{ row }">
                  <el-tag v-if="row.primaryKey" type="success" size="small">PK</el-tag>
                  <span v-else>-</span>
                </template>
              </el-table-column>
              <el-table-column prop="autoIncrement" label="Auto Increment" width="130">
                <template #default="{ row }">
                  <el-tag v-if="row.autoIncrement" type="warning" size="small">Ja</el-tag>
                  <span v-else>-</span>
                </template>
              </el-table-column>
            </el-table>
            
            <div class="structure-actions">
              <el-button 
                type="primary" 
                size="small" 
                @click="addColumnDialog.visible = true" 
                :icon="Plus"
              >
                Legg til kolonne
              </el-button>
            </div>
          </el-tab-pane>
          
          <el-tab-pane label="Indekser">
            <el-table
              :data="tableIndexes"
              style="width: 100%"
              border
              empty-text="Ingen indekser funnet"
            >
              <el-table-column prop="name" label="Navn" width="180" />
              <el-table-column prop="columns" label="Kolonner">
                <template #default="{ row }">
                  <el-tag 
                    v-for="column in row.columns" 
                    :key="column" 
                    size="small" 
                    class="index-column"
                  >
                    {{ column }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="unique" label="Unik" width="80">
                <template #default="{ row }">
                  <el-tag :type="row.unique ? 'success' : 'info'" size="small">
                    {{ row.unique ? 'Ja' : 'Nei' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="type" label="Type" width="120">
                <template #default="{ row }">
                  <el-tag :type="getIndexTypeColor(row.type)" size="small">
                    {{ row.type }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
            
            <div class="structure-actions">
              <el-button 
                type="primary" 
                size="small" 
                @click="addIndexDialog.visible = true" 
                :icon="Plus"
              >
                Legg til indeks
              </el-button>
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-dialog>
      
      <!-- Dialog for å legge til kolonne -->
      <el-dialog
        v-model="addColumnDialog.visible"
        title="Legg til ny kolonne"
        width="500px"
        :close-on-click-modal="false"
        destroy-on-close
      >
        <el-form
          ref="addColumnForm"
          :model="addColumnDialog.form"
          :rules="addColumnRules"
          label-position="top"
        >
          <el-form-item prop="name" label="Kolonnenavn">
            <el-input 
              v-model="addColumnDialog.form.name" 
              placeholder="Skriv inn kolonnenavn"
            />
          </el-form-item>
          
          <el-form-item prop="type" label="Type">
            <el-select 
              v-model="addColumnDialog.form.type" 
              placeholder="Velg datatype"
              style="width: 100%"
            >
              <el-option label="INT" value="INT" />
              <el-option label="VARCHAR(255)" value="VARCHAR(255)" />
              <el-option label="TEXT" value="TEXT" />
              <el-option label="DATE" value="DATE" />
              <el-option label="DATETIME" value="DATETIME" />
              <el-option label="BOOLEAN" value="BOOLEAN" />
              <el-option label="FLOAT" value="FLOAT" />
              <el-option label="DECIMAL(10,2)" value="DECIMAL(10,2)" />
              <el-option label="TIMESTAMP" value="TIMESTAMP" />
            </el-select>
          </el-form-item>
          
          <el-form-item>
            <el-checkbox v-model="addColumnDialog.form.notNull">NOT NULL</el-checkbox>
          </el-form-item>
          
          <el-form-item>
            <el-checkbox v-model="addColumnDialog.form.primaryKey">Primærnøkkel</el-checkbox>
          </el-form-item>
          
          <el-form-item>
            <el-checkbox v-model="addColumnDialog.form.autoIncrement" :disabled="!isIntegerType(addColumnDialog.form.type)">
              AUTO_INCREMENT
            </el-checkbox>
          </el-form-item>
          
          <el-form-item label="Standardverdi">
            <el-input 
              v-model="addColumnDialog.form.defaultValue" 
              placeholder="Standardverdi (valgfritt)"
            />
          </el-form-item>
        </el-form>
        
        <template #footer>
          <div class="dialog-footer">
            <el-button @click="addColumnDialog.visible = false">Avbryt</el-button>
            <el-button type="primary" @click="addColumnToTable" :loading="addColumnDialog.loading">
              <el-icon><Plus /></el-icon> Legg til kolonne
            </el-button>
          </div>
        </template>
      </el-dialog>
      
      <!-- Dialog for å legge til indeks -->
      <el-dialog
        v-model="addIndexDialog.visible"
        title="Legg til ny indeks"
        width="500px"
        :close-on-click-modal="false"
        destroy-on-close
      >
        <el-form
          ref="addIndexForm"
          :model="addIndexDialog.form"
          :rules="addIndexRules"
          label-position="top"
        >
          <el-form-item prop="name" label="Indeksnavn">
            <el-input 
              v-model="addIndexDialog.form.name" 
              placeholder="Skriv inn indeksnavn"
            />
          </el-form-item>
          
          <el-form-item prop="columns" label="Kolonner">
            <el-select 
              v-model="addIndexDialog.form.columns" 
              multiple
              placeholder="Velg kolonner"
              style="width: 100%"
            >
              <el-option 
                v-for="column in tableColumns" 
                :key="column.name" 
                :label="column.name" 
                :value="column.name" 
              />
            </el-select>
          </el-form-item>
          
          <el-form-item>
            <el-checkbox v-model="addIndexDialog.form.unique">Unik indeks</el-checkbox>
          </el-form-item>
          
          <el-form-item prop="type" label="Indekstype">
            <el-select 
              v-model="addIndexDialog.form.type" 
              placeholder="Velg indekstype"
              style="width: 100%"
            >
              <el-option label="BTREE" value="BTREE" />
              <el-option label="HASH" value="HASH" />
            </el-select>
          </el-form-item>
        </el-form>
        
        <template #footer>
          <div class="dialog-footer">
            <el-button @click="addIndexDialog.visible = false">Avbryt</el-button>
            <el-button type="primary" @click="addIndexToTable" :loading="addIndexDialog.loading">
              <el-icon><Plus /></el-icon> Legg til indeks
            </el-button>
          </div>
        </template>
      </el-dialog>
      
      <!-- Bekreftelsesdialog for sletting av tabell -->
      <el-dialog
        v-model="deleteTableDialog.visible"
        title="Bekreft sletting av tabell"
        width="400px"
      >
        <div class="delete-confirmation">
          <el-icon class="warning-icon"><Warning /></el-icon>
          <p>Er du sikker på at du vil slette tabellen <strong>{{ activeTable }}</strong>?</p>
          <p class="warning-text">Dette vil slette tabellen og alle rader permanent!</p>
        </div>
  
        <template #footer>
          <div class="dialog-footer">
            <el-button @click="deleteTableDialog.visible = false">Avbryt</el-button>
            <el-button type="danger" @click="deleteTableConfirmed" :loading="deleteTableDialog.loading">
              Ja, slett tabell
            </el-button>
          </div>
        </template>
      </el-dialog>
      
      <!-- Bekreftelsesdialog for sletting av rad -->
      <el-dialog
        v-model="deleteRowDialog.visible"
        title="Bekreft sletting av rad"
        width="400px"
      >
        <div class="delete-confirmation">
          <el-icon class="warning-icon"><Warning /></el-icon>
          <p>Er du sikker på at du vil slette denne raden?</p>
          <p class="warning-text">Dette kan ikke angres!</p>
        </div>
  
        <template #footer>
          <div class="dialog-footer">
            <el-button @click="deleteRowDialog.visible = false">Avbryt</el-button>
            <el-button type="danger" @click="deleteRowConfirmed" :loading="deleteRowDialog.loading">
              Ja, slett rad
            </el-button>
          </div>
        </template>
      </el-dialog>
    </div>
  </template>
  
  <script>
  import { ref, reactive, computed, onMounted, watch } from 'vue';
  import axios from 'axios';
  import { 
    Search, Plus, Edit, Delete, Check, Warning, View,
    Grid, Files, Refresh 
  } from '@element-plus/icons-vue';
  import { ElMessage } from 'element-plus';
  import { api } from '@/middleware/backend';

  export default {
    name: 'DBView',
    components: {
      Search, Plus, Edit, Delete, Check, Warning, View,
      Grid, Files, Refresh
    },
    setup() {
      const apiUrl = api.defaults.baseURL;

      // Data
      const tables = ref([]);
      const loadingTables = ref(true);
      const searchQuery = ref('');
      const activeTable = ref('');
      const tableData = ref([]);
      const loadingData = ref(false);
      const tableColumns = ref([]);
      const tableIndexes = ref([]);
      const currentPage = ref(1);
      const pageSize = ref(10);
      const totalRows = ref(0);
      const tableSearchQuery = ref('');
      
      // Dialog states
      const createTableDialog = reactive({
        visible: false,
        loading: false,
        form: {
          tableName: '',
          columns: []
        }
      });
      
      const editRowDialog = reactive({
        visible: false,
        loading: false,
        form: {},
        originalRow: {}
      });
      
      const addRowDialog = reactive({
        visible: false,
        loading: false,
        form: {}
      });
      
      const structureDialog = reactive({
        visible: false,
        activeTab: 'columns'
      });
      
      const addColumnDialog = reactive({
        visible: false,
        loading: false,
        form: {
          name: '',
          type: 'VARCHAR(255)',
          notNull: false,
          primaryKey: false,
          autoIncrement: false,
          defaultValue: ''
        }
      });
      
      const addIndexDialog = reactive({
        visible: false,
        loading: false,
        form: {
          name: '',
          columns: [],
          unique: false,
          type: 'BTREE'
        }
      });
      
      const deleteTableDialog = reactive({
        visible: false,
        loading: false
      });
      
      const deleteRowDialog = reactive({
        visible: false,
        loading: false,
        row: null
      });
      
      // Form validation rules
      const createTableRules = {
        tableName: [
          { required: true, message: 'Tabellnavn er påkrevd', trigger: 'blur' },
          { pattern: /^[a-zA-Z0-9_]+$/, message: 'Tabellnavn kan kun inneholde bokstaver, tall og understrek', trigger: 'blur' }
        ]
      };
      
      const addColumnRules = {
        name: [
          { required: true, message: 'Kolonnenavn er påkrevd', trigger: 'blur' },
          { pattern: /^[a-zA-Z0-9_]+$/, message: 'Kolonnenavn kan kun inneholde bokstaver, tall og understrek', trigger: 'blur' }
        ],
        type: [
          { required: true, message: 'Type er påkrevd', trigger: 'change' }
        ]
      };
      
      const addIndexRules = {
        name: [
          { required: true, message: 'Indeksnavn er påkrevd', trigger: 'blur' },
          { pattern: /^[a-zA-Z0-9_]+$/, message: 'Indeksnavn kan kun inneholde bokstaver, tall og understrek', trigger: 'blur' }
        ],
        columns: [
          { required: true, message: 'Velg minst én kolonne', trigger: 'change' },
          { type: 'array', min: 1, message: 'Velg minst én kolonne', trigger: 'change' }
        ],
        type: [
          { required: true, message: 'Indekstype er påkrevd', trigger: 'change' }
        ]
      };
      
      // Computed properties
      const filteredTables = computed(() => {
        if (!searchQuery.value) {
          return tables.value;
        }
        
        const query = searchQuery.value.toLowerCase();
        return tables.value.filter(table => 
          table.toLowerCase().includes(query)
        );
      });
      
      const filteredTableData = computed(() => {
        if (!tableSearchQuery.value) {
          return tableData.value;
        }
        
        const query = tableSearchQuery.value.toLowerCase();
        return tableData.value.filter(row => {
          return Object.entries(row).some(([key, value]) => {
            if (value === null) return false;
            return String(value).toLowerCase().includes(query);
          });
        });
      });
      
      // Methods
      const fetchTables = async () => {
        loadingTables.value = true;
        try {
          const response = await axios.get(`${apiUrl}/admin/db/tables`, { withCredentials: true });
          if (response.data && response.data.success) {
            tables.value = response.data.content;
          } else {
            ElMessage.error(response.data.message || 'Kunne ikke hente tabeller');
          }
        } catch (error) {
          console.error('Feil ved henting av tabeller:', error);
          ElMessage.error('En feil oppsto ved henting av tabeller');
        } finally {
          loadingTables.value = false;
          
        }
      };
      
    const prepareFormData = (data) => {
        const result = { ...data };
        
        // Konverter numeriske boolean-verdier til ekte boolean-verdier
        tableColumns.value.forEach(column => {
            if (isBooleanColumnType(column.type) && column.name in result) {
            // Konverter 1/0 til true/false
            if (result[column.name] === 1 || result[column.name] === '1') {
                result[column.name] = true;
            } else if (result[column.name] === 0 || result[column.name] === '0') {
                result[column.name] = false;
            }
            }
        });
        
        return result;
    };

      const selectTable = (tableName) => {
        activeTable.value = tableName;
        currentPage.value = 1;
        tableSearchQuery.value = '';
        fetchTableData();
        fetchTableColumns();
      };
      
      const fetchTableData = async () => {
        if (!activeTable.value) return;
        
        loadingData.value = true;
        try {
          const response = await axios.get(
            `${apiUrl}/admin/db/tables/${activeTable.value}`, 
            { 
              params: { page: currentPage.value, pageSize: pageSize.value },
              withCredentials: true 
            }
          );

          if (response.data && response.data.success) {
            tableData.value = response.data.content.data;
            totalRows.value = response.data.content.pagination.total;
          } else {
            ElMessage.error(response.data.message || 'Kunne ikke hente data');
          }
        } catch (error) {
          console.error('Feil ved henting av tabelldata:', error);
          ElMessage.error('En feil oppsto ved henting av tabelldata');
        } finally {
          loadingData.value = false;
        }
      };
      
      const fetchTableColumns = async () => {
        if (!activeTable.value) return;
        
            try {
                const response = await axios.get(
                `${apiUrl}/admin/db/tables/${activeTable.value}/columns`,
                { withCredentials: true }
                );
                
                if (response.data && response.data.success && response.data.content) {
                tableColumns.value = Object.entries(response.data.content || {}).map(([name, details]) => ({
                    name,
                    type: details.type,
                    allowNull: details.allowNull,
                    defaultValue: details.defaultValue,
                    primaryKey: details.primaryKey,
                    autoIncrement: details.autoIncrement
                }));
                } else {
                ElMessage.error(response.data.message || 'Kunne ikke hente kolonner');
                tableColumns.value = []; // Sett til tom array ved feil
                }
            } catch (error) {
                console.error('Feil ved henting av kolonner:', error);
                ElMessage.error('En feil oppsto ved henting av kolonner');
                tableColumns.value = []; // Sett til tom array ved feil
            }
        };
      
      const fetchTableIndexes = async () => {
        if (!activeTable.value) return;
        
        try {
          const response = await axios.get(
            `${apiUrl}/admin/db/tables/${activeTable.value}/indexes`,
            { withCredentials: true }
          );
          
          if (response.data && response.data.success) {
            tableIndexes.value = response.data.data;
          } else {
            ElMessage.error(response.data.message || 'Kunne ikke hente indekser');
          }
        } catch (error) {
          console.error('Feil ved henting av indekser:', error);
          ElMessage.error('En feil oppsto ved henting av indekser');
        }
      };
      
      const refreshTableData = () => {
        fetchTableData();
      };
      
      const showTableStructure = () => {
        fetchTableColumns();
        fetchTableIndexes();
        structureDialog.visible = true;
      };
      
      const addColumn = () => {
        createTableDialog.form.columns.push({
          name: '',
          type: 'VARCHAR(255)',
          primaryKey: false,
          notNull: false,
          autoIncrement: false
        });
      };
      
      const removeColumn = (index) => {
        createTableDialog.form.columns.splice(index, 1);
      };
      
      const createTable = async () => {
        // Validate form
        if (!createTableDialog.form.tableName) {
          ElMessage.error('Tabellnavn er påkrevd');
          return;
        }
        
        if (createTableDialog.form.columns.length === 0) {
          ElMessage.error('Tabellen må ha minst én kolonne');
          return;
        }
        
        // Check for empty column names
        const emptyColumnNames = createTableDialog.form.columns.some(col => !col.name);
        if (emptyColumnNames) {
          ElMessage.error('Alle kolonner må ha et navn');
          return;
        }
        
        // Check for valid column types
        const invalidColumnTypes = createTableDialog.form.columns.some(col => !col.type);
        if (invalidColumnTypes) {
          ElMessage.error('Alle kolonner må ha en type');
          return;
        }
        
        // Check for duplicate column names
        const columnNames = createTableDialog.form.columns.map(col => col.name);
        const hasDuplicates = columnNames.some((name, index) => 
          columnNames.indexOf(name) !== index
        );
        
        if (hasDuplicates) {
          ElMessage.error('Duplikate kolonnenavn er ikke tillatt');
          return;
        }
        
        createTableDialog.loading = true;
        
        try {
          const response = await axios.post(
            `${apiUrl}/admin/db/tables/create`,
            {
              tableName: createTableDialog.form.tableName,
              columns: createTableDialog.form.columns
            },
            { withCredentials: true }
          );
          
          if (response.data && response.data.success) {
            ElMessage.success('Tabell opprettet');
            createTableDialog.visible = false;
            
            // Reset form
            createTableDialog.form.tableName = '';
            createTableDialog.form.columns = [];
            
            // Refresh table list
            fetchTables();
            
            // Select the newly created table
            activeTable.value = createTableDialog.form.tableName;
            fetchTableData();
            fetchTableColumns();
          } else {
            ElMessage.error(response.data.message || 'Kunne ikke opprette tabell');
          }
        } catch (error) {
          console.error('Feil ved oppretting av tabell:', error);
          ElMessage.error('En feil oppsto ved oppretting av tabell');
        } finally {
          createTableDialog.loading = false;
        }
      };
      
      const editRow = (row) => {
        // Konverter numeriske boolean til ekte boolean-verdier
        editRowDialog.form = prepareFormData({ ...row });
        editRowDialog.originalRow = row;
        editRowDialog.visible = true;
      };
      
      const prepareDataForSaving = (formData) => {
        const result = { ...formData };
        
        tableColumns.value.forEach(column => {
            if (isBooleanColumnType(column.type) && column.name in result) {
            // Boolean kan håndteres av MySQL direkte, men om du vil være konsistent
            // kan du konvertere tilbake til 1/0
            if (result[column.name] === true) {
                result[column.name] = 1;
            } else if (result[column.name] === false) {
                result[column.name] = 0;
            }
            }
        });
        
        return result;
      };

      const saveRowChanges = async () => {
        editRowDialog.loading = true;
        
        try {
            const dataToSave = prepareDataForSaving(editRowDialog.form);
            
            const response = await axios.post(
                `${apiUrl}/admin/db/tables/${activeTable.value}/edit`,
                {
                    data: [dataToSave]
                },
                { withCredentials: true }
            );
            
          if (response.data && response.data.success) {
            
            ElMessage.success('Rad oppdatert');
            editRowDialog.visible = false;
            fetchTableData();
          } else {
            ElMessage.error(response.data.message || 'Kunne ikke oppdatere rad');
          }
        } catch (error) {
          console.error('Feil ved oppdatering av rad:', error);
          ElMessage.error('En feil oppsto ved oppdatering av rad');
        } finally {
          editRowDialog.loading = false;
        }
      };
      
        // Oppdatert findPrimaryKeyColumn-funksjon
    const findPrimaryKeyColumn = () => {
        if (!tableColumns.value || tableColumns.value.length === 0) {
            // Hvis tabellen ikke har kolonner definert, søk etter første kolonne
            if (tableData.value && tableData.value.length > 0) {
            const firstRow = tableData.value[0];
            // Bruk første tilgjengelige kolonne som identifikator
            return Object.keys(firstRow)[0];
            }
            return null; // Ingen kolonner eller data
        }
        
        // Søk etter en primærnøkkel
        const pkColumn = tableColumns.value.find(col => col.primaryKey);
        if (pkColumn) return pkColumn.name;
        
        // Ingen primærnøkkel, bruk første kolonne som "identifikator"
        return tableColumns.value.length > 0 ? tableColumns.value[0].name : null;
        };

        // Oppdatert confirmDeleteRow-funksjon
    const confirmDeleteRow = (row) => {
        const pkColumn = findPrimaryKeyColumn();
        
        if (!pkColumn) {
            ElMessage.warning('Kan ikke slette rad: Kunne ikke identifisere en nøkkelkolonne');
            return;
        }
        
        const idValue = row[pkColumn];
        
        if (idValue === undefined || idValue === null) {
            ElMessage.warning(`Kan ikke slette rad: Mangler verdi for kolonne "${pkColumn}"`);
            return;
        }
        
        console.log(`Forbereder sletting av rad med ${pkColumn}=${idValue}`);
        
        // Kopier raden og legg ved hvilken kolonne som skal brukes som "primærnøkkel"
        deleteRowDialog.row = { ...row, __pkColumn: pkColumn };
        deleteRowDialog.visible = true;
        };

        // Endre deleteRowConfirmed-funksjonen

    const deleteRowConfirmed = async () => {
        if (!deleteRowDialog.visible || !deleteRowDialog.row) return;
        
        deleteRowDialog.loading = true;
        
        try {
            // Bruk den lagrede pkColumn eller finn den på nytt
            const pkColumn = deleteRowDialog.row.__pkColumn || findPrimaryKeyColumn();
            
            if (!pkColumn) {
            ElMessage.error('Kan ikke slette rad: Ingen kolonne å identifisere raden med');
            deleteRowDialog.loading = false;
            return;
            }
            
            // Hent identifikatorverdi
            const idValue = deleteRowDialog.row[pkColumn];
            
            console.log(`Forsøker å slette rad med ${pkColumn}=${idValue} fra ${activeTable.value}`);
            
            // VIKTIG: Endre endepunktet fra ".../delete" til ".../data"
            const response = await axios.delete(
            `${apiUrl}/admin/db/tables/${activeTable.value}/delete`,
            { 
                data: { 
                id: idValue,
                pkColumn: pkColumn
                },
                withCredentials: true 
            }
            );
            
            if (response.data && response.data.success) {
            ElMessage.success('Rad slettet');
            fetchTableData();
            } else {
            ElMessage.error(response.data.message || 'Kunne ikke slette rad');
            }
        } catch (error) {
            console.error('Feil ved sletting av rad:', error);
            // Legg til flere detaljer om feilen
            if (error.response && error.response.data) {
            console.error('Server response:', error.response.data);
            ElMessage.error(`Feil ved sletting av rad: ${error.response.data.message || error.message}`);
            } else {
            ElMessage.error(`Feil ved sletting av rad: ${error.message || 'Ukjent feil'}`);
            }
        } finally {
            deleteRowDialog.visible = false;
            deleteRowDialog.loading = false;
            deleteRowDialog.row = null;
        }
        };
      
      const addNewRow = async () => {
        addRowDialog.loading = true;
        
        try {
          const response = await axios.post(
            `${apiUrl}/admin/db/tables/${activeTable.value}/edit`,
            {
              data: [addRowDialog.form]
            },
            { withCredentials: true }
          );
          
          if (response.data && response.data.success) {
            ElMessage.success('Rad lagt til');
            addRowDialog.visible = false;
            fetchTableData();
          } else {
            ElMessage.error(response.data.message || 'Kunne ikke legge til rad');
          }
        } catch (error) {
          console.error('Feil ved legging til rad:', error);
          ElMessage.error('En feil oppsto ved legging til rad');
        } finally {
          addRowDialog.loading = false;
        }
      };
      
      const addColumnToTable = async () => {
        addColumnDialog.loading = true;
        
        try {
          const response = await axios.post(
            `${apiUrl}/admin/db/tables/${activeTable.value}/columns/add`,
            addColumnDialog.form,
            { withCredentials: true }
          );
          
          if (response.data && response.data.success) {
            ElMessage.success('Kolonne lagt til');
            addColumnDialog.visible = false;
            fetchTableColumns();
            fetchTableData();
          } else {
            ElMessage.error(response.data.message || 'Kunne ikke legge til kolonne');
          }
        } catch (error) {
          console.error('Feil ved legging til kolonne:', error);
          ElMessage.error('En feil oppsto ved legging til kolonne');
        } finally {
          addColumnDialog.loading = false;
        }
      };
      
      const addIndexToTable = async () => {
        addIndexDialog.loading = true;
        
        try {
          const response = await axios.post(
            `${apiUrl}/admin/db/tables/${activeTable.value}/indexes/add`,
            addIndexDialog.form,
            { withCredentials: true }
          );
          
          if (response.data && response.data.success) {
            ElMessage.success('Indeks lagt til');
            addIndexDialog.visible = false;
            fetchTableIndexes();
          } else {
            ElMessage.error(response.data.message || 'Kunne ikke legge til indeks');
          }
        } catch (error) {
          console.error('Feil ved legging til indeks:', error);
          ElMessage.error('En feil oppsto ved legging til indeks');
        } finally {
          addIndexDialog.loading = false;
        }
      };
      
      const confirmDeleteTable = () => {
        deleteTableDialog.visible = true;
      };
      
      const deleteTableConfirmed = async () => {
        deleteTableDialog.loading = true;
        
        try {
          const response = await axios.delete(
            `${apiUrl}/admin/db/tables/${activeTable.value}`,
            { withCredentials: true }
          );
          
          if (response.data && response.data.success) {
            ElMessage.success('Tabell slettet');
            deleteTableDialog.visible = false;
            activeTable.value = '';
            fetchTables();
          } else {
            ElMessage.error(response.data.message || 'Kunne ikke slette tabell');
          }
        } catch (error) {
          console.error('Feil ved sletting av tabell:', error);
          ElMessage.error('En feil oppsto ved sletting av tabell');
        } finally {
          deleteTableDialog.loading = false;
        }
      };
      
      // Helper functions
      const formatCellValue = (value) => {
        if (value === null) return '<null>';
        if (value instanceof Date) return formatDate(value);
        return String(value);
      };
      
      const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString('nb-NO', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      };
      
      const getIndexTypeColor = (type) => {
        const types = {
          'BTREE': 'success',
          'HASH': 'warning',
          'FULLTEXT': 'danger',
          'SPATIAL': 'info'
        };
        return types[type] || 'info';
      };
      
      const isSpecialColumnType = (type) => {
        if (!type) return false;
        const typeStr = type.toLowerCase();
        return (
          typeStr.includes('date') || 
          typeStr.includes('time') || 
          typeStr === 'boolean' || 
          typeStr.includes('int') || 
          typeStr.includes('float') || 
          typeStr.includes('double') || 
          typeStr.includes('decimal')
        );
      };
      
      const isDateColumnType = (type) => {
        if (!type) return false;
        const typeStr = type.toLowerCase();
        return typeStr.includes('date') || typeStr.includes('time');
      };
      
      const isBooleanColumnType = (type) => {
        if (!type) return false;
        const typeStr = type.toLowerCase();
        return typeStr === 'boolean' || typeStr === 'tinyint(1)';
      };
      
      const isNumberColumnType = (type) => {
        if (!type) return false;
        const typeStr = type.toLowerCase();
        return (
          typeStr.includes('int') || 
          typeStr.includes('float') || 
          typeStr.includes('double') || 
          typeStr.includes('decimal')
        );
      };
      
      const isIntegerType = (type) => {
        if (!type) return false;
        const typeStr = type.toLowerCase();
        return typeStr.includes('int');
      };
      
      const isColumnRequired = (column) => {
        return column.notNull && !column.autoIncrement && column.defaultValue === null;
      };
      
      // Initialize
      onMounted(() => {
        fetchTables();
      });

      watch(() => addRowDialog.visible, (newValue) => {
        if (newValue) {
            // Initier tomme verdier
            const initialData = {};
            tableColumns.value.forEach(column => {
            if (isBooleanColumnType(column.type)) {
                initialData[column.name] = false; // Standard boolean-verdi
            } else {
                initialData[column.name] = null;
            }
            });
            addRowDialog.form = initialData;
        }
    });
      
      return {
        // Data
        tables,
        loadingTables,
        searchQuery,
        activeTable,
        tableData,
        loadingData,
        tableColumns,
        tableIndexes,
        currentPage,
        pageSize,
        totalRows,
        tableSearchQuery,
        
        // Computed
        filteredTables,
        filteredTableData,
        
        // Dialogs
        createTableDialog,
        editRowDialog,
        addRowDialog,
        structureDialog,
        addColumnDialog,
        addIndexDialog,
        deleteTableDialog,
        deleteRowDialog,
        
        // Form rules
        createTableRules,
        addColumnRules,
        addIndexRules,
        
        // Methods
        selectTable,
        fetchTableData,
        refreshTableData,
        showTableStructure,
        addColumn,
        removeColumn,
        createTable,
        editRow,
        saveRowChanges,
        confirmDeleteRow,
        deleteRowConfirmed,
        addNewRow,
        addColumnToTable,
        addIndexToTable,
        confirmDeleteTable,
        deleteTableConfirmed,
        
        // Helper functions
        formatCellValue,
        getIndexTypeColor,
        isSpecialColumnType,
        isDateColumnType,
        isBooleanColumnType,
        isNumberColumnType,
        isIntegerType,
        isColumnRequired,
        
        // Icons
        Search, Plus, Edit, Delete, Check, Warning, View,
        Grid, Files, Refresh
      };
    }
  };
  </script>
  
  <style scoped>
  .db-editor-container {
    margin: 1rem 2%; /* Redusert margin topp/bunn og bruker prosent på sidene */
    padding: 0 1rem;
    max-width: 1800px; /* Maksimal bredde for container */
    margin-left: auto;
    margin-right: auto;
  }
  
  .db-editor-card {
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
  
  .db-layout {
    display: flex;
    gap: 20px;
    margin-top: 20px;
  }
  
  .tables-sidebar {
    width: 250px;
    flex-shrink: 0;
    border-right: 1px solid #e6e6e6;
    padding-right: 20px;
  }
  
  .sidebar-title {
    margin-top: 0;
    margin-bottom: 16px;
    font-size: 16px;
    color: #606266;
  }
  
  .tables-menu {
    border-right: none;
  }
  
  .empty-tables {
    text-align: center;
    padding: 20px;
    color: #909399;
  }
  
  .table-content {
    flex-grow: 1;
    min-width: 0;
  }
  
  .welcome-message {
    padding: 40px;
    text-align: center;
  }
  
  .empty-icon {
    font-size: 60px;
    color: #909399;
  }
  
  .table-header {
    margin-bottom: 16px;
  }
  
  .table-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }
  
  .table-title h3 {
    margin: 0;
    font-size: 18px;
  }
  
  .table-actions {
    display: flex;
    gap: 8px;
  }
  
  .table-search-input {
    margin-bottom: 16px;
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
  
  .columns-container {
    margin-bottom: 16px;
  }
  
  .column-item {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
    gap: 8px;
  }
  
  .column-fields {
    display: flex;
    flex-grow: 1;
    gap: 8px;
    flex-wrap: wrap;
  }
  
  .column-name {
    flex: 2;
    min-width: 150px;
  }
  
  .column-type {
    flex: 1;
    min-width: 120px;
  }
  
  .column-options {
    display: flex;
    gap: 16px;
    align-items: center;
    flex-wrap: wrap;
  }
  
  .add-column-btn {
    margin-top: 12px;
  }
  
  .structure-actions {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }
  
  .index-column {
    margin-right: 4px;
    margin-bottom: 4px;
  }
  
  .is-null {
    color: #909399;
    font-style: italic;
  }
  
  .loading-container {
    padding: 20px;
  }
  
  @media (max-width: 768px) {
    .db-layout {
      flex-direction: column;
    }
    
    .tables-sidebar {
      width: 100%;
      border-right: none;
      border-bottom: 1px solid #e6e6e6;
      padding-right: 0;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    
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
    
    .column-fields {
      flex-direction: column;
    }
    
    .column-name, .column-type {
      width: 100%;
    }
  }
  </style>