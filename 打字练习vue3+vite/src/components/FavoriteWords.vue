<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import "../assets/favorite-words.css";

// 从父组件接收用户登录状态和当前用户信息
const props = defineProps({
  isLoggedIn: {
    type: Boolean,
    default: false
  },
  currentUser: {
    type: Object,
    default: null
  }
});

// 收藏的单词列表
const favoriteWords = ref([]);
// 加载状态
const isLoading = ref(false);
// 搜索关键词
const searchKeyword = ref('');
// 排序方式: 'time'(收藏时间) | 'alpha'(字母顺序)
const sortBy = ref('time');
// 显示模式: 'grid' | 'list' | 'practice'
const displayMode = ref('grid');
// 当前练习的单词索引
const currentPracticeIndex = ref(0);
// 打字练习相关状态
const startTime = ref(null);
const totalChars = ref(0);
const cpsValue = ref(0);
const accuracyValue = ref("100%");
const timeValue = ref("0:00");
const activeLine = ref(null);
let timer = null;
// 提示消息
const toastMessage = ref('');
// 编辑中的单词
const editingWord = ref(null);
// 编辑表单
const editForm = ref({
  sentence: '',
  translation: '',
  notes: ''
});
// 确认删除的单词ID
const deleteConfirmId = ref(null);

// 模拟API调用获取收藏单词
const fetchFavoriteWords = async () => {
  if (!props.isLoggedIn) return;
  
  isLoading.value = true;
  
  try {
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // 模拟从后端获取的数据
    // 初始为空数组，用户需要在打字练习界面点击收藏按钮才会添加单词
    favoriteWords.value = [];
  } catch (error) {
    console.error('获取收藏单词失败:', error);
    showToast('获取收藏单词失败，请重试');
  } finally {
    isLoading.value = false;
  }
};

// 过滤和排序后的单词列表
const filteredWords = computed(() => {
  let result = [...favoriteWords.value];
  
  // 搜索过滤
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.toLowerCase();
    result = result.filter(word => 
      word.sentence.toLowerCase().includes(keyword) || 
      word.translation.toLowerCase().includes(keyword) ||
      word.notes.toLowerCase().includes(keyword) ||
      word.tags.some(tag => tag.toLowerCase().includes(keyword))
    );
  }
  
  // 排序
  if (sortBy.value === 'time') {
    result.sort((a, b) => b.addedAt - a.addedAt);
  } else if (sortBy.value === 'alpha') {
    result.sort((a, b) => a.sentence.localeCompare(b.sentence));
  }
  
  return result;
});

// 显示提示消息
const showToast = (message, duration = 3000) => {
  toastMessage.value = message;
  setTimeout(() => {
    toastMessage.value = '';
  }, duration);
};

// 开始编辑单词
const startEdit = (word) => {
  editingWord.value = word.id;
  editForm.value = {
    sentence: word.sentence,
    translation: word.translation,
    notes: word.notes
  };
};

// 取消编辑
const cancelEdit = () => {
  editingWord.value = null;
};

// 保存编辑
const saveEdit = async (wordId) => {
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 更新本地数据
    const index = favoriteWords.value.findIndex(w => w.id === wordId);
    if (index !== -1) {
      favoriteWords.value[index] = {
        ...favoriteWords.value[index],
        sentence: editForm.value.sentence,
        translation: editForm.value.translation,
        notes: editForm.value.notes
      };
      
      showToast('保存成功');
      editingWord.value = null;
    }
  } catch (error) {
    console.error('保存失败:', error);
    showToast('保存失败，请重试');
  }
};

// 确认删除
const confirmDelete = (wordId) => {
  deleteConfirmId.value = wordId;
};

// 取消删除
const cancelDelete = () => {
  deleteConfirmId.value = null;
};

// 删除单词
const deleteWord = async (wordId) => {
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 从本地数据中删除
    favoriteWords.value = favoriteWords.value.filter(w => w.id !== wordId);
    
    showToast('删除成功');
    deleteConfirmId.value = null;
  } catch (error) {
    console.error('删除失败:', error);
    showToast('删除失败，请重试');
  }
};

// 添加新单词到收藏
const addToFavorite = (word) => {
  // 这个函数可以暴露给父组件调用
  // 用于在打字练习过程中添加单词到收藏
  const newWord = {
    id: Date.now(), // 临时ID，实际应该由后端生成
    sentence: word.sentence,
    translation: word.translation,
    addedAt: Date.now(),
    notes: '',
    tags: []
  };
  
  favoriteWords.value.unshift(newWord);
  showToast('添加到收藏成功');
};

// 格式化日期
const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// 开始打字练习
const startPractice = () => {
  displayMode.value = 'practice';
  currentPracticeIndex.value = 0;
  resetTimer();
  
  // 延迟一下确保DOM已更新
  setTimeout(() => {
    const firstLine = document.querySelector(".practice-line");
    if (firstLine) {
      highlightCurrentLine(firstLine);
    }
  }, 100);
};

// 高亮当前行
const highlightCurrentLine = (currentLine) => {
  // 移除所有行的高亮
  document.querySelectorAll(".practice-line").forEach((line) => {
    line.classList.remove("active");
  });
  // 添加当前行的高亮
  currentLine.classList.add("active");
  // 添加完成动画效果
  currentLine.style.animation = "complete-animation 0.5s ease";
  // 动画结束后清除
  setTimeout(() => {
    currentLine.style.animation = "";
  }, 500);
  activeLine.value = currentLine;
};

// 处理输入事件
const handleInput = (e) => {
  let currInputEle = e.target;
  let currInputHiddenEle = currInputEle.previousElementSibling;
  let currPlainTextEle = currInputEle.parentElement.querySelector(".practice-plain-text");

  let targetValue = currInputHiddenEle.value;
  let inputValue = currInputEle.value;

  // 初始化开始时间
  if (!startTime.value && inputValue.length > 0) {
    startTime.value = new Date();
    // 开始计时
    startTimer();
  }

  // 计算打字速度
  if (startTime.value) {
    const currentTime = new Date();
    const timeElapsed = (currentTime - startTime.value) / 1000; // 转换为秒

    // 计算总字符数
    totalChars.value = inputValue.length;

    // 计算每秒字符数 (CPS)
    cpsValue.value =
      Math.round((totalChars.value / timeElapsed) * 10) / 10 || 0; // 保留一位小数

    // 计算准确率
    let correctChars = 0;
    const inputLength = Math.min(inputValue.length, targetValue.length);
    for (let i = 0; i < inputLength; i++) {
      if (inputValue[i] === targetValue[i]) {
        correctChars++;
      }
    }
    const accuracy = Math.round((correctChars / inputLength) * 100) || 100;
    accuracyValue.value = accuracy + "%";
  }

  let result = targetValue
    .split("")
    .map((char, index) => {
      const hasInput = index < inputValue.length;
      const inputChar = hasInput ? inputValue[index] : null;

      // 处理空格（保持原始位置，添加背景色）
      if (char === " ") {
        return hasInput
          ? inputChar === " "
            ? '<span class="green space"> </span>' // 正确输入空格
            : '<span class="red space"> </span>' // 在空格位置输入其他字符显示红色
          : '<span class="space"> </span>'; // 未输入时保持原样
      }

      return hasInput
        ? inputChar === char
          ? `<span class="green">${char}</span>`
          : `<span class="red">${char}</span>`
        : char;
    })
    .join("");

  currPlainTextEle.innerHTML = result;

  if (inputValue === targetValue) {
    // 清空输入框并重置显示
    currInputEle.value = "";
    currPlainTextEle.innerHTML = targetValue;
    const currentLine = currInputEle.closest(".practice-line");
    
    // 获取当前行的索引
    const currentIndex = parseInt(currentLine.getAttribute("data-index"));
    
    // 确定下一个句子的索引
    const nextIndex = currentIndex + 1;
    
    // 检查是否还有下一个句子
    if (nextIndex < filteredWords.value.length) {
      // 找到下一个句子的DOM元素
      const nextLine = document.querySelector(`.practice-line[data-index="${nextIndex}"]`);
      
      if (nextLine) {
        let nextInput = nextLine.querySelector(".practice-input");
        
        // 滚动到下一行
        nextLine.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
        
        // 高亮下一行
        highlightCurrentLine(nextLine);
        
        // 更新当前练习索引
        currentPracticeIndex.value = nextIndex;
        
        // 不重置计时器，保持连续计时
        
        // 短暂延迟后聚焦到下一行的输入框
        setTimeout(() => {
          nextInput.focus();
        }, 300);
      }
    } else {
      // 所有单词练习完成
      showToast("恭喜！所有收藏单词练习完成");
      resetTimer();
    }
  }
};

// 开始计时器
const startTimer = () => {
  const startTimeValue = new Date();
  
  timer = setInterval(() => {
    const currentTime = new Date();
    const elapsedSeconds = Math.floor((currentTime - startTimeValue) / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    timeValue.value = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  }, 1000);
};

// 重置计时器
const resetTimer = () => {
  clearInterval(timer);
  startTime.value = null;
  totalChars.value = 0;
  cpsValue.value = 0;
  accuracyValue.value = "100%";
  timeValue.value = "0:00";
};

// 切换到特定行
const switchToLine = (clickedLine) => {
  // 获取当前激活的行
  const currentLine = document.querySelector(".practice-line.active");

  // 如果点击的是当前行，不做任何操作
  if (currentLine === clickedLine) return;

  // 清空当前行的输入
  if (currentLine) {
    const currentInput = currentLine.querySelector(".practice-input");
    currentInput.value = "";
    const currentPlainText = currentLine.querySelector(".practice-plain-text");
    currentPlainText.innerHTML =
      currentPlainText.getAttribute("data-original-text") ||
      currentPlainText.textContent;
  }

  // 切换到新行
  highlightCurrentLine(clickedLine);

  // 滚动到新行
  clickedLine.scrollIntoView({
    behavior: "smooth",
    block: "start",
    inline: "nearest",
  });

  // 更新当前练习索引
  currentPracticeIndex.value = parseInt(clickedLine.getAttribute("data-index"));

  // 聚焦新行的输入框
  const newInput = clickedLine.querySelector(".practice-input");
  setTimeout(() => {
    newInput.focus();
  }, 300);
};

// 监听登录状态变化
watch(() => props.isLoggedIn, (newValue) => {
  if (newValue) {
    fetchFavoriteWords();
  } else {
    favoriteWords.value = [];
  }
});

// 导出添加收藏功能给父组件
defineExpose({
  addToFavorite
});

// 组件挂载时，如果已登录则获取收藏单词
onMounted(() => {
  if (props.isLoggedIn) {
    fetchFavoriteWords();
  }
  
  // 组件卸载时清理计时器
  onUnmounted(() => {
    clearInterval(timer);
  });
});
</script>

<template>
  <div class="favorite-words-container">
    <!-- 未登录状态提示 -->
    <div class="login-required" v-if="!isLoggedIn">
      <div class="login-message">
        <svg class="login-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          <circle cx="12" cy="7" r="4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <h3>请先登录</h3>
        <p>登录后即可使用收藏单词功能</p>
      </div>
    </div>
    
    <!-- 已登录状态显示收藏内容 -->
    <div class="favorite-content" v-else>
      <div class="favorite-header">
        <h2>我的收藏</h2>
        <div class="user-info" v-if="currentUser">
          <span>{{ currentUser.username }}</span>
        </div>
      </div>
      
      <!-- 工具栏 -->
      <div class="toolbar">
        <div class="search-box">
          <input 
            type="text" 
            v-model="searchKeyword" 
            placeholder="搜索单词、翻译或标签" 
          />
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="8" stroke-width="2" />
            <path d="M21 21l-4.35-4.35" stroke-width="2" stroke-linecap="round" />
          </svg>
        </div>
        
        <div class="controls">
          <div class="sort-control">
            <label for="sort-select">排序:</label>
            <select id="sort-select" v-model="sortBy">
              <option value="time">收藏时间</option>
              <option value="alpha">字母顺序</option>
            </select>
          </div>
          
          <div class="view-mode">
            <button 
              class="mode-btn" 
              :class="{ active: displayMode === 'grid' }" 
              @click="displayMode = 'grid'"
              title="网格视图"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="3" width="7" height="7" stroke-width="2" />
                <rect x="14" y="3" width="7" height="7" stroke-width="2" />
                <rect x="3" y="14" width="7" height="7" stroke-width="2" />
                <rect x="14" y="14" width="7" height="7" stroke-width="2" />
              </svg>
            </button>
            <button 
              class="mode-btn" 
              :class="{ active: displayMode === 'list' }" 
              @click="displayMode = 'list'"
              title="列表视图"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <line x1="3" y1="6" x2="21" y2="6" stroke-width="2" stroke-linecap="round" />
                <line x1="3" y1="12" x2="21" y2="12" stroke-width="2" stroke-linecap="round" />
                <line x1="3" y1="18" x2="21" y2="18" stroke-width="2" stroke-linecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <!-- 加载状态 -->
      <div class="loading-container" v-if="isLoading">
        <div class="loading-spinner"></div>
        <p>加载中...</p>
      </div>
      
      <!-- 无收藏数据状态 -->
      <div class="empty-state" v-else-if="filteredWords.length === 0">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <h3>暂无收藏单词</h3>
        <p v-if="searchKeyword">没有找到匹配的单词，请尝试其他关键词</p>
        <p v-else>在打字练习中点击收藏按钮添加单词</p>
      </div>
      
          <!-- 工具栏按钮 - 打字练习模式 -->
      <div class="practice-mode-button" v-if="!isLoading && filteredWords.length > 0">
        <button class="practice-btn" @click="startPractice" v-if="displayMode !== 'practice'">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" 
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          开始打字练习
        </button>
        <div class="view-buttons" v-if="displayMode === 'practice'">
          <button class="view-btn" @click="displayMode = 'grid'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
              <rect x="3" y="3" width="7" height="7" stroke-width="2" />
              <rect x="14" y="3" width="7" height="7" stroke-width="2" />
              <rect x="3" y="14" width="7" height="7" stroke-width="2" />
              <rect x="14" y="14" width="7" height="7" stroke-width="2" />
            </svg>
            返回网格视图
          </button>
          <button class="view-btn" @click="displayMode = 'list'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
              <line x1="3" y1="6" x2="21" y2="6" stroke-width="2" stroke-linecap="round" />
              <line x1="3" y1="12" x2="21" y2="12" stroke-width="2" stroke-linecap="round" />
              <line x1="3" y1="18" x2="21" y2="18" stroke-width="2" stroke-linecap="round" />
            </svg>
            返回列表视图
          </button>
        </div>
      </div>

      <!-- 打字练习视图 -->
      <div class="practice-container" v-if="displayMode === 'practice' && !isLoading">
        <!-- 练习状态栏 -->
        <div class="practice-stats">
          <span class="stat-item">
            <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span class="stat-label">速度</span>
            <span class="stat-value">{{ cpsValue }}</span>
            <span class="stat-unit">字/秒</span>
          </span>
          
          <span class="stat-item">
            <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              <polyline points="22 4 12 14.01 9 11.01" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span class="stat-label">准确率</span>
            <span class="stat-value">{{ accuracyValue }}</span>
          </span>
          
          <span class="stat-item">
            <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              <polyline points="12 6 12 12 16 14" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span class="stat-label">用时</span>
            <span class="stat-value">{{ timeValue }}</span>
          </span>
        </div>
        
        <!-- 练习内容 -->
        <div class="practice-content">
          <div 
            v-for="(word, index) in filteredWords" 
            :key="word.id"
            class="practice-line"
            :class="{ active: currentPracticeIndex === index }"
            :data-index="index"
            @click="switchToLine($event.currentTarget)"
          >
            <div class="practice-word-info">
              <span class="practice-word-index">{{ index + 1 }}.</span>
              <span class="practice-word-sentence">{{ word.sentence }}</span>
              <span class="practice-word-translation">{{ word.translation }}</span>
            </div>
            <div class="practice-plain-text" :data-original-text="word.sentence">
              {{ word.sentence }}
            </div>
            <input class="practice-hidden" type="hidden" :value="word.sentence" />
            <textarea
              class="practice-input"
              rows="1"
              autocomplete="off"
              spellcheck="false"
              @input="handleInput"
            ></textarea>
          </div>
        </div>
      </div>
          
      <!-- 单词列表 - 网格视图 -->
      <div class="word-grid" v-else-if="displayMode === 'grid' && !isLoading">
        <div class="word-card" v-for="word in filteredWords" :key="word.id">
          <!-- 正常显示模式 -->
          <div class="card-content" v-if="editingWord !== word.id">
            <div class="word-header">
              <h3 class="word-sentence">{{ word.sentence }}</h3>
              <div class="word-actions">
                <button class="action-btn edit-btn" @click="startEdit(word)" title="编辑">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
                <button class="action-btn delete-btn" @click="confirmDelete(word.id)" title="删除" v-if="deleteConfirmId !== word.id">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M3 6h18" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    <line x1="10" y1="11" x2="10" y2="17" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    <line x1="14" y1="11" x2="14" y2="17" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
                <!-- 删除确认 -->
                <div class="delete-confirm" v-if="deleteConfirmId === word.id">
                  <button class="confirm-btn confirm-yes" @click="deleteWord(word.id)">确认</button>
                  <button class="confirm-btn confirm-no" @click="cancelDelete">取消</button>
                </div>
              </div>
            </div>
            <p class="word-translation">{{ word.translation }}</p>
            <p class="word-notes" v-if="word.notes">{{ word.notes }}</p>
            <div class="word-tags">
              <span class="tag" v-for="(tag, index) in word.tags" :key="index">{{ tag }}</span>
            </div>
            <div class="word-date">收藏于 {{ formatDate(word.addedAt) }}</div>
          </div>
          
          <!-- 编辑模式 -->
          <div class="edit-form" v-else>
            <div class="form-group">
              <label for="edit-sentence">单词/句子</label>
              <input type="text" id="edit-sentence" v-model="editForm.sentence" />
            </div>
            <div class="form-group">
              <label for="edit-translation">翻译</label>
              <input type="text" id="edit-translation" v-model="editForm.translation" />
            </div>
            <div class="form-group">
              <label for="edit-notes">笔记</label>
              <textarea id="edit-notes" v-model="editForm.notes"></textarea>
            </div>
            <div class="edit-actions">
              <button class="edit-btn save-btn" @click="saveEdit(word.id)">保存</button>
              <button class="edit-btn cancel-btn" @click="cancelEdit">取消</button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 单词列表 - 列表视图 -->
      <div class="word-list" v-else-if="displayMode === 'list' && !isLoading">
        <div class="list-item" v-for="word in filteredWords" :key="word.id">
          <!-- 正常显示模式 -->
          <div class="list-content" v-if="editingWord !== word.id">
            <div class="list-main">
              <div class="list-text">
                <h3 class="word-sentence">{{ word.sentence }}</h3>
                <p class="word-translation">{{ word.translation }}</p>
              </div>
              <div class="list-actions">
                <button class="action-btn edit-btn" @click="startEdit(word)" title="编辑">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
                <button class="action-btn delete-btn" @click="confirmDelete(word.id)" title="删除" v-if="deleteConfirmId !== word.id">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M3 6h18" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    <line x1="10" y1="11" x2="10" y2="17" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    <line x1="14" y1="11" x2="14" y2="17" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
                <!-- 删除确认 -->
                <div class="delete-confirm" v-if="deleteConfirmId === word.id">
                  <button class="confirm-btn confirm-yes" @click="deleteWord(word.id)">确认</button>
                  <button class="confirm-btn confirm-no" @click="cancelDelete">取消</button>
                </div>
              </div>
            </div>
            <div class="list-details">
              <p class="word-notes" v-if="word.notes">{{ word.notes }}</p>
              <div class="list-footer">
                <div class="word-tags">
                  <span class="tag" v-for="(tag, index) in word.tags" :key="index">{{ tag }}</span>
                </div>
                <div class="word-date">{{ formatDate(word.addedAt) }}</div>
              </div>
            </div>
          </div>
          
          <!-- 编辑模式 -->
          <div class="edit-form" v-else>
            <div class="form-group">
              <label for="edit-sentence-list">单词/句子</label>
              <input type="text" id="edit-sentence-list" v-model="editForm.sentence" />
            </div>
            <div class="form-group">
              <label for="edit-translation-list">翻译</label>
              <input type="text" id="edit-translation-list" v-model="editForm.translation" />
            </div>
            <div class="form-group">
              <label for="edit-notes-list">笔记</label>
              <textarea id="edit-notes-list" v-model="editForm.notes"></textarea>
            </div>
            <div class="edit-actions">
              <button class="edit-btn save-btn" @click="saveEdit(word.id)">保存</button>
              <button class="edit-btn cancel-btn" @click="cancelEdit">取消</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 提示框 -->
    <div class="toast" v-if="toastMessage" v-text="toastMessage"></div>
  </div>
</template>
