import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import WordTableView from '../views/WordTableView.vue';
import StudyView from '../views/StudyView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/words', name: 'words', component: WordTableView },
    { path: '/study', name: 'study', component: StudyView }
  ]
});

export default router;
