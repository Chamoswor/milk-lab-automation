<template>
  <div id="app">
    <header>
      <TopMenu />
    </header>

    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { onMounted, watch } from 'vue'
import { useAuthStore } from './stores/authStore'
import { RouterView } from 'vue-router'
import { GetBasicUserData, GetRole } from './middleware/backend.js'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import router from './router'
import TopMenu from './components/TopMenu.vue'


const authStore = useAuthStore()
let cachedUser = null;
let cacheTimestamp = null;
const cacheDuration = 5 * 60 * 1000;

const userLocations = ['/dashboard'] // Sider som krever innlogging
const publicLocations = ['/login'] // Offentlige sider som ikke skal være tilgjengelige for innloggede brukere
const adminLocations = ['/admin'] // Sider som krever admin-tilgang

async function checkUser() {
  const now = Date.now();

  // Sjekk om vi har et cachet resultat som ikke har utløpt
  if (cachedUser && cacheTimestamp && (now - cacheTimestamp) < cacheDuration) {
    authStore.setLoggedIn(true);
    authStore.setUsername(cachedUser.username);
    return cachedUser;
  }

  try {
    cachedUser = await GetBasicUserData();
    cacheTimestamp = now;
    authStore.setLoggedIn(true);
    authStore.setUsername(cachedUser.username);
    return cachedUser;
  } catch (error) {
    cachedUser = null;
    cacheTimestamp = null;
    authStore.setLoggedIn(false);
    authStore.setUsername('');
    throw error;
  }
}

let role = "undefined";
let logUserError = true;
async function fetchRole() {
  try {
    role = await GetRole();
  } catch (error) {
    role = null;
    logUserError = false;
  }
}

watch(
  [() => role],
  async ([role]) => {
    if (role === "undefined") {
      return;
    }
    if (role !== 'admin') {
      if (adminLocations.includes(router.currentRoute.value.path)) {
        router.push('/');
      }
    }
  },
  { immediate: true }
)

watch(
  [() => router.currentRoute.value.path],
  async ([path]) => {
    try {
      logUserError = true;
      await checkUser();
    } catch (error) {
      ;
    }

    const updatedIsLoggedIn = authStore.isLoggedIn;

    if (updatedIsLoggedIn) {
      if (publicLocations.includes(path)) {
        router.push('/');
      }
    } else {
      if (userLocations.includes(path)) {
        router.push('/login');
      }
    }
  },
  { immediate: true }
);

onMounted(() => {
  fetchRole();
});

</script>

<style scoped>
#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

header {
  width: 100%;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000;
  background-color: var(--color-background, #222);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  height: 100px;
}

main.content {
  flex: 1;
  width: 100%;
  margin: 170px auto 0;
  padding: 1rem;
  box-sizing: border-box;
}

/* Responsiv styling */
@media (min-width: 1024px) {
  header {
    display: flex;
    align-items: center;
    padding: 0 1rem;
    box-sizing: border-box;
  }
}
</style>
