const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const crypto = require('crypto');

// 初始化Express应用
const app = express();
const PORT = process.env.PORT || 5500;

// 中间件配置
app.use(cors({
  origin: "*", // 允许所有来源访问，方便本地开发
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 模拟数据库存储
const users = []; // 存储用户信息 { id, username, account, password, createdAt }
const captchas = new Map(); // 存储验证码 { account: { code, expireTime } }

// 生成6位数字验证码
const generateCaptcha = () => Math.floor(100000 + Math.random() * 900000).toString();

// 密码加密（SHA256）
const encryptPassword = (password) => {
  const hash = crypto.createHash('sha256');
  hash.update(password);
  return hash.digest('hex');
};

// 用户查询工具函数
const userExists = (account) => users.some(user => user.account === account);
const findUser = (account) => users.find(user => user.account === account);

// 发送验证码接口
app.post('/api/auth/send-captcha', (req, res) => {
  try {
    const { account } = req.body;
    if (!account) {
      return res.status(400).json({ success: false, message: '请提供邮箱或手机号' });
    }

    // 验证账号格式（匹配前端验证规则）
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phonePattern = /^1[3-9][0-9]{9}$/;
    if (!emailPattern.test(account) && !phonePattern.test(account)) {
      return res.status(400).json({ success: false, message: '请输入正确的邮箱或手机号' });
    }

    // 生成并存储验证码（5分钟有效期）
    const captchaCode = generateCaptcha();
    captchas.set(account, {
      code: captchaCode,
      expireTime: Date.now() + 5 * 60 * 1000
    });

    // 模拟发送（实际项目中替换为短信/邮件服务）
    console.log(`向 ${account} 发送验证码: ${captchaCode}`);

    res.json({
      success: true,
      message: '验证码已发送，5分钟内有效'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '发送验证码失败，请重试' });
  }
});

// 注册接口
app.post('/api/auth/register', (req, res) => {
  try {
    const { username, account, password, captcha, confirmPassword } = req.body;

    // 基础验证
    if (!username || !account || !password || !captcha || !confirmPassword) {
      return res.status(400).json({ success: false, message: '请填写完整信息' });
    }

    // 密码一致性验证
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: '两次输入的密码不一致' });
    }

    // 账号存在验证
    if (userExists(account)) {
      return res.status(400).json({ success: false, message: '该账号已被注册' });
    }

    // 验证码验证
    const storedCaptcha = captchas.get(account);
    if (!storedCaptcha) {
      return res.status(400).json({ success: false, message: '请先获取验证码' });
    }
    if (storedCaptcha.code !== captcha) {
      return res.status(400).json({ success: false, message: '验证码错误' });
    }
    if (Date.now() > storedCaptcha.expireTime) {
      captchas.delete(account);
      return res.status(400).json({ success: false, message: '验证码已过期，请重新获取' });
    }

    // 创建用户
    users.push({
      id: Date.now().toString(),
      username,
      account,
      password: encryptPassword(password),
      createdAt: new Date()
    });
    captchas.delete(account); // 清除已使用的验证码

    res.json({ success: true, message: '注册成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '注册失败，请重试' });
  }
});

// 登录接口
app.post('/api/auth/login', (req, res) => {
  try {
    const { account, password, captcha } = req.body;

    // 基础验证
    if (!account || !password || !captcha) {
      return res.status(400).json({ success: false, message: '请填写完整信息' });
    }

    // 验证码验证
    const storedCaptcha = captchas.get(account);
    if (!storedCaptcha) {
      return res.status(400).json({ success: false, message: '请先获取验证码' });
    }
    if (storedCaptcha.code !== captcha) {
      return res.status(400).json({ success: false, message: '验证码错误' });
    }
    if (Date.now() > storedCaptcha.expireTime) {
      captchas.delete(account);
      return res.status(400).json({ success: false, message: '验证码已过期，请重新获取' });
    }

    // 用户验证
    const user = findUser(account);
    if (!user) {
      return res.status(400).json({ success: false, message: '账号不存在' });
    }
    if (user.password !== encryptPassword(password)) {
      return res.status(400).json({ success: false, message: '密码错误' });
    }

    captchas.delete(account); // 清除已使用的验证码

    res.json({
      success: true,
      message: '登录成功',
      data: {
        id: user.id,
        username: user.username,
        account: user.account
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '登录失败，请重试' });
  }
});

// 修改密码接口
app.post('/api/auth/forgot-password', (req, res) => {
  try {
    const { account, captcha, newPassword, confirmNewPassword } = req.body;

    // 基础验证
    if (!account || !captcha || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ success: false, message: '请填写完整信息' });
    }

    // 密码一致性验证
    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ success: false, message: '两次输入的密码不一致' });
    }

    // 用户存在验证
    const user = findUser(account);
    if (!user) {
      return res.status(400).json({ success: false, message: '账号不存在' });
    }

    // 验证码验证
    const storedCaptcha = captchas.get(account);
    if (!storedCaptcha) {
      return res.status(400).json({ success: false, message: '请先获取验证码' });
    }
    if (storedCaptcha.code !== captcha) {
      return res.status(400).json({ success: false, message: '验证码错误' });
    }
    if (Date.now() > storedCaptcha.expireTime) {
      captchas.delete(account);
      return res.status(400).json({ success: false, message: '验证码已过期，请重新获取' });
    }

    // 更新密码
    user.password = encryptPassword(newPassword);
    captchas.delete(account);

    res.json({ success: true, message: '密码修改成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '修改密码失败，请重试' });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log('可用接口:');
  console.log('  POST /api/auth/send-captcha - 发送验证码');
  console.log('  POST /api/auth/register - 用户注册');
  console.log('  POST /api/auth/login - 用户登录');
  console.log('  POST /api/auth/forgot-password - 修改密码');
});