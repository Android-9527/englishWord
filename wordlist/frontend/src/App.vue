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
          <button class="btn" type="button" @click="toggleSettings">我的</button>
          <div v-if="settingsOpen" class="settings-panel">
            <h3>我的</h3>
            <div class="menu-list">
              <button class="menu-item" type="button" @click="openUserSettings">设置用户</button>
              <button class="menu-item" type="button" @click="openAboutPage">关于</button>
              <button class="menu-item" type="button" @click="openProductPage">日语学习平台</button>
            </div>

            <div v-if="showUserSettings" class="user-settings-block">
              <label class="field">
                <span>用户 ID</span>
                <input v-model="draftUserId" type="text" placeholder="例如 demo" />
              </label>
              <div class="actions">
                <button class="btn btn-primary" type="button" @click="saveUserId">保存</button>
                <button class="btn" type="button" @click="closeUserSettings">取消</button>
              </div>
              <p v-if="settingsMessage" :class="['muted', settingsMessageType === 'warning' ? 'warning-text' : '']">
                {{ settingsMessage }}
              </p>
            </div>
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
const showUserSettings = ref(false);
const draftUserId = ref(getStoredUserId());
const currentUserId = ref(getStoredUserId());
const settingsMessage = ref('');
const settingsMessageType = ref<'info' | 'warning'>('info');

function openSettings() {
  draftUserId.value = currentUserId.value;
  settingsMessage.value = '';
  showUserSettings.value = false;
  settingsOpen.value = true;
}

function closeSettings() {
  settingsOpen.value = false;
  showUserSettings.value = false;
}

function toggleSettings() {
  if (settingsOpen.value) {
    closeSettings();
    return;
  }
  openSettings();
}

function openUserSettings() {
  draftUserId.value = currentUserId.value;
  settingsMessage.value = '';
  showUserSettings.value = true;
}

function closeUserSettings() {
  showUserSettings.value = false;
}

function openAboutPage() {
  window.open('https://github.com/Android-9527/englishWord', '_blank', 'noopener,noreferrer');
}

function openProductPage() {
  window.open('http://136.117.65.65/', '_blank', 'noopener,noreferrer');
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
