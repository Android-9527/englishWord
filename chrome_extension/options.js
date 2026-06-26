const userId = document.getElementById('userId');
const status = document.getElementById('status');
const saveButton = document.getElementById('save');

function loadSettings() {
  chrome.storage.sync.get(
    {
      USER_ID: 'default'
    },
    (items) => {
      userId.value = items.USER_ID;
    }
  );
}

function saveSettings() {
  chrome.storage.sync.set(
    {
      USER_ID: userId.value
    },
    () => {
      status.textContent = '已保存';
      setTimeout(() => {
        status.textContent = '';
      }, 2000);
    }
  );
}

document.addEventListener('DOMContentLoaded', loadSettings);
saveButton.addEventListener('click', saveSettings);
