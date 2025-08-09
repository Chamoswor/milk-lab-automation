<template>
    <button class="back-button">
        <span class="arrow">⬅</span>
    </button>
</template>

<style scoped>
.back-button {
  position: absolute;
  top: -2rem;
  left: 0;
  margin: 1rem;            /* tilsvarer omtrent Tailwinds m-4 */
  padding: 0.5rem;         /* tilsvarer omtrent p-2 */
  background-color: #e5e7eb; /* bakgrunnsfarge som ligner Tailwind bg-gray-200 */
  border: none;
  border-radius: 9999px;   /* gir full avrunding (rund knapp) */
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);  /* tilsvarer en medium skygge */
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.back-button:hover {
  background-color: #d1d5db; /* tilsvarer hover:bg-gray-300 */
}

.arrow {
  font-size: 1.25rem;      /* tilsvarer Tailwind sin text-xl */
}
</style>