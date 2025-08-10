<template>
    <div class="dropdown">
        <div class="dropdown-content">
            <a href="#" @click.prevent="navigateToDashboard">Dashbord</a>
            <a href="#" @click.prevent="logout">Logg ut</a>
        </div>
    </div>
</template>

<script setup>
    import { LogOut } from '@/middleware/backend.js'
    import router from '@/router';

    function navigateToDashboard() {
        router.push('/dashboard');
    }

    async function logout() {
        try {
            await LogOut();
            location.href = "/";
        } catch (error) {
            console.error("Logout feilet:", error);
        }
    }

</script>

<style scoped>
.dropdown {
    position: relative;
    display: inline-block;
}

.dropdown-content {
    display: block;
    position: fixed;
    top: unset;
    left: unset;
    background-color: #f9f9f9;
    min-width: 160px;
    box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
    z-index: 1;
}

/* Resten av CSS-en forblir som før */
.dropdown-content a {
    color: black;
    padding: 12px 16px;
    text-decoration: none;
    display: block;
}

.dropdown-content a:hover {
    background-color: #f1f1f1;
}
</style>