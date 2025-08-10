<template>
  <div class="lab-scanner-container">
    <!-- HEADER ---------------------------------------------------- -->
    <div class="header-section">
      <div class="location-info">TRONDHEIM 3</div>
      <div class="status-info">Skinner er programmert</div>
    </div>

    <!-- TABS ------------------------------------------------------- -->
    <div class="tab-section">
      <el-tabs v-model="activeTab" class="demo-tabs">
        <el-tab-pane label="Scan" name="scan" />
        <el-tab-pane label="RFID programmering" name="rtid" />
      </el-tabs>
    </div>

    <!-- RACKS & SLOTS --------------------------------------------- -->
    <div class="samples-container">
      <div v-for="rack in racks" :key="rack.id" class="samples-row">
        <div
          v-for="slot in rack.slots"
          :key="slot.position"
          class="sample-card"
          :class="{ 'sample-empty': !slot.sample }"
        >
          <!-- POPOVER for detaljer -->
          <el-popover
            v-if="slot.sample"
            placement="top"
            width="350"
            trigger="hover"
            :content="''"
          >
            <template #reference>
              <div class="card-inner">
                <!-- Sample type -->
                <el-tag size="small" class="lev-tag">
                  {{ slot.sample.type?.name }}
                </el-tag>

                <!-- Supplier -->
                <div class="sample-id">{{ slot.sample.supplier }}</div>

                <!-- Taken time + remaining -->
                <div class="sample-date">
                  {{ formatDate(slot.sample.sample_taken_time) }}
                </div>

                <!-- Matrix -->
                <div class="sample-dimensions">{{ formatMatrix(slot.sample.matrix) }}</div>

                <!-- RFID -->
                <div class="sample-temp">RFID: {{ rack.rfid }}</div>

                <!-- Graf / placeholder (statisk) -->
                <div class="sample-graph"><div class="graph-placeholder" /></div>

                <!-- Pos nummer -->
                <div class="sample-number">{{ slot.position }}</div>

                <!-- Age bar -->
                <div
                  class="age-bar"
                  :style="{
                    width: agePercent(slot.sample) + '%',
                    background: ageColor(slot.sample)
                  }"
                />

                <!-- Temperatur-tag -->
                <el-tag
                  v-if="slot.sample.storage_temp != null"
                  :type="tempType(slot.sample.storage_temp)"
                  size="small"
                  class="temp-pill"
                >
                  {{ slot.sample.storage_temp }}°C
                </el-tag>
              </div>
            </template>

            <!-- Popover-innhold -->
            <p><b>Batch‑ID:</b> {{ slot.sample.batch_id || '–' }}</p>
            <p><b>Lager:</b> {{ slot.sample.storage_temp }} °C</p>
            <p><b>Kommentar:</b> {{ slot.sample.comment || '–' }}</p>
            <p><b>Matrise:</b> {{ slot.sample.matrix || '–' }}</p>
          </el-popover>

          <!-- Tomt kort -->
          <template v-else>
            <div class="empty-slot">Tom</div>
            <div class="sample-number">{{ slot.position }}</div>
          </template>
        </div>
      </div>
    </div>

    <!-- FILTER & ACTIONS ------------------------------------------ -->
    <div class="controls-section">
      <div class="button-container">
        <div class="filter-buttons">
          <div class="primary-filters">
            <el-button size="small" class="filter-btn primary-filter-btn">
              <el-icon><CaretRight /></el-icon> Kryssa prøve
            </el-button>
            <el-button size="small" class="filter-btn primary-filter-btn">
              <el-icon><CaretRight /></el-icon> Dårlig etikett
            </el-button>
          </div>
          <div class="secondary-filters">
            <el-button-group>
              <el-button size="small" class="filter-btn">Bc Cereus</el-button>
              <el-button size="small" class="filter-btn">Anaerobe</el-button>
              <el-button size="small" class="filter-btn">Begge</el-button>
              <el-button size="small" class="filter-btn">Ingen</el-button>
            </el-button-group>
          </div>
          <div class="temperature-filters">
            <el-button-group>
              <el-button size="small" class="temp-btn cold">-0°C</el-button>
              <el-button size="small" class="temp-btn normal">0-5°C</el-button>
              <el-button size="small" class="temp-btn warm">>5°C</el-button>
            </el-button-group>
          </div>
        </div>
      </div>
    </div>
    <!-- Scan / dato -->
    <div class="action-section">
      <div>
        <el-button type="primary" class="scan-btn" @click="startSorting">
          <el-icon><VideoPlay /></el-icon> Start sortering
        </el-button>
        <el-button type="danger" class="stop-btn" @click="stopSorting">
          <el-icon><CircleCloseFilled /></el-icon> Stopp sortering
        </el-button>
        <el-button type="warning" class="reset-btn" @click="resetDemo">
          <el-icon><Refresh /></el-icon> Resett demo
        </el-button>
      </div>

      <div class="date-selector">
        <span class="date-label">Måledato:</span>
        <el-date-picker
          v-model="measurementDate"
          type="date"
          placeholder="Velg dato"
          format="DD.MM.YYYY"
          size="small"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { CaretRight, VideoPlay } from '@element-plus/icons-vue'

const activeTab = ref('scan')
const measurementDate = ref('24.01.2025')
const racks = ref([])
const HRS_24 = 24 * 60 * 60 * 1000
let pollingInterval = null // for å lagre interval-ID

function log(...args) {
  console.log('[LabScanner]', ...args)
}

async function fetchRacks() {
  try {
    const res = await fetch('/api/lab/racks?withSlots=true')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    // Mapper slots til faste posisjoner 1–10
    racks.value = data.map(rack => {
      const slots = Array.from({ length: 10 }, (_, i) => {
        const pos = i + 1

        return rack.slots.find(s => s.position === pos) || { position: pos, sample: null }
      })
      return { ...rack, slots }
    })
  } catch (err) {
    console.error('Klarte ikke hente racks:', err)
    racks.value = []
  }
}

async function startSorting() {
  try {
    const res = await fetch('/api/lab/sorting/start', { method: 'POST' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    log('Sorting started:', data)
  } catch (err) {
    console.error('Klarte ikke starte sortering:', err)
  }
}

async function stopSorting() {
  try {
    const res = await fetch('/api/lab/sorting/stop', { method: 'POST' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    log('Sorting stopped:', data)
  } catch (err) {
    console.error('Klarte ikke stoppe sortering:', err)
  }
}

async function resetDemo() {
  try {
    const res = await fetch('/api/lab/sorting/reset', { method: 'POST' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    log('Demo reset:', data)
    fetchRacks() // Hent racks på nytt etter reset
  } catch (err) {
    console.error('Klarte ikke resette demo:', err)
  }

}

onMounted(() => {
  log('Component mounted – henter racks')
  fetchRacks()

  // Sett opp polling hver 5 sekunder (5000 ms)
  pollingInterval = setInterval(() => {
    fetchRacks()
  }, 2000)
})

onBeforeUnmount(() => {
  // Husk å stoppe intervallet når komponenten fjernes
  if (pollingInterval) clearInterval(pollingInterval)
})

// format: 10t 32m
function formatDate(dt) {
  if (!dt) return ''
  const taken = new Date(dt)
  const dd = String(taken.getDate()).padStart(2, '0')
  const mm = String(taken.getMonth() + 1).padStart(2, '0')
  const yy = String(taken.getFullYear()).slice(-2)

  const expiry = new Date(taken.getTime() + HRS_24)
  let diff = expiry.getTime() - Date.now()
  if (diff < 0) diff = 0
  const hours = Math.floor(diff / 3_600_000)
  const minutes = Math.floor((diff % 3_600_000) / 60_000)

  const formatted = `${hours}t ${minutes}m`
  log('formatDate', dt, '=>', formatted)
  return formatted
}

function formatMatrix(matrix) {
  if (!matrix) return ''
  const formatted = matrix.length > 10 ? matrix.slice(0, 10) + '...' : matrix
  return formatted
}

function agePercent(sample) {
  if (!sample?.sample_taken_time) return 0
  const elapsed = Date.now() - new Date(sample.sample_taken_time).getTime()
  return Math.min(100, Math.max(0, (elapsed / HRS_24) * 100))
}

function getStatus(sample) {
  const p = agePercent(sample)
  const status = p >= 100 ? 'expired' : p >= 80 ? 'warn' : 'fresh'
  log('Status', { id: sample.id, percent: p.toFixed(1), status })
  return status
}

function ageColor(sample) {
  const s = getStatus(sample)
  if (s === 'expired') return '#dc3545'
  if (s === 'warn') return '#ffc107'
  return '#198754'
}

function tempType(t) {
  const type = t <= 5 ? 'success' : t <= 8 ? 'warning' : 'danger'
  log('Temp tag', t, '=>', type)
  return type
}
</script>
  
  <style scoped>
  .lab-scanner-container {
    background-color: #e6f1ff;
    margin-top: 10px;
    padding: 10px;
    max-height: 100vh;
    font-family: Arial, sans-serif;
  }
  
  .header-section {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  
  .location-info {
    font-weight: bold;
    font-size: 14px;
  }
  
  .status-info {
    font-size: 14px;
  }
  
  .tab-section {
    margin-bottom: 15px;
  }
  
  .samples-container {
    margin-bottom: 20px;
    width: 100%;
    overflow-x: auto; 
    padding: 0 10px;
  }
  
  .samples-row {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: 10px;
    width: 100%;
  }

  .stop-btn {
    margin-left: 10px;
    background-color: #dc3545;
    color: white;
    border: none;
    padding: 8px 15px;
  }
  
/****************** SAMPLE CARD *****************************/
.sample-card{position:relative;background:#b3d4fc;border-radius:4px;padding:8px;height:200px;width:120px;transition:transform .08s,box-shadow .08s;overflow:visible;text-align:center}
.sample-card:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,.12)}
.sample-empty{background:#f1f3f5;color:#6c757d;display:flex;align-items:center;justify-content:center;text-align:center}


/****************** INNHOLD *****************************/
.card-inner{height:100%;display:flex;flex-direction:column;align-items:center;text-align:center;width:100px}
.lev-tag{background:#1989fa;color:#fff;font-size:10px;padding:2px 4px;border-radius:2px;margin-bottom:4px;align-self:center}
.sample-id{font-weight:bold;font-size:1em;overflow:hidden;text-overflow:ellipsis}
.sample-date,.sample-dimensions{font-size:.8em;overflow:hidden;text-overflow:ellipsis}
.sample-temp{font-size:.75em;margin-top:2px}
.sample-graph{flex-grow:1;margin:4px 0;width:100%}
.graph-placeholder{height:100%;border-radius:2px;background:#e9ecef}

.sample-number{position:absolute;bottom:5px;left:0;right:0;text-align:center;background:#6c757d;color:#fff;font-size:12px;padding:2px 0}
.age-bar{position:absolute;bottom:0;left:0;height:4px;border-radius:0 0 4px 4px;pointer-events:none}
.temp-pill{position:absolute;top:6px;right:6px}
  
  @media (max-width: 1200px) {
    .sample-card {
      font-size: 0.7rem;
    }
  }
  
  @media (max-width: 992px) {
    .samples-row {
      grid-template-columns: repeat(5, 1fr);
    }
  }
  
  @media (max-width: 576px) {
    .samples-row {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  
  .sample-header {
    margin-bottom: 5px;
  }
  
  .lev-tag {
    background-color: #1989fa;
    color: white;
    font-size: 10px;
    padding: 2px 4px;
    border-radius: 2px;
  }
  
  .sample-id {
    font-weight: bold;
    font-size: 1em;
    margin-bottom: 5px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .sample-date, .sample-dimensions {
    font-size: 0.85em;
    color: #333;
    margin-bottom: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .sample-temp {
    font-size: 0.8em;
    margin-bottom: 10px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .sample-graph {
    flex-grow: 1;
    background-color: #ffffff;
    border-radius: 2px;
    margin-bottom: 5px;
  }
  
  .graph-placeholder {
    height: 100%;
    border-radius: 2px;
    position: relative;
    overflow: hidden;
    background: linear-gradient(90deg, #e8f0ff 25%, #f5faff 50%, #e8f0ff 75%);
    background-size: 200% 100%;
  }

  
  .sample-number {
    position: absolute;
    bottom: 5px;
    left: 0;
    right: 0;
    text-align: center;
    background-color: #6c757d;
    color: white;
    font-size: 12px;
    padding: 2px 0;
  }
  
  .controls-section {
    display: flex;
    justify-content: space-between;
    margin-bottom: 15px;
  }
  
    .filter-buttons {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 20px;
        width: 100%;
    }
    .button-container {
        height: 110%;
        background-color: #b3d4fc;
        border-radius: 4px;
        padding: 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        border: 1px solid #d9d9d9;
        border-radius: 4px;
        width: 100%;
    }
  .primary-filters {
    display: flex;
    gap: 5px;
  }
  
  .secondary-filters {
    margin-right: 5px;
  }
  
  .filter-btn {
    font-size: 12px;
    padding: 5px 10px;
    height: auto;
    white-space: nowrap;
    min-width: fit-content;
    height: 40px;
  }
  
  .primary-filter-btn {
    margin-right: 0;
  }
  
  .temperature-filters {
    margin-right: 0;
  }
  
  .temp-btn {
    font-size: 12px;
    padding: 5px 10px;
    height: auto;
    white-space: nowrap;
    height: 40px;
  }
  
  .temp-btn.cold {
    background-color: #cfe2ff;
    color: #0d6efd;
  }
  
  .temp-btn.normal {
    background-color: #d1e7dd;
    color: #198754;
  }
  
  .temp-btn.warm {
    background-color: #f8d7da;
    color: #dc3545;
  }
  
  .action-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .scan-btn {
    font-size: 14px;
    background-color: #1989fa;
    color: white;
    border: none;
    padding: 8px 15px;
  }

  .reset-btn {
    font-size: 14px;
    background-color: #ffc107;
    color: white;
    border: none;
    padding: 8px 15px;
  }
  
  .date-selector {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .date-label {
    font-size: 12px;
  }
  
  :deep(.el-tabs__item) {
    font-size: 14px;
    padding: 0 10px;
  }
  
  :deep(.el-date-editor.el-input) {
    width: 120px;
  }

  .sample-empty {
  background-color: #f1f3f5;
  color: #6c757d;
  }

  .empty-slot {
    margin: auto;
    font-size: 0.9em;
  }
  </style>