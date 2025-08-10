<template>
  <div
    class="container"
    @mouseover="handleMouseOver"
    @mouseleave="handleMouseLeave"
    @click="handleClick"
    :class="{ 'hover-class': hover }"
  >
    <slot></slot>
    <span :class="{ text: true, 'text-disabled': isTextDisabled }">
      {{ buttonText }}
    </span>
  </div>
</template>

<script>
import { ref, computed } from 'vue'

export default {
  name: 'ButtonBase',
  props: {
    buttonText: {
      type: String,
      default: '',
    },
    navigateURL: {
      type: String,
      default: '',
    },
    newTab: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { emit }) {
    const hover = ref(false)

    const handleMouseOver = () => {
      hover.value = true
      emit('hover-change', true)
    }

    const handleMouseLeave = () => {
      hover.value = false
      emit('hover-change', false)
    }

    const handleClick = () => {
      if (props.navigateURL) {
        if (props.newTab) {
          window.open(props.navigateURL, '_blank')
        } else {
          window.location.href = props.navigateURL
        }
      }
    }

    const isTextDisabled = computed(() => props.buttonText === '')

    return {
      hover,
      handleMouseOver,
      handleMouseLeave,
      handleClick,
      isTextDisabled,
    }
  },
}
</script>

<style scoped>
.container {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 5px;
  transition:
    background-color 0.3s ease-in-out,
    transform 0.3s ease-in-out;
  border-radius: 5px;

  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

svg {
  fill: black;
  transition: all 0.3s ease-in-out;
}

svg.hovered {
  border-radius: 5px;
}

.text {
  font-size: 20px;
  margin-left: 5px;
  margin-right: 5px;
  color: black;
  transition: background-color 0.3s ease-in-out;
  white-space: nowrap;
}

.container:hover {
  background-color: rgba(128, 128, 128, 0.4);
  border-radius: 5px;
}

.line {
  transition: all 0.3s ease-in-out;
}

.text-disabled {
  display: none;
}
</style>
