<template>
  <ButtonBase @hover-change="updateHoverStatus">
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="20" viewBox="0 0 100 85">
      <rect class="line top" width="100" height="15" :y="isHovered ? 0 : 5"></rect>
      <rect class="line middle" width="100" height="15" :y="isHovered ? 35 : 35"></rect>
      <rect class="line bottom" width="100" height="15" :y="isHovered ? 70 : 65"></rect>
    </svg>
  </ButtonBase>
</template>

<script>
import ButtonBase from './base/ButtonBase.vue'

export default {
  name: 'MenuButton',
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
