<template>
  <el-container style="min-height:100%; width: 100%; margin-top: -100px;">
    <!-- Sidebar med meny for navigasjon -->
    <el-aside width="240px" class="sidebar">
      <el-menu
        :default-active="activeMenu"
        class="el-menu-vertical-demo"
        @select="handleMenuSelect">
        <el-menu-item index="dashboard">
          <el-icon><platform /></el-icon>
          <span slot="title">Dashboard</span>
        </el-menu-item>
        <el-menu-item index="users">
          <el-icon><user /></el-icon>
          <span slot="title">Brukere</span>
        </el-menu-item>
        <el-menu-item index="database">
          <el-icon><document /></el-icon>
          <span slot="title">Database</span>
        </el-menu-item>
        <el-menu-item index="settings">
          <el-icon><setting /></el-icon>
          <span slot="title">Innstillinger</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- Wrapper for hovedområde, skyver innhold til høyre for sidebaren -->
    <el-container class="main-container">
      <el-main class="main-content">
        <component 
          :is="currentView"
          @change-view="changeView"
        ></component>
      </el-main>

    </el-container>
  </el-container>
</template>


<script setup>
import { ref, computed, provide } from 'vue'
// Importer AddUserView-komponenten for "Legg til bruker"-visningen
import AddUserView from '@/views/admin/AddUserView.vue'
import HomeView from '../admin/HomeView.vue'
import UserListView from '../admin/UserListView.vue'
import DBView from '../admin/tools/DBView.vue'

// Reaktiv variabel for valgt meny. Standardvisning er "dashboard".
const activeMenu = ref('dashboard')

// Bestemmer hvilken komponent som skal vises i hovedområdet basert på aktivt menyvalg
const currentView = computed(() => {
  switch (activeMenu.value) {
    case 'dashboard':
      return HomeView
    case 'users':
      return UserListView
    case 'addUser':
      return AddUserView
    case 'database':
      return DBView
    case 'settings':
      // Enkel placeholder for innstillingsvisningen
      return {
        template: `
          <div class="settings-view">
            <h3>Innstillinger</h3>
            <p>Her kan du konfigurere systeminnstillinger.</p>
          </div>
        `
      }
    default:
      return HomeView
  }
})

// Håndterer menyvalg
function handleMenuSelect(index) {
  activeMenu.value = index
}

// Håndterer endring av visning fra underkomponenter
function changeView(view) {
  activeMenu.value = view
}

provide('changeView', changeView)

</script>

<style scoped>

.el-container {
  width: 100%;
}

/* Generell styling */
.sidebar {
  position: fixed; /* Fikser sidebaren til venstre */
  left: 0;
  top: 100px;
  height: 100vh; 
  overflow: hidden; 
  z-index: 1000;    /* sørg for at sidebaren ligger over innholdet */
}

.main-container {
  position: absolute; /* gjør at innholdet kan flyttes */
  width: calc(100% - 240px);        /* resten av bredden */
  display: flex;
  flex-direction: column;
  /* sentrer innholdet horisontalt i denne beholderen */
  align-items: center;          /* Fyll hele høyden */
  left: 240px;
}

.el-menu-vertical-demo {
  height: 100%;              /* Fyll hele sidebar-høyden */
  display: flex;             /* Gjør menyen til flex-container */
  flex-direction: column;    /* Stable menyitems vertikalt */
  justify-content: flex-start; /* Plasser items øverst */
  background-color: #001529;
  border-right: none;


}  

.el-menu-item:hover span[slot="title"] {
    color: black;
}

.el-menu-vertical-demo .el-menu {
  flex: 1;            /* Lar menyen strekke seg */
  overflow-y: auto;   /* Scroll ved behov */
}

.el-menu-item {
  color: #fff;
}

.main-content {
  width: 100%;
  max-width: 90%;
  padding: 20px;
  box-sizing: border-box;
  background-color: #fff;
}

.header {
  background-color: #ffffff;
}

.footer {
  text-align: center;
  background-color: #f5f7fa;
  color: #999;
}

/* Styling for dashboard-visningen */
.dashboard-grid {
  margin-top: 20px;
}
.dashboard-card {
  text-align: center;
  cursor: pointer;
  transition: transform 0.2s;
}
.dashboard-card:hover {
  transform: translateY(-5px);
}
.card-header {
  font-weight: bold;
  font-size: 18px;
  margin-bottom: 10px;
}
.card-body {
  font-size: 24px;
}

.settings-view {
  padding: 20px;
  background-color: #fff;
}


</style>
