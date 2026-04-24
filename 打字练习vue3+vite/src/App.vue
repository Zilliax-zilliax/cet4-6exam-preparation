<script setup>
import { ref, onMounted } from 'vue';
import TypingPractice from './components/TypingPractice.vue';
import cet4Words from './data/cet4Words.js';
import cet6Words from './data/cet6Words.js';
import './assets/typing-practice.css';
import './assets/favorite-words.css';

// 当前选择的单词列表
const currentWordList = ref(cet4Words);
const practiceType = ref('cet4');

// 切换练习类型
const switchPracticeType = (type) => {
  if (type === 'cet4') {
    currentWordList.value = cet4Words;
    practiceType.value = 'cet4';
    localStorage.setItem('selectedPracticeType', 'cet4');
  } else if (type === 'cet6') {
    currentWordList.value = cet6Words;
    practiceType.value = 'cet6';
    localStorage.setItem('selectedPracticeType', 'cet6');
  }
};

// 加载上次选择的练习类型
onMounted(() => {
  const lastSelectedType = localStorage.getItem('selectedPracticeType') || 'cet4';
  switchPracticeType(lastSelectedType);
  
  // 检查主题设置
  const currentTheme = localStorage.getItem('theme');
  if (currentTheme === 'dark') {
    document.body.classList.add('dark-theme');
  } else if (currentTheme === 'light') {
    document.body.classList.remove('dark-theme');
  }
});
</script>

<template>
  <div class="app-container">
    <TypingPractice :wordList="currentWordList">
      <template #practice-list>
        <button 
          class="practice-item" 
          :class="{ 'active': practiceType === 'cet4' }"
          @click="switchPracticeType('cet4')"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke-width="2" stroke-linecap="round"
              stroke-linejoin="round" />
          </svg>
          四级语句
        </button>
        <button 
          class="practice-item" 
          :class="{ 'active': practiceType === 'cet6' }"
          @click="switchPracticeType('cet6')"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke-width="2" stroke-linecap="round"
              stroke-linejoin="round" />
          </svg>
          六级语句
        </button>
      </template>
    </TypingPractice>
  </div>
</template>

<style>
/* 全局样式 */
body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
}

.app-container {
  width: 100%;
  min-height: 100vh;
}

</style>