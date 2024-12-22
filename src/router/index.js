import Tetris from "@/views/Tetris.vue";
import { createRouter, createWebHashHistory } from 'vue-router'
const routes = [
    {
        path: '/',
        name: 'tetris',
        component: Tetris
    }
]
const router = createRouter({
    history: createWebHashHistory(),
    routes
})
export default routes