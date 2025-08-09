<template>
  <div class="sample-list-container">
    <el-card class="sample-list-card">
      <!----------------------------- CARD HEADER --------------------------------->
      <template #header>
        <div class="card-header">
          <h2>
            <el-icon><Files /></el-icon>
            Prøveoversikt
          </h2>
          <div class="header-actions">
            <el-input
              v-model="searchQuery"
              placeholder="Søk... (ID, leverandør, matrix, RFID, batch)"
              prefix-icon="Search"
              clearable
              class="search-input"
            />
            <el-button type="primary" :icon="Plus" @click="navigateToAddSample">
              Legg til ny prøve
            </el-button>
          </div>
        </div>
      </template>

      <!----------------------------- TABLE -------------------------------------->
      <el-table
        v-loading="loading"
        :data="filtered"
        style="width: 100%"
        @row-click="editSample"
        row-key="id"
        highlight-current-row
        empty-text="Ingen prøver funnet"
      >
        <el-table-column prop="id" label="ID" sortable width="70" />

        <el-table-column prop="supplier" label="Leverandør" sortable />
        <el-table-column prop="matrix" label="Matrix" sortable />
        <el-table-column prop="type.name" label="Prøvetype" sortable />

        <el-table-column prop="batch_id" label="Batch ID" sortable width="110" />
        <el-table-column prop="storage_temp" label="L.t (°C)" sortable width="130" />
        <el-table-column prop="comment" label="Kommentar" sortable />

        <el-table-column
          prop="sample_taken_time"
          label="Tatt"
          sortable
          width="160"
        >
          <template #default="{ row }">
            {{ toDate(row.sample_taken_time) }}
          </template>
        </el-table-column>

        <el-table-column
          prop="slot.Rack.rfid"
          label="Rack RFID"
          width="160"
        >
          <template #default="{ row }">
            <el-link
              v-if="row.slot && row.slot.Rack"
              type="primary"
              @click.stop="editRack(row.slot.Rack)"
            >
              {{ row.slot.Rack.rfid }}
            </el-link>
            <span v-else>–</span>
          </template>
        </el-table-column>

        <el-table-column prop="selected" label="Valgt" width="90">
          <template #default="{ row }">
            <el-tag :type="row.selected ? 'success' : 'info'">
              {{ row.selected ? 'Ja' : 'Nei' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column fixed="right" label="Handlinger" width="120">
          <template #default="{ row }">
            <el-button text type="primary" :icon="Edit" @click.stop="editSample(row)">
              Rediger
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!----------------------------- PAGINATION ---------------------------------->
      <div class="pagination-container">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next"
          :total="totalSamples"
          :page-sizes="[10, 20, 50, 100]"
          :current-page="currentPage"
          :page-size="pageSize"
          @update:current-page="handleCurrentChange"
          @update:page-size="handleSizeChange"
        />
      </div>
    </el-card>

    <!----------------------------- SAMPLE DIALOG -------------------------------->
    <el-dialog v-model="sampleDialog.visible" title="Rediger prøve" width="500px" :close-on-click-modal="false" destroy-on-close>
      <el-form ref="sampleFormRef" :model="sampleDialog.form" :rules="sampleRules" label-position="top">
        <el-form-item label="Leverandør" prop="supplier">
          <el-input v-model="sampleDialog.form.supplier" />
        </el-form-item>
        <el-form-item label="Matrix" prop="matrix">
          <el-input v-model="sampleDialog.form.matrix" />
        </el-form-item>
        <el-form-item label="Prøvetype" prop="sample_type">
          <el-select v-model="sampleDialog.form.sample_type" style="width: 100%">
            <el-option v-for="t in sampleTypes" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="Batch ID" prop="batch_id">
          <el-input v-model="sampleDialog.form.batch_id" />
        </el-form-item>
        <el-form-item label="Lagringstemperatur (°C)" prop="storage_temp">
          <el-input-number v-model="sampleDialog.form.storage_temp" :step="1" :min="-100" :max="100" style="width: 100%" />
        </el-form-item>
        <el-form-item label="Kommentar" prop="comment">
          <el-input v-model="sampleDialog.form.comment" type="textarea" rows="3" />
        </el-form-item>
        <el-form-item label="Tatt" prop="sample_taken_time">
          <el-date-picker v-model="sampleDialog.form.sample_taken_time" type="datetime" format="DD.MM.YYYY HH:mm" value-format="YYYY-MM-DDTHH:mm:ss" style="width: 100%" />
        </el-form-item>
        <el-form-item label="Valgt">
          <el-switch v-model="sampleDialog.form.selected" active-text="Ja" inactive-text="Nei" inline-prompt />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="sampleDialog.visible = false">Avbryt</el-button>
          <el-button type="danger" :icon="Delete" @click="askDeleteSample" :disabled="!sampleDialog.form.id">
            Slett
          </el-button>
          <el-button type="primary" :loading="sampleDialog.loading" :icon="Check" @click="saveSample">
            Lagre
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!----------------------------- RACK DIALOG ---------------------------------->
    <el-dialog v-model="rackDialog.visible" title="Rediger rack" width="420px" :close-on-click-modal="false" destroy-on-close>
      <el-form :model="rackDialog.form" label-position="top" ref="rackFormRef">
        <el-form-item label="RFID" prop="rfid">
          <el-input v-model="rackDialog.form.rfid" />
        </el-form-item>
        <el-form-item label="Tillatt prøvetype" prop="sample_type">
          <el-select v-model="rackDialog.form.sample_type" style="width: 100%">
            <el-option v-for="t in sampleTypes" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="rackDialog.visible = false">Avbryt</el-button>
          <el-button type="primary" :loading="rackDialog.loading" :icon="Check" @click="saveRack">
            Lagre
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!----------------------------- CONFIRM DELETE -------------------------------->
    <el-dialog v-model="deleteDialog.visible" title="Bekreft sletting" width="380px">
      <p>Vil du slette prøve <strong>{{ deleteDialog.id }}</strong>? Dette kan ikke angres.</p>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="deleteDialog.visible = false">Avbryt</el-button>
          <el-button type="danger" :loading="deleteDialog.loading" @click="deleteSample">
            Slett
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!----------------------------- ADD SAMPLE DIALOG ----------------------------->
    <el-dialog v-model="addSampleDialog.visible" title="Ny prøve" width="600px" destroy-on-close>
      <AddSampleView dialog-mode @sample-added="handleSampleAdded" ref="addSampleComp" />
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="addSampleDialog.visible = false">Avbryt</el-button>
          <el-button type="primary" :loading="addSampleDialog.loading" :icon="Plus" @click="submitAddSampleForm">
            Legg til
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { Files, Search, Plus, Edit, Check, Delete } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import {
  lab_getSamples,
  lab_updateSample,
  lab_deleteSample,
  lab_getSampleTypes,
  lab_updateRack,
} from '@/middleware/lab/backend_lab';
import AddSampleView from '@/views/lab/AddSampleView.vue';

/************************* STATE *********************************/
const loading = ref(true);
const samples = ref([]);
const sampleTypes = ref([]);

const currentPage = ref(1);
const pageSize = ref(10);
const totalSamples = ref(0);
const searchQuery = ref('');

/************************* DIALOG STATE ***************************/
const sampleDialog = reactive({
  visible: false,
  loading: false,
  form: {
    id: null,
    supplier: '',
    matrix: '',
    sample_type: null,
    batch_id: '',
    storage_temp: null,
    comment: '',
    sample_taken_time: '',
    selected: false,
  },
});

const rackDialog = reactive({
  visible: false,
  loading: false,
  form: {
    id: null,
    rfid: '',
    sample_type: null,
  },
});

const deleteDialog = reactive({ visible: false, loading: false, id: null });
const addSampleDialog = reactive({ visible: false, loading: false });

/************************* RULES **********************************/
const sampleRules = {
  supplier: [{ required: true, message: 'Påkrevd', trigger: 'blur' }],
  matrix: [{ required: true, message: 'Påkrevd', trigger: 'blur' }],
  sample_taken_time: [{ required: true, message: 'Påkrevd', trigger: 'change' }],
  sample_type: [{ required: true, message: 'Påkrevd', trigger: 'change' }],
};

/************************* COMPUTED *******************************/
const filtered = computed(() => {
  if (!searchQuery.value) return samples.value;
  const q = searchQuery.value.toLowerCase();
  return samples.value.filter(s =>
    String(s.id).includes(q) ||
    (s.supplier && s.supplier.toLowerCase().includes(q)) ||
    (s.matrix && s.matrix.toLowerCase().includes(q)) ||
    (s.batch_id && String(s.batch_id).toLowerCase().includes(q)) ||
    (s.comment && s.comment.toLowerCase().includes(q)) ||
    (s.slot?.Rack?.rfid && s.slot.Rack.rfid.toLowerCase().includes(q)),
  );
});

/************************* FETCH **********************************/
async function fetchSamples() {
  loading.value = true;
  const res = await lab_getSamples({ page: currentPage.value, pageSize: pageSize.value });
  if (res.success) {
    samples.value = res.data;
    totalSamples.value = res.data.length;
  } else ElMessage.error(res.message);
  loading.value = false;
}

async function fetchSampleTypes() {
  const res = await lab_getSampleTypes();
  if (res.success) sampleTypes.value = res.data;
}

/************************* UTIL ***********************************/
const toDate = ts => ts ? new Date(ts).toLocaleString('nb-NO', { hour12: false }) : '';

/************************* SAMPLE CRUD ****************************/
function editSample(row) {
  Object.assign(sampleDialog.form, row);
  sampleDialog.visible = true;
}

async function saveSample() {
  sampleDialog.loading = true;
  const { id, ...payload } = sampleDialog.form;
  const res = await lab_updateSample(id, payload);
  if (res.success) {
    ElMessage.success('Oppdatert');
    sampleDialog.visible = false;
    fetchSamples();
  } else ElMessage.error(res.message);
  sampleDialog.loading = false;
}

function askDeleteSample() {
  deleteDialog.id = sampleDialog.form.id;
  deleteDialog.visible = true;
}

async function deleteSample() {
  deleteDialog.loading = true;
  const res = await lab_deleteSample(deleteDialog.id);
  if (res.success) {
    ElMessage.success('Slettet');
    deleteDialog.visible = false;
    sampleDialog.visible = false;
    fetchSamples();
  } else ElMessage.error(res.message);
  deleteDialog.loading = false;
}

/************************* RACK EDIT ******************************/
function editRack(rack) {
  Object.assign(rackDialog.form, rack);
  rackDialog.visible = true;
}

async function saveRack() {
  rackDialog.loading = true;
  const { id, ...payload } = rackDialog.form;
  const res = await lab_updateRack(id, payload);
  if (res.success) {
    ElMessage.success('Rack lagret');
    rackDialog.visible = false;
    fetchSamples();
  } else ElMessage.error(res.message);
  rackDialog.loading = false;
}

/************************* PAGINATION *****************************/
function handleSizeChange(size) {
  pageSize.value = size;
  currentPage.value = 1;
  fetchSamples();
}
function handleCurrentChange(page) {
  currentPage.value = page;
  fetchSamples();
}

/************************* ADD SAMPLE *****************************/
function navigateToAddSample() { addSampleDialog.visible = true; }
async function submitAddSampleForm() {
  if (!addSampleDialog.loading) {
    addSampleDialog.loading = true;
    const ok = await addSampleComp.value.submitForm();
    if (ok) {
      addSampleDialog.visible = false;
      fetchSamples();
    }
    addSampleDialog.loading = false;
  }
}
function handleSampleAdded() { addSampleDialog.visible = false; fetchSamples(); }

/************************* LIFECYCLE *****************************/
onMounted(() => {
  fetchSamples();
  fetchSampleTypes();
});

/************************* REFS ***********************************/
const sampleFormRef = ref();
const rackFormRef = ref();
const addSampleComp = ref();
</script>

<style scoped>
.sample-list-container{margin:2rem auto;padding:0 1rem;max-width:1500px}
.sample-list-card{border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.1)}
.card-header{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px}
.card-header h2{margin:0;font-size:1.5rem;display:flex;align-items:center;gap:8px}
.header-actions{display:flex;gap:16px;align-items:center;flex-wrap:wrap}
.search-input{width:240px}
.pagination-container{margin-top:20px;display:flex;justify-content:center}
.dialog-footer{display:flex;justify-content:space-between}
.dialog-footer .el-button:first-child{margin-right:auto}
@media(max-width:768px){.card-header{flex-direction:column;align-items:flex-start}.search-input{width:100%}.dialog-footer{flex-direction:column;gap:12px}.dialog-footer .el-button:first-child{margin-right:0}.dialog-footer .el-button{width:100%}}
</style>
