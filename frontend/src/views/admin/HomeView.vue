<template>
    <div class="admin-home-dashboard">
        <h1>Admin Dashboard</h1>
        
        <div class="stats-overview">
            <div class="stat-card">
                <div class="stat-title">Brukere registrert</div>
                <div class="stat-value">{{ stats.totalUsers }}</div>

            </div>
            
            <div class="stat-card">
                <div class="stat-title">Aktive servere</div>
                <div class="stat-value">5/5</div>

            </div>
            
            <div class="stat-card">
                <div class="stat-title">Aktive oppgaver</div>
                <div class="stat-value">{{ stats.activeTasks }}</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-title">System Status</div>
                <div class="stat-value">{{ stats.systemStatus }}</div>
                <div class="stat-change">
                    <i class="fas fa-circle" :class="stats.systemStatus === 'Online' ? 'online' : 'offline'"></i>
                    {{ stats.uptime }} uptime
                </div>
            </div>
        </div>
        
        <div class="dashboard-row">
            <div class="recent-activity panel">
                <h2>Recent Activity</h2>
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
                <h2>Quick Actions</h2>
                <div v-if="!activeSubPanel" class="action-buttons">
                    <button class="action-button" @click="navigateTo('users')">
                        <i class="fas fa-users"></i>
                        Behandle Brukere
                    </button>
                    <button class="action-button" @click="showSubPanel('tasks')">
                        <i class="fas fa-project-diagram"></i>
                        Handlinger
                    </button>
                    <button class="action-button" @click="navigateTo('requests')">
                        <i class="fas fa-chart-bar"></i>
                        Administrer Forespørsler
                    </button>
                    <button class="action-button" @click="navigateTo('settings')">
                        <i class="fas fa-cog"></i>
                        System Innstillinger
                    </button>
                </div>

                <div v-if="activeSubPanel === 'tasks'" class="sub-panel tasks-sub-panel">
                    <button class="back-button" @click="goBackToMainActions">
                        <i class="fas fa-arrow-left"></i> Tilbake
                    </button>
                    <h3 class="sub-panel-title">Prøvetabell handlinger</h3>
                    <div class="action-buttons">
                        <button class="action-button" @click="actionSampleTable('create')">
                            <i class="fas fa-plus-circle"></i> Opprett ny tabell
                        </button>
                        <button class="action-button" @click="actionSampleTable('update')">
                            <i class="fas fa-sync-alt"></i> Oppdater tabell
                        </button>
                        <button class="action-button" @click="actionSampleTable('recreate')">
                            <i class="fas fa-tags"></i> Reopprett tabell
                        </button>
                    </div>
                </div>
            </div>
        </div>

        
        
        <div class="dashboard-row">
            <div class="alerts panel">
                <h2>Systemvarsel</h2>
                <div v-if="alerts.length === 0" class="no-alerts">
                    Ingen aktive varsler
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
import { ref, inject } from 'vue' // Importer ref
import { admin_createSampleTable, admin_updateSampleTable, admin_recreateSampleTable } from '@/middleware/backend'
import { ElMessage } from 'element-plus'
export default {
    name: 'AdminHomeView',
    setup() {
        const changeView = inject('changeView')
        const activeSubPanel = ref(null) // Tilstand for aktivt underpanel

        const navigateTo = (view) => {
            // Hvis et underpanel er aktivt, kan det være lurt å resette det
            // eller håndtere navigasjon annerledes basert på 'view'
            activeSubPanel.value = null; 
            changeView(view)
        }

        const showSubPanel = (panelName) => {
            activeSubPanel.value = panelName;
        }

        const goBackToMainActions = () => {
            activeSubPanel.value = null;
        }

        const actionSampleTable = async (action) => {
            try {
                let response = null;
                if (action === 'create') {
                    response = await admin_createSampleTable();
                } else if (action === 'update') {
                    response = await admin_updateSampleTable();
                } else if (action === 'recreate') {
                    response = await admin_recreateSampleTable();
                } else {
                    console.error('Unknown action:', action);
                    return;
                }

                if (response && response.success) {
                    ElMessage({
                        message: `Handling ${action} ble vellykket!`,
                        type: 'success',
                    });
                } else {
                    ElMessage({
                        message: `Handling ${action} mislyktes!`,
                        type: 'error',
                    });
                    console.error('Failed to perform action:', action);
                }
            } catch (error) {
                console.error('Error performing action on sample table:', error);
            }
        }
        
        return {
            navigateTo,
            activeSubPanel,
            showSubPanel,
            goBackToMainActions,
            actionSampleTable,
        }
    },
    data() {
        return {
            stats: {
                totalUsers: 2,
                newUsers: 2,
                activeProjects: 34,
                newProjects: 5,
                activeTasks: 0,
                taskDecrease: 12,
                systemStatus: 'Online',
                uptime: '99.8%'
            },
            recentActivity: [
                {
                    id: 1,
                    type: 'user',
                    title: 'Ny labratorium bruker',
                    description: 'Bruker "Ola Nordmann" ble lagt til i systemet',
                    time: '2 minutes ago'
                },
                {
                    id: 2,
                    type: 'project',
                    title: 'Prosjekt opprettet',
                    description: 'Nytt prosjekt "Hovedprosjekt" ble opprettet',
                    time: '1 time siden'
                },
                {
                    id: 3,
                    type: 'system',
                    title: 'System Oppdatering',
                    description: 'Mysql-server ble oppdatert til versjon 8.0.42',
                    time: '2 dager siden'
                },
                {
                    id: 4,
                    type: 'task',
                    title: 'Oppgave fullført',
                    description: 'Oppgave "Fornying av SSL sertifikat" ble fullført',
                    time: '7 dager siden'
                }
            ],
            alerts: [
                {
                    id: 1,
                    severity: 'warning',
                    title: 'API',
                    message: 'API-kall har høyere responstid enn normalt',
                    time: 'I dag, 10:30'
                }
            ]
        }
    },
    methods: {

        getActivityIcon(type) {
            const icons = {
                user: 'fas fa-user',
                project: 'fas fa-project-diagram',
                task: 'fas fa-tasks',
                system: 'fas fa-server'
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
        }
    }
}
</script>

<style scoped>
.admin-home-dashboard {
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

.stat-change .fa-arrow-down {
    color: #f44336;
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

.activity-list, .alert-list {
    list-style: none;
    padding: 0;
}

.activity-item, .alert-item {
    display: flex;
    padding: 12px 0;
    border-bottom: 1px solid #eee;
}

.activity-item:last-child, .alert-item:last-child {
    border-bottom: none;
}

.activity-icon, .alert-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: #f4f4f4;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 16px;
}

.activity-icon.user {
    background-color: #e3f2fd;
    color: #1976d2;
}

.activity-icon.project {
    background-color: #e8f5e9;
    color: #388e3c;
}

.activity-icon.task {
    background-color: #fff8e1;
    color: #ffa000;
}

.activity-icon.system {
    background-color: #f3e5f5;
    color: #7b1fa2;
}

.activity-content, .alert-content {
    flex: 1;
}

.activity-title, .alert-title {
    font-weight: bold;
    margin-bottom: 4px;
}

.activity-description, .alert-message {
    font-size: 14px;
    color: #666;
    margin-bottom: 4px;
}

.activity-time, .alert-time {
    font-size: 12px;
    color: #999;
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

.no-alerts {
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

.quick-actions .panel {
    position: relative; /* For posisjonering av tilbakeknapp om nødvendig */
}

.sub-panel-title {
    font-size: 1.1em;
    color: #555;
    margin-bottom: 15px;
    text-align: center;
    padding-top: 10px; /* Litt plass over tittelen hvis tilbakeknappen er absolutt */
}

.back-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    margin-bottom: 15px; /* Plass mellom tilbakeknapp og tittel/knapper */
    background-color: #6c757d; /* En nøytral farge */
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9em;
    transition: background-color 0.2s;
}

.back-button i {
    font-size: 0.9em;
}

.back-button:hover {
    background-color: #5a6268;
}
</style>