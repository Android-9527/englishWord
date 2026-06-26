<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { getRelations, type RelationItem } from '../api/client';
import { getStoredUserId, normalizeUserId, subscribeUserIdChange } from '../utils/user';

const relations = ref<RelationItem[]>([]);
const userId = ref(getStoredUserId());
const error = ref('');

const sortedRelations = computed(() => [...relations.value].sort((a, b) => b.r_id - a.r_id));

async function loadData() {
  const response = await getRelations(userId.value);
  relations.value = response.items;
}

let unsubscribe: (() => void) | null = null;

onMounted(async () => {
  try {
    userId.value = normalizeUserId(userId.value);
    await loadData();
    unsubscribe = subscribeUserIdChange((nextUserId) => {
      userId.value = normalizeUserId(nextUserId);
      loadData().catch((err) => {
        error.value = err instanceof Error ? err.message : '加载失败';
      });
    });
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败';
  }
});

onUnmounted(() => {
  unsubscribe?.();
});
</script>

<template>
  <section class="table-panel">
    <h3>relation 表</h3>
    <p class="muted">当前用户：{{ userId }}</p>

    <table class="data-table">
      <thead>
        <tr>
          <th>R ID</th>
          <th>单词</th>
          <th>单词意思</th>
          <th>句子</th>
          <th>句子意思</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in sortedRelations" :key="item.r_id">
          <td>{{ item.r_id }}</td>
          <td>{{ item.word }}</td>
          <td>{{ item.w_trans || '暂无' }}</td>
          <td>{{ item.sentence }}</td>
          <td>{{ item.s_trans || '暂无' }}</td>
        </tr>
        <tr v-if="sortedRelations.length === 0">
          <td colspan="5">暂无 relation 数据</td>
        </tr>
      </tbody>
    </table>
    <p v-if="error" class="muted">{{ error }}</p>
  </section>
</template>
