<template>
  <div class="add-sample-container" :class="{ 'dialog-mode': dialogMode }">
    <!-- Frittstående kort -------------------------------------------------->
    <el-card v-if="!dialogMode" class="add-sample-card">
      <template #header>
        <div class="card-header">
          <h2><el-icon><DocumentAdd /></el-icon> Legg til ny prøve</h2>
        </div>
      </template>

      <el-form
        ref="sampleForm"
        :model="formData"
        :rules="rules"
        label-position="top"
        status-icon
        @submit.prevent="submitForm"
      >
        <el-form-item label="Leverandør" prop="supplier">
          <el-input v-model="formData.supplier" />
        </el-form-item>

        <el-form-item label="Matrix" prop="matrix">
          <el-input v-model="formData.matrix" />
        </el-form-item>

        <el-form-item label="Prøvetype" prop="sample_type">
          <el-select v-model="formData.sample_type" style="width: 100%">
            <el-option
              v-for="t in sampleTypes"
              :key="t.id"
              :label="t.name"
              :value="t.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="Batch ID" prop="batch_id">
          <el-input v-model="formData.batch_id" />
        </el-form-item>

        <el-form-item label="Lagringstemperatur (°C)" prop="storage_temp">
          <el-input-number
            v-model="formData.storage_temp"
            :step="1"
            :min="-100"
            :max="100"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="Kommentar" prop="comment">
          <el-input v-model="formData.comment" type="textarea" rows="3" />
        </el-form-item>

        <el-form-item label="Tatt" prop="sample_taken_time">
          <el-date-picker
            v-model="formData.sample_taken_time"
            type="datetime"
            format="DD.MM.YYYY HH:mm"
            value-format="YYYY-MM-DDTHH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="Valgt">
          <el-switch
            v-model="formData.selected"
            active-text="Ja"
            inactive-text="Nei"
            inline-prompt
          />
        </el-form-item>

        <!-- Meldinger -->
        <el-alert
          v-if="error"
          :title="error"
          type="error"
          show-icon
          class="mb-4"
          :closable="false"
        />
        <el-alert
          v-if="success"
          :title="success"
          type="success"
          show-icon
          class="mb-4"
          :closable="false"
        />

        <!-- Knapper -->
        <div class="form-actions">
          <el-button
            type="primary"
            native-type="submit"
            :loading="isLoading"
            :icon="isLoading ? Loading : Plus"
            round
          >
            {{ isLoading ? 'Legger til…' : 'Legg til prøve' }}
          </el-button>
          <el-button @click="resetForm" :icon="Delete" round>
            Nullstill skjema
          </el-button>
        </div>
      </el-form>
    </el-card>

    <!-- Dialog-modus ------------------------------------------------------->
    <el-form
      v-else
      ref="sampleForm"
      :model="formData"
      :rules="rules"
      label-position="top"
      status-icon
    >
      <el-form-item label="Leverandør" prop="supplier">
        <el-input v-model="formData.supplier" />
      </el-form-item>

      <el-form-item label="Matrise" prop="matrix">
        <el-input v-model="formData.matrix" />
      </el-form-item>

      <el-form-item label="Prøvetype" prop="sample_type">
        <el-select v-model="formData.sample_type" style="width: 100%">
          <el-option
            v-for="t in sampleTypes"
            :key="t.id"
            :label="t.name"
            :value="t.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="Batch ID" prop="batch_id">
        <el-input v-model="formData.batch_id" />
      </el-form-item>

      <el-form-item label="Lagringstemperatur (°C)" prop="storage_temp">
        <el-input-number
          v-model="formData.storage_temp"
          :step="1"
          :min="-100"
          :max="100"
          style="width: 100%"
        />
      </el-form-item>

      <el-form-item label="Kommentar" prop="comment">
        <el-input v-model="formData.comment" type="textarea" rows="3" />
      </el-form-item>

      <el-form-item label="Tatt" prop="sample_taken_time">
        <el-date-picker
          v-model="formData.sample_taken_time"
          type="datetime"
          format="DD.MM.YYYY HH:mm"
          value-format="YYYY-MM-DDTHH:mm:ss"
          style="width: 100%"
        />
      </el-form-item>

      <el-form-item label="Valgt">
        <el-switch
          v-model="formData.selected"
          active-text="Ja"
          inactive-text="Nei"
          inline-prompt
        />
      </el-form-item>

      <el-alert
        v-if="error"
        :title="error"
        type="error"
        show-icon
        class="mb-4"
        :closable="false"
      />
    </el-form>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { DocumentAdd, Plus, Delete, Loading } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { lab_createSample, lab_getSampleTypes } from '@/middleware/lab/backend_lab';

/******************** Props & emit ********************************/
const props = defineProps({ dialogMode: { type: Boolean, default: false } });
const emit = defineEmits(['sample-added']);

/******************** State ****************************************/
const sampleForm  = ref(null);
const isLoading   = ref(false);
const error       = ref(null);
const success     = ref(null);
const sampleTypes = ref([]);

const initialFormData = () => ({
  supplier:           '',
  matrix:             '',
  sample_type:        null,
  batch_id:           '',
  storage_temp:       null,
  comment:            '',
  sample_taken_time:  '',
  selected:           false,
});
const formData = reactive(initialFormData());

/******************** Validation rules *****************************/
const rules = {
  supplier:          [{ required: true, message: 'Påkrevd', trigger: 'blur' }],
  matrix:            [{ required: true, message: 'Påkrevd', trigger: 'blur' }],
  sample_type:       [{ required: true, message: 'Påkrevd', trigger: 'change' }],
  sample_taken_time: [{ required: true, message: 'Påkrevd', trigger: 'change' }],
};

/******************** Lifecycle ***********************************/
onMounted(async () => {
  const res = await lab_getSampleTypes();
  if (res?.success) sampleTypes.value = res.data;
});

/******************** Submit & reset *******************************/
async function submitForm() {
  if (!sampleForm.value) return false;
  error.value = null;
  success.value = null;

  try {
    const valid = await sampleForm.value.validate();
    if (!valid) return false;

    isLoading.value = true;
    const response = await lab_createSample({ ...formData });

    if (response?.success) {
      if (props.dialogMode) {
        ElMessage.success(response.message || 'Prøve lagt til!');
      } else {
        success.value = response.message || 'Prøve lagt til!';
        resetForm();
      }
      emit('sample-added', response.data);
      return true;
    }
    throw new Error(response?.message || 'Kunne ikke legge til prøve.');
  } catch (e) {
    error.value = e.message || 'En uventet feil oppstod';
    if (props.dialogMode) ElMessage.error(error.value);
    return false;
  } finally {
    isLoading.value = false;
  }
}

function resetForm() {
  if (sampleForm.value) {
    sampleForm.value.resetFields();
    sampleForm.value.clearValidate();
  }
  Object.assign(formData, initialFormData());
  error.value = null;
  success.value = null;
}

/******************** Expose to parent *****************************/
defineExpose({ submitForm, resetForm });
</script>

<style scoped>
.add-sample-container { max-width: 600px; margin: 2rem auto; padding: 0 1rem; }
.dialog-mode { margin: 0; padding: 0; max-width: 100%; }
.add-sample-card { border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }
.card-header { display: flex; align-items: center; }
.card-header h2 { margin: 0; font-size: 1.5rem; display: flex; align-items: center; gap: 8px; }
.form-actions { display: flex; gap: 12px; margin-top: 1.5rem; }
.mb-4 { margin-bottom: 1rem; }
:deep(.el-input__wrapper), :deep(.el-select), :deep(.el-date-editor.el-input) { border-radius: 4px; }
:deep(.el-alert) { margin: 16px 0; }
</style>
