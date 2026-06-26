<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { getRelations, type RelationItem } from '../api/client';
import { getStoredUserId, normalizeUserId, subscribeUserIdChange } from '../utils/user';

const relations = ref<RelationItem[]>([]);
const currentIndex = ref(0);
const showSentence = ref(false);
const error = ref('');
const userId = ref(getStoredUserId());

const currentItem = computed(() => relations.value[currentIndex.value] ?? null);
const total = computed(() => relations.value.length);

function syncIndex(index: number) {
  if (relations.value.length === 0) return;
  const safeIndex = (index + relations.value.length) % relations.value.length;
  currentIndex.value = safeIndex;
  showSentence.value = false;
}

async function loadData() {
  const response = await getRelations(userId.value);
  relations.value = response.items;
  currentIndex.value = 0;
  showSentence.value = false;
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
  <section class="study-layout">
    <article class="study-card">
      <p class="eyebrow">Study Mode</p>
      <h3>背单词</h3>

      <p class="muted">当前用户：{{ userId }}</p>

      <div v-if="currentItem" class="study-word">{{ currentItem.word }}</div>
      <div v-else class="study-word">暂无可练习内容</div>

      <p v-if="currentItem" class="study-meta">第 {{ currentIndex + 1 }} / {{ total }} 条</p>

      <div class="actions">
        <button class="btn" type="button" :disabled="total === 0" @click="syncIndex(currentIndex - 1)">上一条</button>
        <button class="btn btn-primary" type="button" :disabled="total === 0" @click="showSentence = !showSentence">
          {{ showSentence ? '隐藏句子' : '显示句子' }}
        </button>
        <button class="btn" type="button" :disabled="total === 0" @click="syncIndex(currentIndex + 1)">下一条</button>
      </div>

      <div v-if="currentItem && showSentence" class="study-sentence">
        {{ currentItem.sentence }}
      </div>
    </article>

    <aside class="study-card">
      <h3>当前练习队列</h3>
      <p class="muted">从 relation 表里读取当前用户的词和句子组合，后续可以在这里加复习间隔、正确率和错题本。</p>

      <ol v-if="relations.length > 0">
        <li v-for="item in relations.slice(0, 8)" :key="item.r_id">
          {{ item.word }}
        </li>
      </ol>
      <p v-else class="muted">暂无数据，先去单词表页面添加内容。</p>

      <p v-if="error" class="muted">{{ error }}</p>
    </aside>
  </section>
</template>
