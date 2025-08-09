<template>
  <ButtonBase @hover-change="updateHoverStatus">
    <img src="/public/logo.png" alt="Logo" class="banner-logo" />
  </ButtonBase>
</template>

<script>
import ButtonBase from './base/ButtonBase.vue'

export default {
  name: 'HomeButton',
  components: {
    ButtonBase,
  },
  data() {
    return {
      isHovered: false,
    }
  },
  methods: {
    updateHoverStatus(status) {
      this.isHovered = status
    },
  },
}
</script>

<style scoped>
.banner-logo {
  width: 138px;
  height: 69px;
}
</style>
