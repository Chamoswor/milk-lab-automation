<script setup>
// Data imports og composables kan legges her
import { ref } from 'vue'

// Eksempel på reactive data
const welcomeMessage = ref('Velkommen til Melkeprøveprosjektet')

const handleClick = (navigateURL) => {
  if (navigateURL) {
    window.location.href = navigateURL
  }
}
</script>

<template>
  <main class="home-view">
    <!-- Hero/Welcome section -->
    <section class="hero">
      <div class="hero-content">
        <h1>{{ welcomeMessage }}</h1>
        <p class="subtitle">Effektiv og automatisert løsning for melkekvalitet og dyrehelse</p>
      </div>
    </section>

    <!-- Main content sections -->
    <section class="features">
      <div class="feature-grid">
        <div class="feature-card" @click="handleClick('/om-automatisering')">
          <h3>Automatisering</h3>
          <p>Utforsk vår løsning for automatisert sortering og registrering av melkeprøver.</p>
        </div>
        <div class="feature-card" @click="handleClick('/om-dataanalyse')">
          <h3>Dataanalyse</h3>
          <p>Oppdag hvordan vi samler og visualiserer prøvedata.</p>
        </div>
        <div class="feature-card" @click="handleClick('/om-integrasjon')">
          <h3>Integrasjon</h3>
          <p>
            Les mer om hvordan systemet integreres med eksisterende gårds- og laboratorieløsninger.
          </p>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.home-view {
  width: 100%;
}

.hero {
  padding: 4rem 2rem;
  background-color: var(--color-background-soft, #f5f5f5);
  text-align: center;
}

.hero-content {
  max-width: 800px;
  margin: 0 auto;
}

.hero h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.subtitle {
  font-size: 1.2rem;
  color: var(--color-text-light, #666);
}

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
  background-color: var(--color-background, #fff);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-5px);
}

.feature-card h3 {
  margin-bottom: 1rem;
  font-size: 1.5rem;
}

/* Responsive design */
@media (max-width: 768px) {
  .hero {
    padding: 2rem 1rem;
  }

  .hero h1 {
    font-size: 2rem;
  }

  .features {
    padding: 2rem 1rem;
  }

  .feature-grid {
    grid-template-columns: 1fr;
  }
}
</style>
