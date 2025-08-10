import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import * as Icons from '@element-plus/icons-vue'

import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(createPinia())
for (const [key, component] of Object.entries(Icons)) {
    app.component(key, component)
    }

app.use(ElementPlus);


app.use(router)

app.mount('#app')
