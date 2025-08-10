// HeaderBarItem.vue
<template>
  <div class="top-menu">
    <div class="header-section left">
      <slot name="left"></slot>
    </div>

    <div class="header-section center">
      <slot name="center"></slot>
    </div>

    <div class="header-section right">
      <slot name="right"></slot>
    </div>
  </div>
</template>

<style scoped>
.item {
  display: flex;
  position: relative;
  padding: 0.5rem;
  min-width: fit-content;
}

.details {
  flex: 1;
  margin-left: 1rem;
}

i {
  display: flex;
  place-items: center;
  place-content: center;
  width: 32px;
  height: 32px;
  color: var(--color-text);
}

h3 {
  font-size: 1.2rem;
  font-weight: 500;
  margin-bottom: 0.4rem;
  color: var(--color-heading);
}

@media (min-width: 1024px) {
  .item {
    padding: 0.4rem;
  }

  i {
    background: var(--color-background);
    border-radius: 8px;
    width: 50px;
    height: 50px;
  }
}
</style>

<style scoped>
.top-menu {
  display: grid;
  grid-template-columns: minmax(auto, 1fr) auto minmax(auto, 1fr);
  align-items: center;
  width: 100%;
  max-width: 100%;
  padding: 0 clamp(1rem, 5vw, 225px);
  gap: 1rem;
  overflow: hidden;
}

.header-section {
  display: flex;
  align-items: center;
  gap: clamp(0.5rem, 2vw, 1rem);
  min-width: 0;
  flex-wrap: nowrap;
}

.left {
  justify-content: flex-start;
}

.center {
  justify-content: center;
}

.right {
  justify-content: flex-end;
}

@media (max-width: 1024px) {
  .header-section {
    gap: 0.75rem;
  }
}

/* Basis stiler for elementer */
.item {
  display: flex;
  align-items: center;
  padding: clamp(0.3rem, 1vw, 0.5rem);
  min-width: 0;
  white-space: nowrap;
}

/* Prevent text overflow */
.details {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

i {
  flex-shrink: 0;
  width: clamp(24px, 4vw, 32px);
  height: clamp(24px, 4vw, 32px);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
