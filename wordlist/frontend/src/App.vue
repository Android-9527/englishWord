<template>
  <div class="app-shell">
    <header class="topbar">
      <div>
        <p class="eyebrow">Wordlist</p>
        <h1>单词表与背单词</h1>
      </div>
      <div class="topbar-actions">
        <nav class="nav-links">
          <RouterLink to="/">首页</RouterLink>
          <RouterLink to="/words">单词表</RouterLink>
          <RouterLink to="/study">背单词</RouterLink>
        </nav>

        <div class="settings-wrap">
          <button class="btn" type="button" @click="toggleSettings">设置</button>
          <div v-if="settingsOpen" class="settings-panel">
            <h3>用户设置</h3>
            <label class="field">
              <span>u_id</span>
              <input v-model="draftUserId" type="text" placeholder="default" />
            </label>
            <div class="actions">
              <button class="btn btn-primary" type="button" @click="saveUserId">保存</button>
              <button class="btn" type="button" @click="closeSettings">关闭</button>
            </div>
            <p v-if="settingsMessage" :class="['muted', settingsMessageType === 'warning' ? 'warning-text' : '']">
              {{ settingsMessage }}
            </p>
          </div>
        </div>
      </div>
    </header>

    <main class="page-body">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { createUser } from './api/client';
import { getStoredUserId, normalizeUserId, setStoredUserId, subscribeUserIdChange } from './utils/user';

const settingsOpen = ref(false);
const draftUserId = ref(getStoredUserId());
const currentUserId = ref(getStoredUserId());
const settingsMessage = ref('');
const settingsMessageType = ref<'info' | 'warning'>('info');

function openSettings() {
  draftUserId.value = currentUserId.value;
  settingsMessage.value = '';
  settingsOpen.value = true;
}

function closeSettings() {
  settingsOpen.value = false;
}

function toggleSettings() {
  if (settingsOpen.value) {
    closeSettings();
    return;
  }
  openSettings();
}

async function saveUserId() {
  const normalizedUserId = normalizeUserId(draftUserId.value);
  try {
    const response = await createUser(normalizedUserId);
    setStoredUserId(normalizedUserId);
    currentUserId.value = normalizedUserId;
    if (response.created) {
      settingsMessageType.value = 'info';
      settingsMessage.value = `已创建用户 ${normalizedUserId}`;
    } else {
      settingsMessageType.value = 'warning';
      settingsMessage.value = `用户 ${normalizedUserId} 已存在，已切换到该用户`;
    }
  } catch (error) {
    settingsMessageType.value = 'warning';
    settingsMessage.value = error instanceof Error ? error.message : '保存失败';
    return;
  }
}

function syncCurrentUser(userId: string) {
  currentUserId.value = normalizeUserId(userId);
  if (!settingsOpen.value) {
    draftUserId.value = currentUserId.value;
  }
}

let unsubscribe: (() => void) | null = null;

onMounted(() => {
  syncCurrentUser(getStoredUserId());
  unsubscribe = subscribeUserIdChange(syncCurrentUser);
});

onUnmounted(() => {
  unsubscribe?.();
});
</script>
