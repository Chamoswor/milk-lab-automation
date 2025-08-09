<template>
    <div class="lab-home-dashboard">
        <h1>Laboratorium Dashboard - Melkeanalyse</h1>
        
        <div class="stats-overview">
            <div class="stat-card">
                <div class="stat-title">Aktive prøver</div>
                <div class="stat-value">{{ stats.activeSamples }}</div>
                <div class="stat-change">
                    <i class="fas fa-arrow-up"></i>
                    {{ stats.newSamples }} nye i dag
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-title">Ventende analyser</div>
                <div class="stat-value">{{ stats.pendingAnalyses }}</div>
                <div class="stat-change">
                    <i class="fas fa-clock"></i>
                    {{ stats.urgentAnalyses }} haster
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-title">Gårder denne uken</div>
                <div class="stat-value">{{ stats.weeklyFarms }}</div>
                <div class="stat-change">
                    <i class="fas fa-cow"></i>
                    {{ stats.totalCows }} kyr totalt
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-title">Analyse Status</div>
                <div class="stat-value">{{ stats.systemStatus }}</div>
                <div class="stat-change">
                    <i class="fas fa-circle" :class="stats.systemStatus === 'Klar' ? 'online' : 'offline'"></i>
                    {{ stats.lastCalibration }}
                </div>
            </div>
        </div>
        
        <div class="dashboard-row">
            <div class="recent-activity panel">
                <h2>Nylige aktiviteter</h2>
                <ul class="activity-list">
                    <li v-for="activity in recentActivity" :key="activity.id" class="activity-item">
                        <div class="activity-icon" :class="activity.type">
                            <i :class="getActivityIcon(activity.type)"></i>
                        </div>
                        <div class="activity-content">
                            <div class="activity-title">{{ activity.title }}</div>
                            <div class="activity-description">{{ activity.description }}</div>
                            <div class="activity-time">{{ activity.time }}</div>
                        </div>
                    </li>
                </ul>
            </div>
            
            <div class="quick-actions panel">
                <h2>Hurtigvalg</h2>
                <div class="action-buttons">
                    <button class="action-button" @click="navigateTo('sample-registration')">
                        <i class="fas fa-flask"></i>
                        Registrer ny prøve
                    </button>
                    <button class="action-button" @click="navigateTo('results')">
                        <i class="fas fa-chart-bar"></i>
                        Registrer analyseresultat
                    </button>
                    <button class="action-button" @click="navigateTo('reports')">
                        <i class="fas fa-file-alt"></i>
                        Gårdsrapporter
                    </button>
                    <button class="action-button" @click="navigateTo('equipment')">
                        <i class="fas fa-microscope"></i>
                        Utstyrskalibrering
                    </button>
                </div>
            </div>
        </div>
        
        <div class="dashboard-row">
            <div class="pending-samples panel">
                <h2>Ventende melkeprøver</h2>
                <div v-if="pendingSamples.length === 0" class="no-items">
                    Ingen ventende prøver
                </div>
                <ul v-else class="sample-list">
                    <li v-for="sample in pendingSamples" :key="sample.id" class="sample-item" :class="sample.priority">
                        <div class="sample-icon">
                            <i :class="getPriorityIcon(sample.priority)"></i>
                        </div>
                        <div class="sample-content">
                            <div class="sample-id">ID: {{ sample.id }}</div>
                            <div class="sample-title">{{ sample.farm }} - {{ sample.cowId }}</div>
                            <div class="sample-info">Mottatt: {{ sample.received }} | Frist: {{ sample.deadline }}</div>
                        </div>
                        <div class="sample-actions">
                            <button class="btn-process" @click="processSample(sample.id)">Analyser</button>
                        </div>
                    </li>
                </ul>
            </div>
            
            <div class="alerts panel">
                <h2>Meldinger</h2>
                <div v-if="alerts.length === 0" class="no-alerts">
                    Ingen aktive meldinger
                </div>
                <ul v-else class="alert-list">
                    <li v-for="alert in alerts" :key="alert.id" class="alert-item" :class="alert.severity">
                        <div class="alert-icon">
                            <i :class="getAlertIcon(alert.severity)"></i>
                        </div>
                        <div class="alert-content">
                            <div class="alert-title">{{ alert.title }}</div>
                            <div class="alert-message">{{ alert.message }}</div>
                            <div class="alert-time">{{ alert.time }}</div>
                        </div>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>

<script>
import { inject } from 'vue'

export default {
    name: 'LabHomeView',
    setup() {
        const changeView = inject('changeView')
        
        const navigateTo = (view) => {
            changeView(view)
        }
        
        const processSample = (sampleId) => {
            // Implementer logikk for å starte analyse av en prøve
            console.log(`Starter analyse av prøve med ID: ${sampleId}`)
            // Naviger til analysesiden
            navigateTo('sample-analysis')
        }
        
        return {
            navigateTo,
            processSample
        }
    },
    data() {
        return {
            stats: {
                activeSamples: 42,
                newSamples: 14,
                pendingAnalyses: 18,
                urgentAnalyses: 5,
                weeklyFarms: 12,
                totalCows: 236,
                systemStatus: 'Klar',
                lastCalibration: 'Kalibrert i dag'
            },
            recentActivity: [
                {
                    id: 1,
                    type: 'sample',
                    title: 'Nye prøver mottatt',
                    description: '12 prøver fra Solbakken Gård registrert',
                    time: '30 minutter siden'
                },
                {
                    id: 2,
                    type: 'result',
                    title: 'Analyseresultater ferdig',
                    description: 'Resultater for Nordli Gård (8 prøver) er klare',
                    time: '2 timer siden'
                },
                {
                    id: 3,
                    type: 'equipment',
                    title: 'Kalibrering utført',
                    description: 'Fettanalysator kalibrert med kontrollprøver',
                    time: '4 timer siden'
                },
                {
                    id: 4,
                    type: 'report',
                    title: 'Månedsrapport generert',
                    description: 'April-rapport for Fjellgård er klar for gjennomgang',
                    time: '1 dag siden'
                }
            ],
            pendingSamples: [
                {
                    id: 'MP-2025-0412',
                    farm: 'Fjellgård',
                    cowId: 'KU-278',
                    received: '04.05.2025 09:15',
                    deadline: '05.05.2025 12:00',
                    priority: 'high',
                    type: 'Mastitt-kontroll'
                },
                {
                    id: 'MP-2025-0413',
                    farm: 'Solbakken',
                    cowId: 'KU-103',
                    received: '04.05.2025 10:30',
                    deadline: '06.05.2025 12:00',
                    priority: 'medium',
                    type: 'Rutinekontroll'
                },
                {
                    id: 'MP-2025-0407',
                    farm: 'Nordli',
                    cowId: 'KU-056',
                    received: '03.05.2025 16:45',
                    deadline: '05.05.2025 16:00',
                    priority: 'low',
                    type: 'Kvalitetsanalyse'
                }
            ],
            alerts: [
                {
                    id: 1,
                    severity: 'warning',
                    title: 'Celletallanalyse',
                    message: 'Uvanlig høye celletall registrert i to prøver fra Fjellgård',
                    time: 'I dag, 11:15'
                },
                {
                    id: 2,
                    severity: 'info',
                    title: 'Nye retningslinjer',
                    message: 'Oppdaterte prosedyrer for bakteriekultur er tilgjengelig',
                    time: 'I dag, 08:30'
                }
            ]
        }
    },
    methods: {
        getActivityIcon(type) {
            const icons = {
                sample: 'fas fa-flask',
                result: 'fas fa-chart-bar',
                equipment: 'fas fa-microscope',
                report: 'fas fa-file-alt',
                system: 'fas fa-cog'
            }
            return icons[type] || 'fas fa-info-circle'
        },
        getAlertIcon(severity) {
            const icons = {
                info: 'fas fa-info-circle',
                warning: 'fas fa-exclamation-triangle',
                error: 'fas fa-times-circle',
                success: 'fas fa-check-circle'
            }
            return icons[severity] || 'fas fa-info-circle'
        },
        getPriorityIcon(priority) {
            const icons = {
                high: 'fas fa-exclamation-circle',
                medium: 'fas fa-clock',
                low: 'fas fa-calendar-alt'
            }
            return icons[priority] || 'fas fa-circle'
        }
    }
}
</script>

<style scoped>
.lab-home-dashboard {
    padding: 20px;
    max-width: 1200px;
    margin: 0 auto;
}

h1 {
    margin-bottom: 24px;
    color: #333;
}

h2 {
    margin-bottom: 16px;
    color: #444;
    font-size: 18px;
}

.stats-overview {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin-bottom: 24px;
}

.stat-card {
    background-color: white;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.stat-title {
    font-size: 14px;
    color: #777;
    margin-bottom: 8px;
}

.stat-value {
    font-size: 28px;
    font-weight: bold;
    color: #333;
    margin-bottom: 8px;
}

.stat-change {
    font-size: 14px;
    color: #666;
}

.stat-change .fa-arrow-up {
    color: #4caf50;
}

.stat-change .fa-arrow-down, .stat-change .fa-exclamation-triangle {
    color: #f44336;
}

.stat-change .fa-clock {
    color: #ff9800;
}

.dashboard-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 20px;
    margin-bottom: 24px;
}

.panel {
    background-color: white;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.activity-list, .alert-list, .sample-list {
    list-style: none;
    padding: 0;
}

.activity-item, .alert-item, .sample-item {
    display: flex;
    padding: 12px 0;
    border-bottom: 1px solid #eee;
}

.activity-item:last-child, .alert-item:last-child, .sample-item:last-child {
    border-bottom: none;
}

.activity-icon, .alert-icon, .sample-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: #f4f4f4;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 16px;
}

/* Melkeprøve-spesifikke ikoner */
.activity-icon.sample {
    background-color: #e3f2fd;
    color: #1976d2;
}

.activity-icon.result {
    background-color: #e8f5e9;
    color: #388e3c;
}

.activity-icon.equipment {
    background-color: #f3e5f5;
    color: #7b1fa2;
}

.activity-icon.report {
    background-color: #fff8e1;
    color: #ffa000;
}

.activity-content, .alert-content, .sample-content {
    flex: 1;
}

.activity-title, .alert-title, .sample-title {
    font-weight: bold;
    margin-bottom: 4px;
}

.activity-description, .alert-message, .sample-info {
    font-size: 14px;
    color: #666;
    margin-bottom: 4px;
}

.activity-time, .alert-time {
    font-size: 12px;
    color: #999;
}

.sample-id {
    font-size: 13px;
    color: #777;
    margin-bottom: 2px;
}

.action-buttons {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
}

.action-button {
    padding: 16px;
    border: none;
    border-radius: 8px;
    background-color: #f5f5f5;
    cursor: pointer;
    text-align: center;
    font-weight: bold;
    transition: background-color 0.2s;
}

.action-button i {
    display: block;
    font-size: 24px;
    margin-bottom: 8px;
}

.action-button:hover {
    background-color: #e0e0e0;
}

.alert-item.info {
    background-color: #e3f2fd;
}

.alert-item.warning {
    background-color: #fff3e0;
}

.alert-item.error {
    background-color: #ffebee;
}

.alert-item.success {
    background-color: #e8f5e9;
}

.no-alerts, .no-items {
    color: #999;
    text-align: center;
    padding: 20px;
}

.fa-circle.online {
    color: #4caf50;
}

.fa-circle.offline {
    color: #f44336;
}

/* Prioritetsfarger for prøver */
.sample-item.high {
    border-left: 4px solid #f44336;
}

.sample-item.medium {
    border-left: 4px solid #ff9800;
}

.sample-item.low {
    border-left: 4px solid #4caf50;
}

.sample-icon {
    align-self: center;
}

.sample-icon .fa-exclamation-circle {
    color: #f44336;
}

.sample-icon .fa-clock {
    color: #ff9800;
}

.sample-icon .fa-calendar-alt {
    color: #4caf50;
}

.sample-actions {
    display: flex;
    align-items: center;
}

.btn-process {
    padding: 6px 12px;
    background-color: #1976d2;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
}

.btn-process:hover {
    background-color: #1565c0;
}
</style>