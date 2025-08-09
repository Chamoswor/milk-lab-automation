<template>
  <ButtonBase @hover-change="updateHoverStatus">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 25 25"
      width="20"
      height="20"
      :class="{ 'scale-on-hover': isHovered }"
    >
      <g>
        <path
          d="M23.707,22.293l-5.969-5.969a10.016,10.016,0,1,0-1.414,1.414l5.969,5.969a1,1,0,0,0,1.414-1.414ZM10,18a8,8,0,1,1,8-8A8.009,8.009,0,0,1,10,18Z"
        />
      </g>
    </svg>
  </ButtonBase>
</template>

<script>
import ButtonBase from './base/ButtonBase.vue'

export default {
  name: 'SearchButton',
  props: {
    scaleSize: {
      type: Number,
      default: 1.1,
    },
  },
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
.scale-on-hover {
  transition: transform 0.3s ease-in-out;
  transform: scale(1.1);
}

svg {
  transition: transform 0.3s ease-in-out;
  transform: scale(1);
}
</style>
