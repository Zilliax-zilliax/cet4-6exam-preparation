<script setup>
import { computed, onMounted, onUnmounted, ref, reactive } from "vue";
import FavoriteWords from './FavoriteWords.vue';
import "../assets/login-form.css";
// 导入单词数据
const props = defineProps({
  wordList: {
    type: Array,
    required: true,
  },
});

// 定义事件
const emit = defineEmits(['login-status-change', 'add-to-favorite']);

// 响应式状态
const currentWordList = ref([]);
const box = ref(null);
const startTime = ref(null);
const totalChars = ref(0);
const cpsValue = ref(0);
const accuracyValue = ref("100%");
const timeValue = ref("0:00");
const currentTheme = ref(localStorage.getItem("theme") || "");
const activeLineIndex = ref(0);
const activeLine = ref(null);
const sidebarVisible = ref(false);
const sidebarHintVisible = ref(false);
const showLoginModal = ref(false);
const isLoading = ref(false);
const isLoggedIn = ref(false);
const currentUser = ref(null);
const toastMessage = ref("");
const currentForm = ref("login"); // login, register, forgot
const activeView = ref("practice"); // practice 或 favorites
const favoriteWordsRef = ref(null);

// 登录表单数据
const loginForm = reactive({
  account: "",
  password: "",
  captcha: "",
  remember: false
});

// 注册表单数据
const registerForm = reactive({
  username: "",
  account: "",
  password: "",
  confirmPassword: "",
  captcha: "",
  agree: false
});

// 忘记密码表单数据
const forgotForm = reactive({
  account: "",
  captcha: "",
  newPassword: "",
  confirmNewPassword: ""
});

// 表单错误状态
const loginErrors = reactive({
  account: { required: false, invalid: false },
  password: { required: false },
  captcha: { required: false }
});

const registerErrors = reactive({
  username: { required: false, invalid: false },
  account: { required: false, invalid: false },
  password: { required: false, invalid: false },
  confirmPassword: { required: false, invalid: false },
  captcha: { required: false },
  agree: { required: false }
});

const forgotErrors = reactive({
  account: { required: false, invalid: false },
  captcha: { required: false },
  newPassword: { required: false, invalid: false },
  confirmNewPassword: { required: false, invalid: false }
});

// 密码显示控制
const showLoginPassword = ref(false);
const showRegisterPassword = ref(false);
const showRegisterConfirmPassword = ref(false);
const showForgotNewPassword = ref(false);
const showForgotConfirmPassword = ref(false);

// 验证码倒计时
const loginCountdown = ref(0);
const registerCountdown = ref(0);
const forgotCountdown = ref(0);
let loginTimer = null;
let registerTimer = null;
let forgotTimer = null;

// 表单加载状态
const loginLoading = ref(false);
const registerLoading = ref(false);
const forgotLoading = ref(false);

// 密码强度
const passwordStrength = ref("");
const passwordStrengthText = ref("");

let sidebarTimeout = null;

// 计时器
let timer = null;

// 初始化练习内容
const initializePractice = () => {
  currentWordList.value = props.wordList;
  activeLineIndex.value = 0;
  
  // 重置计时器和统计数据
  startTime.value = null;
  totalChars.value = 0;
  cpsValue.value = 0;
  accuracyValue.value = "100%";
  timeValue.value = "0:00";
  
  // 延迟一下确保DOM已更新
  setTimeout(() => {
    const firstLine = document.querySelector(".line");
    if (firstLine) {
      highlightCurrentLine(firstLine);
    }
  }, 100);
};

// 高亮当前行
const highlightCurrentLine = (currentLine) => {
  // 移除所有行的高亮
  document.querySelectorAll(".line").forEach((line) => {
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

// 切换到特定行
const switchToLine = (clickedLine) => {
  // 获取当前激活的行
  const currentLine = document.querySelector(".line.active");

  // 如果点击的是当前行，不做任何操作
  if (currentLine === clickedLine) return;

  // 清空当前行的输入
  if (currentLine) {
    const currentInput = currentLine.querySelector(".inputWord");
    currentInput.value = "";
    const currentPlainText = currentLine.querySelector(".plain-text");
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

  // 聚焦新行的输入框
  const newInput = clickedLine.querySelector(".inputWord");
  setTimeout(() => {
    newInput.focus();
  }, 300);
};

// 处理输入事件
const handleInput = (e) => {
  let currInputEle = e.target;
  let currInputHiddenEle = currInputEle.previousElementSibling;
  let currPlainTextEle =
    currInputEle.parentElement.querySelector(".plain-text");

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
    const currentLine = currInputEle.closest(".line");
    // 不再添加completed类

    // 获取当前行的索引信息
    const currentKey = currentLine.getAttribute("data-key");
    if (currentKey) {
      const [groupIndex, lineIndex] = currentKey.split("-").map(Number);

      // 确定下一个句子的索引
      let nextGroupIndex = groupIndex;
      let nextLineIndex = lineIndex + 1;

      // 检查是否需要跳到下一组
      if (nextLineIndex >= allLines.value[groupIndex].length) {
        nextGroupIndex++;
        nextLineIndex = 0;
      }

      // 检查是否还有下一个句子
      if (nextGroupIndex < allLines.value.length) {
        // 找到下一个句子的DOM元素
        const nextLine = document.querySelector(
          `.line[data-key="${nextGroupIndex}-${nextLineIndex}"]`
        );
    if (nextLine) {
          let nextInput = nextLine.querySelector(".inputWord");

          // 滚动到下一行
      nextLine.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });

          // 高亮下一行
      highlightCurrentLine(nextLine);

      // 重置计时器
      resetTimer();

          // 更新活动行索引
          activeLineIndex.value = nextGroupIndex;

          // 短暂延迟后聚焦到下一行的输入框
      setTimeout(() => {
        nextInput.focus();
      }, 300);
        }
      } else {
        console.log("所有练习已完成");
      }
    } else {
      // 找不到索引信息，尝试使用旧方法
      // 找到下一行
      let nextLine = currentLine.nextElementSibling;
      if (nextLine) {
        let nextInput = nextLine.querySelector(".inputWord");

        // 滚动到下一行
        nextLine.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });

        // 高亮下一行
        highlightCurrentLine(nextLine);

        // 重置计时器
        resetTimer();

        // 短暂延迟后聚焦到下一行的输入框
        setTimeout(() => {
          nextInput.focus();
        }, 300);
      } else {
        console.log("当前组练习已完成");
      }
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

// 切换主题
const toggleTheme = () => {
  document.body.classList.toggle("dark-theme");
  localStorage.setItem(
    "theme",
    document.body.classList.contains("dark-theme") ? "dark" : "light"
  );
  currentTheme.value = localStorage.getItem("theme");
};

// 切换视图（打字练习/收藏单词）
const switchView = (view) => {
  activeView.value = view;
};

// 添加单词到收藏
const addWordToFavorite = (word) => {
  if (isLoggedIn.value && favoriteWordsRef.value) {
    favoriteWordsRef.value.addToFavorite(word);
    showToast('单词已添加到收藏');
  } else if (!isLoggedIn.value) {
    showToast('请先登录再收藏单词');
    toggleLoginModal();
  }
};

// 显示侧边栏
const showSidebar = () => {
  clearTimeout(sidebarTimeout);
  sidebarVisible.value = true;
  sidebarHintVisible.value = false;
};

// 隐藏侧边栏
const hideSidebar = () => {
  sidebarTimeout = setTimeout(() => {
    sidebarVisible.value = false;
    // 确保侧边栏完全隐藏后再显示提示
    setTimeout(() => {
      if (!sidebarVisible.value) {
        sidebarHintVisible.value = true;
      }
    }, 300);
  }, 300);
};

// 处理鼠标移动
const handleMouseMove = throttle((e) => {
  if (e.clientX <= 50) {
    // 鼠标距离左边界的触发距离
    showSidebar();
  } else if (
    e.clientX > 240 &&
    !document.querySelector(".sidebar")?.contains(e.target)
  ) {
    hideSidebar();
  }
}, 100);

// 切换登录模态框
const toggleLoginModal = () => {
  showLoginModal.value = !showLoginModal.value;
  if (showLoginModal.value) {
    currentForm.value = "login"; // 默认显示登录表单
  }
};

// 关闭登录模态框
const closeLoginModal = () => {
  showLoginModal.value = false;
};

// 切换表单类型
const switchForm = (formType) => {
  currentForm.value = formType;
};

// 显示提示消息
const showToast = (message, duration = 3000) => {
  toastMessage.value = message;
  setTimeout(() => {
    toastMessage.value = "";
  }, duration);
};

// 验证字段
const validateField = (formType, field) => {
  const form = formType === 'login' ? loginForm : 
               formType === 'register' ? registerForm : forgotForm;
  const errors = formType === 'login' ? loginErrors : 
                formType === 'register' ? registerErrors : forgotErrors;
  
  // 必填验证
  errors[field].required = !form[field];
  
  // 特定字段的验证逻辑
  if (field === 'username' && form[field]) {
    errors[field].invalid = form[field].length < 2 || form[field].length > 16;
  }
  
  if (field === 'password' && form[field]) {
    // 密码至少8位，包含字母和数字
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    errors[field].invalid = !passwordRegex.test(form[field]);
  }
  
  if (field === 'confirmPassword' && form[field]) {
    errors[field].invalid = form[field] !== form.password;
  }
  
  if (field === 'newPassword' && form[field]) {
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    errors[field].invalid = !passwordRegex.test(form[field]);
  }
  
  if (field === 'confirmNewPassword' && form[field]) {
    errors[field].invalid = form[field] !== form.newPassword;
  }
};

// 验证邮箱或手机号
const validateAccountField = (formType, field) => {
  const form = formType === 'login' ? loginForm : 
               formType === 'register' ? registerForm : forgotForm;
  const errors = formType === 'login' ? loginErrors : 
                formType === 'register' ? registerErrors : forgotErrors;
  
  if (!form[field]) {
    errors[field].required = true;
    errors[field].invalid = false;
    return;
  }
  
  errors[field].required = false;
  
  // 邮箱正则
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // 手机号正则 (简化版)
  const phoneRegex = /^1[3-9]\d{9}$/;
  
  errors[field].invalid = !(emailRegex.test(form[field]) || phoneRegex.test(form[field]));
};

// 验证密码强度
const validatePasswordStrength = (formType) => {
  const form = formType === 'register' ? registerForm : forgotForm;
  const password = formType === 'register' ? form.password : form.newPassword;
  
  if (!password) {
    passwordStrength.value = "";
    passwordStrengthText.value = "";
    return;
  }
  
  // 弱密码：长度小于8或者只有数字/字母
  if (password.length < 8 || /^\d+$/.test(password) || /^[a-zA-Z]+$/.test(password)) {
    passwordStrength.value = "weak";
    passwordStrengthText.value = "密码强度：弱";
    return;
  }
  
  // 强密码：长度大于12，且包含大小写字母、数字和特殊字符
  const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{12,}$/;
  if (strongRegex.test(password)) {
    passwordStrength.value = "strong";
    passwordStrengthText.value = "密码强度：强";
    return;
  }
  
  // 中等密码：其他情况
  passwordStrength.value = "medium";
  passwordStrengthText.value = "密码强度：中";
};

// 验证两次密码是否一致
const validatePasswordMatch = (formType) => {
  const form = formType === 'register' ? registerForm : forgotForm;
  const errors = formType === 'register' ? registerErrors : forgotErrors;
  
  if (formType === 'register') {
    if (!form.confirmPassword) return;
    errors.confirmPassword.invalid = form.password !== form.confirmPassword;
  } else {
    if (!form.confirmNewPassword) return;
    errors.confirmNewPassword.invalid = form.newPassword !== form.confirmNewPassword;
  }
};

// 后端API地址
const API_BASE_URL = 'http://localhost:5500/api';

// 发送验证码
const sendCaptcha = async (formType) => {
  const form = formType === 'login' ? loginForm : 
               formType === 'register' ? registerForm : forgotForm;
  const errors = formType === 'login' ? loginErrors : 
                formType === 'register' ? registerErrors : forgotErrors;
  const loading = formType === 'login' ? loginLoading : 
                 formType === 'register' ? registerLoading : forgotLoading;
  
  // 验证账号
  validateAccountField(formType, 'account');
  if (errors.account.required || errors.account.invalid) {
    showToast('请输入正确的邮箱或手机号');
    return;
  }
  
  loading.value = true;
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/send-captcha`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ account: form.account })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast(data.message);
      
      // 开始倒计时
      const countdown = formType === 'login' ? loginCountdown : 
                       formType === 'register' ? registerCountdown : forgotCountdown;
      countdown.value = 60;
      
      // 清除之前的计时器
      if (formType === 'login') {
        clearInterval(loginTimer);
        loginTimer = setInterval(() => {
          countdown.value--;
          if (countdown.value <= 0) {
            clearInterval(loginTimer);
          }
        }, 1000);
      } else if (formType === 'register') {
        clearInterval(registerTimer);
        registerTimer = setInterval(() => {
          countdown.value--;
          if (countdown.value <= 0) {
            clearInterval(registerTimer);
          }
        }, 1000);
      } else {
        clearInterval(forgotTimer);
        forgotTimer = setInterval(() => {
          countdown.value--;
          if (countdown.value <= 0) {
            clearInterval(forgotTimer);
          }
        }, 1000);
      }
    } else {
      showToast(data.message);
    }
  } catch (error) {
    console.error('发送验证码出错:', error);
    showToast('发送验证码失败，请检查网络连接');
  } finally {
    loading.value = false;
  }
};

// 处理登录表单提交
const handleLoginSubmit = async () => {
  // 验证所有字段
  validateField('login', 'account');
  validateField('login', 'password');
  validateField('login', 'captcha');
  
  // 检查是否有错误
  if (loginErrors.account.required || loginErrors.account.invalid ||
      loginErrors.password.required ||
      loginErrors.captcha.required) {
    showToast('请填写正确的登录信息');
    return;
  }
  
  loginLoading.value = true;
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account: loginForm.account,
        password: loginForm.password,
        captcha: loginForm.captcha
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // 登录成功
      isLoggedIn.value = true;
      currentUser.value = {
        username: data.data.username,
        displayName: data.data.username,
        avatar: null,
        id: data.data.id,
        account: data.data.account
      };
      
      // 如果选择了"记住我"，将用户信息保存到localStorage
      if (loginForm.remember) {
        localStorage.setItem("user", JSON.stringify(currentUser.value));
        localStorage.setItem("isLoggedIn", "true");
      }
      
      // 通知父组件登录状态变化
      emit('login-status-change', true, currentUser.value);
      
      showToast(data.message);
      closeLoginModal();
      
      // 重置表单
      loginForm.account = "";
      loginForm.password = "";
      loginForm.captcha = "";
      loginForm.remember = false;
    } else {
      // 登录失败
      showToast(data.message);
    }
  } catch (error) {
    console.error('登录出错:', error);
    showToast('登录失败，请检查网络连接');
  } finally {
    loginLoading.value = false;
  }
};

// 处理注册表单提交
const handleRegisterSubmit = async () => {
  // 验证所有字段
  validateField('register', 'username');
  validateField('register', 'account');
  validateField('register', 'password');
  validateField('register', 'confirmPassword');
  validateField('register', 'captcha');
  
  // 检查是否有错误
  if (registerErrors.username.required || registerErrors.username.invalid ||
      registerErrors.account.required || registerErrors.account.invalid ||
      registerErrors.password.required || registerErrors.password.invalid ||
      registerErrors.confirmPassword.required || registerErrors.confirmPassword.invalid ||
      registerErrors.captcha.required ||
      !registerForm.agree) {
    showToast('请填写正确的注册信息并同意用户协议');
    return;
  }
  
  registerLoading.value = true;
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: registerForm.username,
        account: registerForm.account,
        password: registerForm.password,
        confirmPassword: registerForm.confirmPassword,
        captcha: registerForm.captcha
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast(data.message);
      switchForm('login');
      
      // 重置表单
      registerForm.username = "";
      registerForm.account = "";
      registerForm.password = "";
      registerForm.confirmPassword = "";
      registerForm.captcha = "";
      registerForm.agree = false;
    } else {
      showToast(data.message);
    }
  } catch (error) {
    console.error('注册出错:', error);
    showToast('注册失败，请检查网络连接');
  } finally {
    registerLoading.value = false;
  }
};

// 处理忘记密码表单提交
const handleForgotSubmit = async () => {
  // 验证所有字段
  validateField('forgot', 'account');
  validateField('forgot', 'captcha');
  validateField('forgot', 'newPassword');
  validateField('forgot', 'confirmNewPassword');
  
  // 检查是否有错误
  if (forgotErrors.account.required || forgotErrors.account.invalid ||
      forgotErrors.captcha.required ||
      forgotErrors.newPassword.required || forgotErrors.newPassword.invalid ||
      forgotErrors.confirmNewPassword.required || forgotErrors.confirmNewPassword.invalid) {
    showToast('请填写正确的信息');
    return;
  }
  
  forgotLoading.value = true;
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account: forgotForm.account,
        captcha: forgotForm.captcha,
        newPassword: forgotForm.newPassword,
        confirmNewPassword: forgotForm.confirmNewPassword
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast(data.message);
      switchForm('login');
      
      // 重置表单
      forgotForm.account = "";
      forgotForm.captcha = "";
      forgotForm.newPassword = "";
      forgotForm.confirmNewPassword = "";
    } else {
      showToast(data.message);
    }
  } catch (error) {
    console.error('修改密码出错:', error);
    showToast('修改密码失败，请检查网络连接');
  } finally {
    forgotLoading.value = false;
  }
};

// 处理登出
const handleLogout = () => {
  isLoggedIn.value = false;
  currentUser.value = null;
  localStorage.removeItem("user");
  localStorage.removeItem("isLoggedIn");
  showToast('已退出登录');
  
  // 通知父组件登录状态变化
  emit('login-status-change', false, null);
};

// 检查是否已登录
const checkLoginStatus = () => {
  const savedLoginStatus = localStorage.getItem("isLoggedIn");
  const savedUser = localStorage.getItem("user");

  if (savedLoginStatus === "true" && savedUser) {
    isLoggedIn.value = true;
    currentUser.value = JSON.parse(savedUser);
    
    // 通知父组件登录状态变化
    emit('login-status-change', true, currentUser.value);
  }
};

// 生成练习行
const generateLine = (lineWords, index) => {
  let startIndex = 0;
  // 计算之前所有组的单词总数
  if (Array.isArray(props.wordList[0])) {
    // 二维数组结构（六级.js）
    for (let i = 0; i < index; i++) {
      startIndex += props.wordList[i].length;
    }
  } else {
    // 一维数组结构（四级.js）
    startIndex = index;
    // 将lineWords转换为数组格式
    lineWords = [lineWords];
  }

  return lineWords.map((item, wordIndex) => {
    const totalIndex = startIndex + wordIndex + 1;
    return {
      index: totalIndex,
      sentence: item.sentence,
      translation: item.translation,
    };
  });
};

// 计算所有行
const allLines = computed(() => {
  if (!props.wordList || props.wordList.length === 0) return [];
  
  return props.wordList.map((lineWords, index) => {
    return generateLine(lineWords, index);
  });
});

// 滚动到当前行
const scrollToCurrent = () => {
  if (activeLine.value) {
    activeLine.value.scrollIntoView({
      behavior: "smooth",
      block: "start",
      inline: "nearest",
    });
  }
};

// 节流函数
function throttle(func, delay) {
  let lastCall = 0;
  return function (...args) {
    const now = new Date().getTime();
    if (now - lastCall >= delay) {
      lastCall = now;
      func.apply(this, args);
    }
  };
}

// 监听滚动事件以显示/隐藏回到当前按钮
const toggleScrollButton = () => {
  const scrollPosition = window.scrollY;
  if (scrollPosition > 200) {
    document.getElementById("scrollToCurrent")?.classList.add("visible");
  } else {
    document.getElementById("scrollToCurrent")?.classList.remove("visible");
  }
};

// 组件挂载后执行
onMounted(() => {
  // 检查本地存储的主题设置
  if (currentTheme.value === "dark") {
    document.body.classList.add("dark-theme");
  } else if (currentTheme.value === "light") {
    document.body.classList.remove("dark-theme");
  }
  
  // 初始化练习
  initializePractice();

  // 检查登录状态
  checkLoginStatus();
  
  // 监听滚动事件
  window.addEventListener("scroll", throttle(toggleScrollButton, 300));
  
  // 监听系统主题变化
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", (e) => {
      if (!localStorage.getItem("theme")) {
      if (e.matches) {
          document.body.classList.add("dark-theme");
      } else {
          document.body.classList.remove("dark-theme");
      }
    }
  });

  // 监听鼠标移动
  document.addEventListener("mousemove", handleMouseMove);

  // 初始化时显示侧边栏提示
  setTimeout(() => {
    sidebarHintVisible.value = true;
  }, 2000);
  
  // 监听ESC键关闭登录模态框
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && showLoginModal.value) {
      closeLoginModal();
    }
  });
  
  // 点击模态框外部关闭模态框
  document.addEventListener("click", (e) => {
    const modal = document.querySelector(".login-modal");
    const modalContent = document.querySelector(".login-modal-content");
    if (
      showLoginModal.value &&
      modal &&
      modalContent && 
      !modalContent.contains(e.target) &&
      modal.contains(e.target)
    ) {
      closeLoginModal();
    }
  });
});

// 组件卸载时清理事件监听和定时器
onUnmounted(() => {
  window.removeEventListener("scroll", throttle(toggleScrollButton, 300));
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("keydown", (e) => {
    if (e.key === "Escape" && showLoginModal.value) {
      closeLoginModal();
    }
  });
  clearTimeout(sidebarTimeout);
  
  // 清除验证码倒计时
  clearInterval(loginTimer);
  clearInterval(registerTimer);
  clearInterval(forgotTimer);
});
</script>

<template>
  <div class="typing-practice">
    <header>
      <div class="header-container">
        <h2>「打字练习」</h2>
        
        <!-- 导航菜单 -->
        <div class="nav-tabs">
          <button 
            class="nav-tab" 
            :class="{ active: activeView === 'practice' }"
            @click="switchView('practice')"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" 
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            打字练习
          </button>
            <button 
              class="nav-tab" 
              :class="{ active: activeView === 'favorites' }"
              @click="isLoggedIn ? switchView('favorites') : toggleLoginModal()"
              :title="!isLoggedIn ? '请先登录' : '查看收藏单词'"
            >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" 
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            收藏单词
          </button>
        </div>
        
        <div class="typing-stats" v-if="activeView === 'practice'">
          <span class="stat-item">
            <svg
              class="stat-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
              <span class="stat-label">速度</span>
              <span class="stat-value" id="cpsValue">{{ cpsValue }}</span>
              <span class="stat-unit">字/秒</span>
          </span>
          
          <span class="stat-item">
            <svg
              class="stat-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                d="M22 11.08V12a10 10 0 1 1-5.93-9.14"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <polyline
                points="22 4 12 14.01 9 11.01"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
              <span class="stat-label">准确率</span>
            <span class="stat-value" id="accuracyValue">{{
              accuracyValue
            }}</span>
          </span>
          
          <span class="stat-item">
            <svg
              class="stat-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <polyline
                points="12 6 12 12 16 14"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
              <span class="stat-label">用时</span>
              <span class="stat-value" id="timeValue">{{ timeValue }}</span>
          </span>
        </div>
        
        <div class="header-actions">
          <template v-if="!isLoggedIn">
          <button class="login-button" @click="toggleLoginModal">
              <svg
                class="login-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <circle
                  cx="12"
                  cy="7"
                  r="4"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
            </svg>
            <span>登录</span>
          </button>
          </template>
          <template v-else>
            <div class="user-profile">
              <div class="user-avatar">
                <svg
                  v-if="!currentUser?.avatar"
                  class="avatar-placeholder"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <circle
                    cx="12"
                    cy="7"
                    r="4"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <img v-else :src="currentUser.avatar" alt="用户头像" />
              </div>
              <div class="user-info">
                <span class="user-name">{{
                  currentUser?.displayName || currentUser?.username
                }}</span>
                <button class="logout-button" @click="handleLogout">
                  退出
                </button>
              </div>
            </div>
          </template>
        </div>
      </div>
    </header>

    <main class="main-content">
      <!-- 打字练习视图 -->
      <section id="box" ref="box" v-show="activeView === 'practice'">
        <div
          v-for="(lineGroup, groupIndex) in allLines"
          :key="groupIndex"
          class="line-group"
        >
          <div
            v-for="(line, lineIndex) in lineGroup"
            :key="`${groupIndex}-${lineIndex}`"
            class="line"
            :class="{
              active: activeLineIndex === groupIndex && lineIndex === 0,
            }"
            :data-key="`${groupIndex}-${lineIndex}`"
            @click="switchToLine($event.currentTarget)"
          >
            <div class="text">
              <div class="word-container">
                <div class="word-item">
                  <span class="word-index">{{ line.index }}.</span>
                  <span class="eng-word">{{ line.sentence }}</span>
                  <span class="translate">{{ line.translation }}</span>
                  <button 
                    class="favorite-btn star-btn" 
                    @click.stop="addWordToFavorite(line)"
                    :title="isLoggedIn ? '收藏单词' : '请先登录'"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div class="plain-text" :data-original-text="line.sentence">
              {{ line.sentence }}
            </div>
            <input class="inputHidden" type="hidden" :value="line.sentence" />
            <textarea
              class="inputWord"
              rows="1"
              autocomplete="off"
              spellcheck="false"
              @input="handleInput"
            ></textarea>
          </div>
        </div>
      </section>
      
      <!-- 收藏单词视图 -->
      <section v-show="activeView === 'favorites'" class="favorites-container">
        <FavoriteWords 
          ref="favoriteWordsRef"
          :isLoggedIn="isLoggedIn" 
          :currentUser="currentUser" 
        />
      </section>
    </main>

    <button
      class="theme-toggle"
      id="themeToggle"
      aria-label="切换主题"
      @click="toggleTheme"
    >
      <svg
        class="sun-icon"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
      >
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>
      <svg
        class="moon-icon"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
    </button>

    <button
      class="scroll-to-current"
      id="scrollToCurrent"
      aria-label="回到当前单词"
      @click="scrollToCurrent"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
      >
        <polyline points="18 15 12 9 6 15"></polyline>
      </svg>
    </button>

    <!-- 侧边栏菜单 -->
    <div
      class="sidebar"
      :class="{ visible: sidebarVisible }"
         @mouseenter="showSidebar"
      @mouseleave="hideSidebar"
    >
      <div class="sidebar-content">
        <div class="sidebar-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 20V4" stroke-width="2" stroke-linecap="round" />
            <path d="M4 12h16" stroke-width="2" stroke-linecap="round" />
          </svg>
          选择练习
        </div>
        <div class="practice-list">
          <slot name="practice-list"></slot>
        </div>
      </div>
    </div>

    <!-- 侧边栏触发区域 -->
    <div
      class="sidebar-trigger-hint"
      :class="{ visible: sidebarHintVisible }"
      @mouseenter="showSidebar"
    ></div>

    <!-- 提示框 -->
    <div class="toast" v-if="toastMessage" v-text="toastMessage"></div>
         
    <!-- 登录模态框 -->
    <div class="login-modal" v-if="showLoginModal">
      <div class="form login-modal-content" :id="currentForm + 'form'">
        <!-- 登录表单 -->
        <div v-show="currentForm === 'login'">
          <h1>登录 <a href="#" class="close-btn" @click.prevent="closeLoginModal">✕</a></h1>
          <form novalidate @submit.prevent="handleLoginSubmit">
            <div class="account">
              <label for="login-account">邮箱/手机号<span>*</span> </label>
              <input class="input" required type="text" id="login-account" 
                    v-model="loginForm.account" 
                    @blur="validateField('login', 'account')"
                    @input="validateAccountField('login', 'account')"/>
              <span class="validation error" v-if="loginErrors.account.invalid">请输入正确的邮箱或手机号</span>
              <span class="validation req" v-if="loginErrors.account.required">邮箱或手机号不能为空</span>
            </div>
            <div class="password">
              <label for="login-password">密码 <span>*</span></label>
              <div class="password-container">
                <input class="input" required 
                      :type="showLoginPassword ? 'text' : 'password'" 
                      id="login-password" 
                      v-model="loginForm.password"
                      @blur="validateField('login', 'password')"/>
                <button type="button" class="toggle-password" 
                      @click="showLoginPassword = !showLoginPassword">
                  {{ showLoginPassword ? '隐藏' : '显示' }}
          </button>
        </div>
              <span class="validation req" v-if="loginErrors.password.required">密码不能为空</span>
          </div>
            <div class="captcha">
              <label for="login-captcha">验证码 <span>*</span></label>
              <div class="captcha-container">
                <input class="input captcha-input" required type="text" id="login-captcha" 
                      v-model="loginForm.captcha"
                      @blur="validateField('login', 'captcha')"/>
                <button type="button" class="get-captcha-btn" 
                      :disabled="loginCountdown > 0 || loginLoading"
                      :class="{ loading: loginLoading }"
                      @click="sendCaptcha('login')">
                  {{ loginCountdown > 0 ? `${loginCountdown}秒后重新获取` : '获取验证码' }}
                </button>
          </div>
              <span class="validation req" v-if="loginErrors.captcha.required">请输入验证码</span>
          </div>
            <div class="remember">
              <input class="checkbox" type="checkbox" id="remember" v-model="loginForm.remember" />
              <label for="remember"> 记住我</label>
              <a href="#" class="forgot-password" @click.prevent="switchForm('forgot')">修改密码</a>
            </div>
            <div class="login">
              <input type="submit" value="登录" :disabled="loginLoading" :class="{ loading: loginLoading }" />
            </div>
            <div class="switch-form">
              还没有账号？<a href="#" @click.prevent="switchForm('register')">立即注册</a>
            </div>
        </form>
      </div>
        
        <!-- 忘记密码表单 -->
        <div v-show="currentForm === 'forgot'">
          <h1>修改密码 <a href="#" class="close-btn" @click.prevent="closeLoginModal">✕</a></h1>
          <form novalidate @submit.prevent="handleForgotSubmit">
            <div class="account">
              <label for="forgot-account">邮箱/手机号<span>*</span> </label>
              <input class="input" required type="text" id="forgot-account" 
                    v-model="forgotForm.account"
                    @blur="validateField('forgot', 'account')"
                    @input="validateAccountField('forgot', 'account')"/>
              <span class="validation error" v-if="forgotErrors.account.invalid">请输入正确的邮箱或手机号</span>
              <span class="validation req" v-if="forgotErrors.account.required">邮箱或手机号不能为空</span>
            </div>
            <div class="captcha">
              <label for="forgot-captcha">验证码 <span>*</span></label>
              <div class="captcha-container">
                <input class="input captcha-input" required type="text" id="forgot-captcha" 
                      v-model="forgotForm.captcha"
                      @blur="validateField('forgot', 'captcha')"/>
                <button type="button" class="get-captcha-btn" 
                      :disabled="forgotCountdown > 0 || forgotLoading"
                      :class="{ loading: forgotLoading }"
                      @click="sendCaptcha('forgot')">
                  {{ forgotCountdown > 0 ? `${forgotCountdown}秒后重新获取` : '获取验证码' }}
                </button>
              </div>
              <span class="validation req" v-if="forgotErrors.captcha.required">请输入验证码</span>
            </div>
            <div class="password">
              <label for="new-password">新密码<span>*</span></label>
              <div class="password-container">
                <input class="input" required 
                      :type="showForgotNewPassword ? 'text' : 'password'" 
                      id="new-password" 
                      v-model="forgotForm.newPassword"
                      @blur="validateField('forgot', 'newPassword'); validatePasswordStrength('forgot'); validatePasswordMatch('forgot')"
                      @input="validatePasswordStrength('forgot'); validatePasswordMatch('forgot')"/>
                <button type="button" class="toggle-password" 
                      @click="showForgotNewPassword = !showForgotNewPassword">
                  {{ showForgotNewPassword ? '隐藏' : '显示' }}
                </button>
              </div>
              <span class="validation req" v-if="forgotErrors.newPassword.required">新密码不能为空</span>
              <span class="validation error" v-if="forgotErrors.newPassword.invalid">密码至少8位，包含字母和数字</span>
              <div class="password-strength" v-if="forgotForm.newPassword">
                <span :class="{
                  'strength-weak': passwordStrength === 'weak',
                  'strength-medium': passwordStrength === 'medium',
                  'strength-strong': passwordStrength === 'strong'
                }">
                  {{ passwordStrengthText }}
                </span>
              </div>
            </div>
            <div class="password">
              <label for="confirm-new-password">确认新密码<span>*</span></label>
              <div class="password-container">
                <input class="input" required 
                      :type="showForgotConfirmPassword ? 'text' : 'password'" 
                      id="confirm-new-password" 
                      v-model="forgotForm.confirmNewPassword"
                      @blur="validateField('forgot', 'confirmNewPassword'); validatePasswordMatch('forgot')"
                      @input="validatePasswordMatch('forgot')"/>
                <button type="button" class="toggle-password" 
                      @click="showForgotConfirmPassword = !showForgotConfirmPassword">
                  {{ showForgotConfirmPassword ? '隐藏' : '显示' }}
                </button>
              </div>
              <span class="validation req" v-if="forgotErrors.confirmNewPassword.required">请确认新密码</span>
              <span class="validation error" v-if="forgotErrors.confirmNewPassword.invalid">两次输入的密码不一致</span>
            </div>
            <div class="login">
              <input type="submit" value="修改密码" :disabled="forgotLoading" :class="{ loading: forgotLoading }" />
            </div>
            <div class="switch-form">
              <a href="#" @click.prevent="switchForm('login')">返回登录</a>
            </div>
          </form>
        </div>
        
        <!-- 注册表单 -->
        <div v-show="currentForm === 'register'">
          <h1>注册 <a href="#" class="close-btn" @click.prevent="closeLoginModal">✕</a></h1>
          <form novalidate @submit.prevent="handleRegisterSubmit">
            <div class="username">
              <label for="register-username">用户名<span>*</span></label>
              <input class="input" required type="text" id="register-username" 
                    v-model="registerForm.username"
                    @blur="validateField('register', 'username')"/>
              <span class="validation req" v-if="registerErrors.username.required">用户名不能为空</span>
              <span class="validation error" v-if="registerErrors.username.invalid">用户名长度为2-16位</span>
            </div>
            <div class="account">
              <label for="register-account">邮箱/手机号<span>*</span></label>
              <input class="input" required type="text" id="register-account" 
                    v-model="registerForm.account"
                    @blur="validateField('register', 'account')"
                    @input="validateAccountField('register', 'account')"/>
              <span class="validation error" v-if="registerErrors.account.invalid">请输入正确的邮箱或手机号</span>
              <span class="validation req" v-if="registerErrors.account.required">邮箱或手机号不能为空</span>
            </div>
            <div class="password">
              <label for="register-password">密码<span>*</span></label>
              <div class="password-container">
                <input class="input" required 
                      :type="showRegisterPassword ? 'text' : 'password'" 
                      id="register-password" 
                      v-model="registerForm.password"
                      @blur="validateField('register', 'password'); validatePasswordStrength('register'); validatePasswordMatch('register')"
                      @input="validatePasswordStrength('register'); validatePasswordMatch('register')"/>
                <button type="button" class="toggle-password" 
                      @click="showRegisterPassword = !showRegisterPassword">
                  {{ showRegisterPassword ? '隐藏' : '显示' }}
                </button>
              </div>
              <span class="validation req" v-if="registerErrors.password.required">密码不能为空</span>
              <span class="validation error" v-if="registerErrors.password.invalid">密码至少8位，包含字母和数字</span>
              <div class="password-strength" v-if="registerForm.password">
                <span :class="{
                  'strength-weak': passwordStrength === 'weak',
                  'strength-medium': passwordStrength === 'medium',
                  'strength-strong': passwordStrength === 'strong'
                }">
                  {{ passwordStrengthText }}
                </span>
              </div>
            </div>
            <div class="password">
              <label for="register-confirm-password">确认密码<span>*</span></label>
              <div class="password-container">
                <input class="input" required 
                      :type="showRegisterConfirmPassword ? 'text' : 'password'" 
                      id="register-confirm-password" 
                      v-model="registerForm.confirmPassword"
                      @blur="validateField('register', 'confirmPassword'); validatePasswordMatch('register')"
                      @input="validatePasswordMatch('register')"/>
                <button type="button" class="toggle-password" 
                      @click="showRegisterConfirmPassword = !showRegisterConfirmPassword">
                  {{ showRegisterConfirmPassword ? '隐藏' : '显示' }}
                </button>
              </div>
              <span class="validation req" v-if="registerErrors.confirmPassword.required">请确认密码</span>
              <span class="validation error" v-if="registerErrors.confirmPassword.invalid">两次输入的密码不一致</span>
            </div>
            <div class="captcha">
              <label for="register-captcha">验证码 <span>*</span></label>
              <div class="captcha-container">
                <input class="input captcha-input" required type="text" id="register-captcha" 
                      v-model="registerForm.captcha"
                      @blur="validateField('register', 'captcha')"/>
                <button type="button" class="get-captcha-btn" 
                      :disabled="registerCountdown > 0 || registerLoading"
                      :class="{ loading: registerLoading }"
                      @click="sendCaptcha('register')">
                  {{ registerCountdown > 0 ? `${registerCountdown}秒后重新获取` : '获取验证码' }}
                </button>
              </div>
              <span class="validation req" v-if="registerErrors.captcha.required">请输入验证码</span>
            </div>
            <div class="agreement">
              <input class="checkbox" type="checkbox" id="agree" v-model="registerForm.agree" />
              <label for="agree"> 我已阅读并同意<a href="#" class="agreement-link">《用户协议》</a>和<a href="#" class="agreement-link">《隐私政策》</a></label>
              <span class="validation req" v-if="registerErrors.agree.required">请同意用户协议和隐私政策</span>
            </div>
            <div class="login">
              <input type="submit" value="注册" :disabled="registerLoading" :class="{ loading: registerLoading }" />
            </div>
            <div class="switch-form">
              已有账号？<a href="#" @click.prevent="switchForm('login')">立即登录</a>
            </div>
            
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
