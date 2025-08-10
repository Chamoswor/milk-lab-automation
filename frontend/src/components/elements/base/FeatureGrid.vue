<template>
  <section class="features">
    <div class="feature-grid">
      <div
        v-for="(card, index) in cards"
        :key="index"
        class="feature-card"
        @click="onCardClick(card, index)"
      >
        <h3>{{ card.title }}</h3>
        <p>{{ card.content }}</p>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: 'FeatureGrid',
  props: {
    cards: {
      type: Array,
      default: () => []
    }
  },
  methods: {
    onCardClick(card, index) {
      // Sender en custom event med informasjon om det trykte kortet
      this.$emit('card-clicked', { card, index, id: card.id });
    }
  }
}
</script>

<style scoped>
.features {
  padding: 4rem 2rem;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.feature-card {
  padding: 2rem;
  background-color: var(--color-background, #d4d4d4);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
  cursor: pointer; /* Legg til for å vise at kortet er klikkbart */
}

.feature-card:hover {
  transform: translateY(-5px);
}

.feature-card h3 {
  margin-bottom: 1rem;
  font-size: 1.5rem;
}
</style>
