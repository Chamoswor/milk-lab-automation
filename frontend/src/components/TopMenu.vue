<template>
  <HeaderBarItem>
    <template #left>
      <HomeButton navigateURL="/" />
      <MenuButton buttonText="Meny" navigateURL="/" />
      <SearchButton buttonText="Søk" navigateURL="/" class="search-button" />
    </template>
    <template #center>
      <div></div>
    </template>
    <template #right>
      <div ref="containerRef" class="user-info-container">
        <div v-if="userButtonState === null"></div>
        <UserinfoBarItem
          v-else-if="userButtonState === 'user'"
          @click="handleUserInfoButtonClick"
        />
        <LoginButton
          v-else-if="'notLoggedIn'"
          buttonText="Logg inn"
          navigateURL="/login"
        />
        <div
          v-if="showDropDownMenu"
          class="drop_down"
        >
          <DropDownMenu />
        </div>
      </div>
    </template>
  </HeaderBarItem>
</template>

<script setup>
import HeaderBarItem from './HeaderBarItem.vue'
import MenuButton from './elements/MenuButton.vue'
import LoginButton from './elements/LoginButton.vue'
import HomeButton from './elements/HomeButton.vue'
import SearchButton from './elements/SearchButton.vue'
import UserinfoBarItem from './elements/user/UserinfoBarItem.vue'
import DropDownMenu from './elements/user/DropDownMenu.vue'

import { watch, ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useAuthStore } from '../stores/authStore'

const authStore = useAuthStore()
const isLoggedIn = computed(() => authStore.isLoggedIn)
const userButtonState = ref(null)

const showDropDownMenu = ref(false)
const containerRef = ref(null)

const clickCount = ref(0)

const handleUserInfoButtonClick = () => {
  showDropDownMenu.value = !showDropDownMenu.value
}

function handleClickOutside(event) {
  // hvis menyen allerede er lukket, trenger vi ikke gjøre noe
  if (!showDropDownMenu.value) return

  // sjekk om klikket er utenfor containeren
  if (
    containerRef.value &&
    !containerRef.value.contains(event.target)
  ) {
    showDropDownMenu.value = false
    clickCount.value = 0
  } else {
    clickCount.value++
  }

  if (clickCount.value > 1) {
    showDropDownMenu.value = false
    clickCount.value = 0
  }
}

watch(isLoggedIn, () => {

  userButtonState.value = isLoggedIn.value ? 'user' : 'notLoggedIn'
})

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.search-button {
  margin-left: 2rem;
}

.user-info-container {
  position: relative;
  display: inline-block;
}

.drop_down {
  position: absolute;
  top: 100%;
  right: 0;
  left: 0%;
  z-index: 999;
}
</style>