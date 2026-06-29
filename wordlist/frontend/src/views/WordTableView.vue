<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { deleteRelation, getRelations, type RelationItem } from '../api/client';
import { getStoredUserId, normalizeUserId, subscribeUserIdChange } from '../utils/user';

const relations = ref<RelationItem[]>([]);
const userId = ref(getStoredUserId());
const error = ref('');
const pageSize = 10;
const currentPage = ref(1);
const deleteMode = ref(false);
const selectedIds = ref<number[]>([]);
const deletingMessage = ref('');

const sortedRelations = computed(() => [...relations.value].sort((a, b) => b.r_id - a.r_id));
const totalPages = computed(() => Math.max(1, Math.ceil(sortedRelations.value.length / pageSize)));
const pagedRelations = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return sortedRelations.value.slice(start, start + pageSize);
});

function goToPage(page: number) {
  if (page < 1 || page > totalPages.value) {
    return;
  }
  currentPage.value = page;
}

function enterDeleteMode() {
  deleteMode.value = true;
  selectedIds.value = [];
  deletingMessage.value = '';
}

function exitDeleteMode() {
  deleteMode.value = false;
  selectedIds.value = [];
  deletingMessage.value = '';
}

function toggleSelect(id: number) {
  if (selectedIds.value.includes(id)) {
    selectedIds.value = selectedIds.value.filter((itemId) => itemId !== id);
  } else {
    selectedIds.value = [...selectedIds.value, id];
  }
}

async function confirmDelete() {
  if (selectedIds.value.length === 0) {
    deletingMessage.value = '请先选择要删除的内容';
    return;
  }

  try {
    await deleteRelation(selectedIds.value, userId.value);
    relations.value = relations.value.filter((item) => !selectedIds.value.includes(item.r_id));
    deletingMessage.value = `已删除 ${selectedIds.value.length} 条记录`;
    selectedIds.value = [];
    deleteMode.value = false;
  } catch (err) {
    deletingMessage.value = err instanceof Error ? err.message : '删除失败';
  }
}

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

    <div class="actions">
      <button v-if="!deleteMode" class="btn btn-primary" type="button" @click="enterDeleteMode">删除</button>
      <button v-else class="btn" type="button" @click="exitDeleteMode">取消</button>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th v-if="deleteMode">选择</th>
          <th>R ID</th>
          <th>单词</th>
          <th>单词意思</th>
          <th>句子</th>
          <th>句子意思</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in pagedRelations" :key="item.r_id">
          <td v-if="deleteMode">
            <input type="checkbox" :checked="selectedIds.includes(item.r_id)" @change="toggleSelect(item.r_id)" />
          </td>
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

    <div v-if="deleteMode" class="delete-confirm">
      <p>{{ deletingMessage || `已选择 ${selectedIds.length} 条记录` }}</p>
      <div class="actions">
        <button class="btn btn-primary" type="button" @click="confirmDelete">确认删除</button>
        <button class="btn" type="button" @click="exitDeleteMode">取消</button>
      </div>
    </div>

    <div v-if="sortedRelations.length > 0" class="pagination">
      <button
        v-for="page in totalPages"
        :key="page"
        class="page-btn"
        :class="{ active: page === currentPage }"
        type="button"
        @click="goToPage(page)"
      >
        {{ page }}
      </button>
    </div>

    <p v-if="error" class="muted">{{ error }}</p>
  </section>
</template>
