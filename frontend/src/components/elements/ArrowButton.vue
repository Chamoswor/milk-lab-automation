<template>
  <ButtonBase @hover-change="updateHoverStatus">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 25 25"
      width="40"
      height="40"
      :class="{ 'scale-on-hover': isHovered }"
    >
      <g>
        <path
          d="M0,12A12,12,0,1,0,12,0,12.013,12.013,0,0,0,0,12Zm16,0a2.993,2.993,0,0,1-.752,1.987c-.291.327-.574.637-.777.84L11.647,17.7a1,1,0,1,1-1.426-1.4L13.05,13.42c.187-.188.441-.468.7-.759a1,1,0,0,0,0-1.323c-.258-.29-.512-.57-.693-.752L10.221,7.7a1,1,0,1,1,1.426-1.4l2.829,2.879c.2.2.48.507.769.833A2.99,2.99,0,0,1,16,12Z"
        />
      </g>
    </svg>
  </ButtonBase>
</template>

<script>
import ButtonBase from './base/ButtonBase.vue'

export default {
  name: 'ArrowButton',
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
