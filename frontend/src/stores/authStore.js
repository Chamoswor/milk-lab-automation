import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    username: '',
    isLoggedIn: null,
  }),
  actions: {
    setLoggedIn(status) {
      this.isLoggedIn = status;
    },
    setUsername(username) {
      this.username = username;
    },
  },
});
