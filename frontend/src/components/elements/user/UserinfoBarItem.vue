<template>
  <ButtonBase @hover-change="updateHoverStatus">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      :viewBox="`0 0 ${dynamicWidth} 50`"
      :width="dynamicWidth"
      height="50"
    >
      <!-- Viktig: bruk ref="textRef" på tekst-elementet -->
      <text
        ref="textRef"
        x="10"
        y="30"
        font-family="Arial, sans-serif"
        font-size="18"
        fill="black"
      >
        <tspan style="font-weight: bold;">
          Logget inn som:
        </tspan>
        <tspan style="font-weight: normal;">
          {{ ' ' + username }}
        </tspan>
      </text>
    </svg>
  </ButtonBase>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import ButtonBase from '../base/ButtonBase.vue'
import { useAuthStore } from '../../../stores/authStore'

const authStore = useAuthStore()
const username = computed(() => authStore.username)

const isHovered = ref(false)
function updateHoverStatus(status) {
  isHovered.value = status
}

// Refs for å hente elementer direkte fra DOM (tekstelementet)
const textRef = ref(null)

// Reaktiv variabel for SVG-bredden
const dynamicWidth = ref(200)

/**
 * Måler teksten via getBBox() og justerer SVG-bredden basert på tekstens faktiske størrelse.
 */
function recalcSVGSize() {
  if (textRef.value) {
    const bbox = textRef.value.getBBox()
    // Legg på litt margin (f.eks. 20 px)
    dynamicWidth.value = bbox.width + 20
  }
}

// Mål når komponenten er klar
onMounted(() => {
  recalcSVGSize()
})

// Mål på nytt hvis brukernavnet endres
watch(username, () => {
  recalcSVGSize()
})
</script>