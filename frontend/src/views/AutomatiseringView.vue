<script setup>
// Importer nødvendige moduler og data hvis aktuelt
import { ref } from 'vue'

// Eksempel på reactive data
const title = ref('Automatisering av Melkeprøver')
const description = ref(
  'Målet er å automatiserer prosessen med sortering og registrering av melkeprøver, for økt effektivitet og nøyaktighet.',
)
const features = ref([
  {
    title: 'RFID og QR-integrasjon',
    description: 'Registrering av prøver med nøyaktighet ved bruk av moderne skanningsteknologi.',
  },
  {
    title: 'Automatisk sortering',
    description:
      'Systemet sorterer og grupperer prøver basert på tilhørende data som identifisering av kyr og testtype.',
  },
  {
    title: 'Effektiv arbeidsflyt',
    description: 'Reduser manuelt arbeid og feil gjennom en helautomatisk prosess.',
  },
])
</script>

<template>
  <div class="automatisering-view">
    <header class="automatisering-header">
      <h1>{{ title }}</h1>
      <p class="description">{{ description }}</p>
    </header>

    <section class="automatisering-features">
      <div class="feature-grid">
        <div class="feature-card non-interactive" v-for="(feature, index) in features" :key="index">
          <h3>{{ feature.title }}</h3>
          <p>{{ feature.description }}</p>
        </div>
      </div>
    </section>

    <footer class="automatisering-footer">
      <p>Eksempel Side</p>
    </footer>
  </div>
</template>

<style scoped>
.automatisering-view {
  width: 100%;
  padding: 2rem;
}

.automatisering-header {
  text-align: center;
  margin-bottom: 2rem;
}

.automatisering-header h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.automatisering-header .description {
  font-size: 1.2rem;
  color: var(--color-text-light, #666);
}

.automatisering-features {
  padding: 2rem 0;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
}

.feature-card {
  padding: 1.5rem;
  background-color: var(--color-background, #ececec);
  border: 1px dashed var(--color-border, #ccc);
  border-radius: 8px;
  text-align: center;
}

.feature-card.non-interactive:hover {
  transform: none;
  opacity: 1;
}

.feature-card h3 {
  margin-bottom: 0.5rem;
  font-size: 1.5rem;
}

.feature-card p {
  font-size: 1rem;
  color: var(--color-text, #555);
}

.automatisering-footer {
  text-align: center;
  margin-top: 2rem;
  font-size: 1rem;
  color: var(--color-text-light, #666);
}
</style>
