<template>
  <div class="register-container">
    <n-card class="register-card">
      <template #header>
        <div class="text-center">
          <n-h1>註冊帳號</n-h1>
          <n-text depth="3">創建您的帳戶以開始使用</n-text>
        </div>
      </template>

      <n-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        @submit.prevent="handleSubmit"
      >
        <n-form-item label="用戶名" path="username">
          <n-input
            v-model:value="formData.username"
            placeholder="請輸入用戶名"
          />
        </n-form-item>

        <n-form-item label="電子郵箱" path="email">
          <n-input
            v-model:value="formData.email"
            placeholder="請輸入電子郵箱"
          />
        </n-form-item>

        <n-form-item label="全名" path="full_name">
          <n-input
            v-model:value="formData.full_name"
            placeholder="請輸入您的全名"
          />
        </n-form-item>

        <n-form-item label="密碼" path="password">
          <n-input
            v-model:value="formData.password"
            type="password"
            placeholder="請輸入密碼"
            show-password-on="click"
          />
        </n-form-item>

        <n-form-item label="確認密碼" path="confirmPassword">
          <n-input
            v-model:value="formData.confirmPassword"
            type="password"
            placeholder="請再次輸入密碼"
            show-password-on="click"
          />
        </n-form-item>

        <div class="action-buttons">
          <n-button
            type="primary"
            attr-type="submit"
            :loading="loading"
            block
          >
            註冊
          </n-button>
          
          <div class="mt-4 text-center">
            <n-text depth="3">
              已有帳號？
              <n-button text type="primary" @click="router.push('/login')">
                立即登入
              </n-button>
            </n-text>
          </div>
        </div>
      </n-form>
    </n-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { AUTH_API } from '@/api';

const router = useRouter();
const message = useMessage();
const formRef = ref(null);
const loading = ref(false);

const formData = reactive({
  username: '',
  email: '',
  full_name: '',
  password: '',
  confirmPassword: ''
});

const rules = {
  username: [
    { required: true, message: '請輸入用戶名', trigger: 'blur' },
    { min: 3, message: '用戶名至少需要 3 個字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '請輸入電子郵箱', trigger: 'blur' },
    { type: 'email', message: '請輸入有效的電子郵箱', trigger: 'blur' }
  ],
  full_name: [
    { required: true, message: '請輸入您的全名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '請輸入密碼', trigger: 'blur' },
    { min: 6, message: '密碼至少需要 6 個字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '請確認密碼', trigger: 'blur' },
    {
      validator: (rule, value) => {
        return value === formData.password || new Error('兩次輸入的密碼不一致');
      },
      trigger: 'blur'
    }
  ]
};

const handleSubmit = async () => {
  try {
    await formRef.value?.validate();
    loading.value = true;
    const { username, email, full_name, password, confirmPassword } = formData;

    await AUTH_API.register({
      username,
      email,
      full_name,
      password1: password,
      password2: confirmPassword
    });
    message.success('註冊成功！');
    router.push('/login');
  } catch (error) {
    console.error('註冊失敗:', error);
    if (error.response?.data) {
      const errorData = error.response.data;
      if (typeof errorData === 'object') {
        // 處理字段錯誤
        Object.entries(errorData).forEach(([field, messages]) => {
          if (Array.isArray(messages)) {
            message.error(`${field}: ${messages.join(', ')}`);
          } else if (typeof messages === 'string') {
            message.error(`${field}: ${messages}`);
          }
        });
      } else {
        message.error(errorData.toString());
      }
    } else {
      message.error('註冊失敗，請稍後重試');
    }
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.register-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background-color: #f5f7fa;
}

.register-card {
  width: 100%;
  max-width: 420px;
}

.action-buttons {
  margin-top: 24px;
}

.mt-4 {
  margin-top: 16px;
}

.text-center {
  text-align: center;
}
</style> 