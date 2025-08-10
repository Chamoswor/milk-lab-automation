<script setup>
// Importer nødvendige moduler og data hvis aktuelt
import { ref } from 'vue'

// Eksempel på reactive data
const title = ref('Integrasjon med Eksisterende Systemer')
const description = ref(
  'Vårt system kan enkelt kan integreres med gårds- og laboratorieprogramvare.',
)
const features = ref([
  {
    title: 'Databasekoblinger',
    description:
      'Vår løsning støtter tilkobling til eksisterende databaser for enkel dataoverføring.',
  },
  {
    title: 'Skalerbar Arkitektur',
    description:
      'Designet for å vokse med dine behov, og håndterer økende krav uten å påvirke ytelsen negativt.',
  },
  {
    title: 'Maskinvarekompatibilitet',
    description: 'Kan enkelt kobles med RFID-lesere, QR-skannere og andre enheter.',
  },
  {
    title: 'Automatisk datasynkronisering',
    description:
      'Sikrer at data oppdateres i sanntid mellom systemer, og muliggjør sømløs integrasjon.',
  },
])
</script>

<template>
  <div class="dataanalyse-view">
    <header class="dataanalyse-header">
      <h1>{{ title }}</h1>
      <p class="description">{{ description }}</p>
    </header>

    <section class="dataanalyse-features">
      <div class="feature-grid-wrapper">
        <div class="feature-grid">
          <div
            class="feature-card non-interactive"
            v-for="(feature, index) in features"
            :key="index"
          >
            <h3>{{ feature.title }}</h3>
            <p>{{ feature.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <footer class="dataanalyse-footer">
      <p>Eksempel Side</p>
    </footer>
  </div>
</template>

<style scoped>
.dataanalyse-view {
  width: 100%;
  padding: 2rem;
}

.dataanalyse-header {
  text-align: center;
  margin-bottom: 2rem;
}

.dataanalyse-header h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.dataanalyse-header .description {
  font-size: 1.2rem;
  color: var(--color-text-light, #666);
}

.dataanalyse-features {
  padding: 2rem 0;
}

.feature-grid-wrapper {
  display: flex;
  justify-content: center; /* Sentraliserer hele gridet */
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  max-width: 800px; /* Sikrer at gridet har en definert bredde for responsiv tilpasning */
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

.dataanalyse-footer {
  text-align: center;
  margin-top: 2rem;
  font-size: 1rem;
  color: var(--color-text-light, #666);
}
</style>
