<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { getDashboard, type DashboardStats } from '../api/client';
import { getStoredUserId, normalizeUserId, subscribeUserIdChange } from '../utils/user';

const userId = ref(getStoredUserId());
const stats = ref<DashboardStats>({ users: 0, relations: 0, user_relations: 0, my_relations: 0, user_id: userId.value });
const loading = ref(true);
const error = ref('');

async function loadDashboard() {
  stats.value = await getDashboard(userId.value);
}

let unsubscribe: (() => void) | null = null;

onMounted(async () => {
  try {
    userId.value = normalizeUserId(userId.value);
    await loadDashboard();
    unsubscribe = subscribeUserIdChange((nextUserId) => {
      userId.value = normalizeUserId(nextUserId);
      loadDashboard().catch((err) => {
        error.value = err instanceof Error ? err.message : '加载失败';
      });
    });
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败';
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => {
  unsubscribe?.();
});
</script>

<template>
  <section class="hero">
    <p class="eyebrow">Dashboard</p>
    <h2>一个按用户隔离的单词管理与背诵工作台</h2>
    <p>每个用户使用自己的用户 ID，数据通过 relation 和 user_relation 分开保存。</p>

    <p class="muted">当前用户：{{ stats.user_id }}</p>

    <div class="actions">
      <RouterLink class="btn btn-primary" to="/words">进入单词表</RouterLink>
      <RouterLink class="btn" to="/study">开始背单词</RouterLink>
    </div>
  </section>

  <section class="card-grid">
    <article class="summary-card">
      <h3>用户</h3>
      <p class="summary-value">{{ loading ? '...' : stats.users }}</p>
    </article>
    <article class="summary-card">
      <h3>总关联</h3>
      <p class="summary-value">{{ loading ? '...' : stats.relations }}</p>
    </article>
    <article class="summary-card">
      <h3>用户关联</h3>
      <p class="summary-value">{{ loading ? '...' : stats.user_relations }}</p>
    </article>
    <article class="summary-card">
      <h3>我的单词本</h3>
      <p class="summary-value">{{ loading ? '...' : stats.my_relations }}</p>
    </article>
  </section>

  <p v-if="error" class="muted">{{ error }}</p>
</template>
