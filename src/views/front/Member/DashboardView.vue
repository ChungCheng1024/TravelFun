<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import axios from 'axios';
import { NButton, NForm, NFormItem, NInput, NMessageProvider, useMessage } from 'naive-ui';
import type { UploadFileInfo } from 'naive-ui';
import { useUserStore } from '@/stores/user';
import { request } from '@/utils/request';

// 獲取 API 基礎 URL
const getBaseUrl = () => {
  // 优先使用环境变量
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  // 如果环境变量不存在，则使用当前域名
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  // 如果是本地开发环境，使用后端开发服务器
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://127.0.0.1:8000';
  }
  // 生产环境使用相对路径
  return `${protocol}//${hostname}`;
};

const baseApiUrl = getBaseUrl();

// 創建 axios 實例
const axiosInstance = axios.create({
  baseURL: baseApiUrl,
  withCredentials: true,
});

// 獲取 CSRF token
function getCsrfToken() {
  const name = 'csrftoken=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookieArray = decodedCookie.split(';');
  for (let cookie of cookieArray) {
    cookie = cookie.trim();
    if (cookie.indexOf(name) === 0)
      return cookie.substring(name.length, cookie.length);
  }
  return null;
}

// 添加請求攔截器
axiosInstance.interceptors.request.use((config) => {
  const csrfToken = getCsrfToken();
  if (csrfToken)
    config.headers['X-CSRFToken'] = csrfToken;

  config.headers['X-Requested-With'] = 'XMLHttpRequest';
  return config;
})

const router = useRouter();
const userStore = useUserStore();
const { userInfo } = storeToRefs(userStore);

// 計算頭像 URL
const avatarUrl = computed(() => {
  if (!userInfo.value?.avatar)
    return 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';

  let url = userInfo.value.avatar;
  
  // 檢查是否為完整 URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // 保留已有的時間戳參數，或添加新的時間戳參數
    if (!url.includes('?t=') && !url.includes('&t=')) {
      const timestamp = Date.now();
      url = `${url}${url.includes('?') ? '&' : '?'}t=${timestamp}`;
    }
    return url;
  }
  
  // 獲取API基礎URL，如果環境變數不存在則使用默認值
  const apiBaseUrl = import.meta.env.VITE_API_URL || baseApiUrl || 'http://127.0.0.1:8000';
  
  // 移除開頭的斜線（如果存在）
  url = url.replace(/^\/+/, '');
  // 移除重複的 media 前綴
  url = url.replace(/^media\/media\//, 'media/');
  // 確保使用正斜線
  url = url.replace(/\\/g, '/');

  // 組合完整 URL，並添加時間戳防止快取
  const timestamp = Date.now();
  return `${apiBaseUrl}/${url}${url.includes('?') ? '&' : '?'}t=${timestamp}`;
});

// 模擬數據
const pendingOrders = ref(3);
const cartItemCount = ref(5);
const wishlistCount = ref(12);
const unreadMessages = ref(2);
const availableCoupons = ref(4);

const recentActivities = ref([
  {
    id: 1,
    icon: 'fas fa-shopping-bag',
    iconColor: '#3B82F6',
    iconBg: '#EBF5FF',
    title: '新訂單已建立',
    description: '您的訂單 #12345 已成功建立',
    date: new Date(2024, 0, 15, 14, 30),
  },
  {
    id: 2,
    icon: 'fas fa-heart',
    iconColor: '#EF4444',
    iconBg: '#FEF2F2',
    title: '新增收藏商品',
    description: '您將「精選旅遊套票」加入收藏清單',
    date: new Date(2024, 0, 15, 10, 15),
  },
  {
    id: 3,
    icon: 'fas fa-ticket-alt',
    iconColor: '#F97316',
    iconBg: '#FFF7ED',
    title: '獲得新優惠券',
    description: '系統發送一張95折優惠券給您',
    date: new Date(2024, 0, 14, 16, 45),
  },
]);

// 格式化日期
function formatDate(date: Date | string | undefined) {
  if (!date)
    return '無資料';
  const d = new Date(date);
  return d.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// 用戶資料表單
const userForm = ref({
  full_name: '',
  address: '',
  phone: '',
  current_password: '',
  new_password: '',
  confirm_password: '',
});

// 表單欄位是否已經輸入過
const hasInput = ref({
  address: false,
  phone: false,
});

// 是否顯示密碼欄位
const showPasswordFields = ref(false);

// 切換密碼欄位顯示狀態
function togglePasswordFields() {
  showPasswordFields.value = !showPasswordFields.value;
  if (!showPasswordFields.value) {
    // 隱藏密碼欄位時清空輸入
    userForm.value.current_password = '';
    userForm.value.new_password = '';
    userForm.value.confirm_password = '';
  }
}

// 監聽 userInfo 變化，更新表單數據
watch(() => userInfo.value, (newUserInfo) => {
  if (newUserInfo) {
    // 設定姓名
    userForm.value.full_name = newUserInfo.full_name || '';
    
    // 從localStorage或userInfo獲取地址和電話
    const savedUserData = localStorage.getItem('userData');
    if (savedUserData) {
      try {
        const userData = JSON.parse(savedUserData);
        if (userData.address && userData.address !== '尚未設定地址') {
          userForm.value.address = userData.address;
          hasInput.value.address = true;
        }
        if (userData.phone && userData.phone !== '尚未設定手機號碼') {
          userForm.value.phone = userData.phone;
          hasInput.value.phone = true;
        }
      } catch (e) {
        console.error('解析本地存儲的用戶數據失敗:', e);
      }
    }
    
    // 如果沒有從localStorage獲取到資料，則嘗試從userInfo獲取
    if (!hasInput.value.address) {
      const address = (newUserInfo as any)?.address;
      if (address && address !== '尚未設定地址') {
        userForm.value.address = address;
        hasInput.value.address = true;
      } else {
        userForm.value.address = '';
      }
    }
    
    if (!hasInput.value.phone) {
      const phone = (newUserInfo as any)?.phone;
      if (phone && phone !== '尚未設定手機號碼') {
        userForm.value.phone = phone;
        hasInput.value.phone = true;
      } else {
        userForm.value.phone = '';
      }
    }
  }
}, { immediate: true });

const message = useMessage();

// 在元件掛載時獲取最新數據
onMounted(async () => {
  try {
    // 首先確保檢查登入狀態，獲取最新的用戶數據
    await userStore.checkLoginStatus();
    
    // 從localStorage獲取之前保存的數據
    const savedUserData = localStorage.getItem('userData');
    if (savedUserData) {
      try {
        const userData = JSON.parse(savedUserData);
        
        // 優先使用localStorage中的數據
        if (userData.full_name) userForm.value.full_name = userData.full_name;
        
        if (userData.address && userData.address !== '尚未設定地址') {
          userForm.value.address = userData.address;
          hasInput.value.address = true;
        }
        
        if (userData.phone && userData.phone !== '尚未設定手機號碼') {
          userForm.value.phone = userData.phone;
          hasInput.value.phone = true;
        }
      } catch (e) {
        console.error('解析本地存儲的用戶數據失敗:', e);
      }
    }
    
    // 若沒有從localStorage獲取到手機號碼和地址，嘗試從API獲取完整用戶資料
    if ((!hasInput.value.address || !hasInput.value.phone)) {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          // 獲取完整用戶資料
          const response = await axios({
            method: 'get',
            url: `${baseApiUrl}/api/member/profile/`,
            headers: {
              'Authorization': `Bearer ${token}`,
              'X-Requested-With': 'XMLHttpRequest',
            },
            withCredentials: true,
          });
          
          if (response.status === 200 && response.data.success) {
            // 使用API返回的資料更新表單
            const profileData = response.data.profile || {};
            
            // 更新表單數據
            if (profileData.full_name) userForm.value.full_name = profileData.full_name;
            
            if (profileData.address && profileData.address !== '尚未設定地址' && !hasInput.value.address) {
              userForm.value.address = profileData.address;
              hasInput.value.address = true;
            }
            
            if (profileData.phone && profileData.phone !== '尚未設定手機號碼' && !hasInput.value.phone) {
              userForm.value.phone = profileData.phone;
              hasInput.value.phone = true;
            }
            
            // 同時更新localStorage
            localStorage.setItem('userData', JSON.stringify({
              full_name: userForm.value.full_name,
              address: userForm.value.address,
              phone: userForm.value.phone
            }));
          }
        } catch (error) {
          console.error('獲取完整用戶資料失敗:', error);
        }
      }
    }
  }
  catch (error) {
    console.error('獲取儀表板數據失敗:', error);
  }
});

// 修改保存個人資料函數，同時更新本地存儲
async function saveProfile() {
  try {
    // 檢查表單數據有效性
    if (!userForm.value.full_name.trim()) {
      message.error('姓名不能為空');
      return;
    }
    
    // 如果啟用了密碼變更，則使用專門的API端點更新密碼
    if (showPasswordFields.value) {
      await updatePassword();
    }
    
    // 標記表單欄位已有輸入
    if (userForm.value.address.trim()) {
      hasInput.value.address = true;
    }
    if (userForm.value.phone.trim()) {
      hasInput.value.phone = true;
    }
    
    // 創建FormData對象，添加表單數據
    const formData = new FormData();
    formData.append('full_name', userForm.value.full_name);
    formData.append('address', userForm.value.address);
    formData.append('phone', userForm.value.phone);

    // 獲取token
    const token = localStorage.getItem('access_token');
    if (!token)
      throw new Error('請先登入');

    // 直接使用FormData發送請求
    const response = await axios({
      method: 'post',
      url: `${baseApiUrl}/api/member/profile/update/`,
      data: formData,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
        'X-Requested-With': 'XMLHttpRequest',
      },
      withCredentials: true,
      timeout: 10000,
    });

    // 處理響應
    if (response.status === 200) {
      // 更新用戶資料
      await userStore.checkLoginStatus();
      
      // 手動更新本地儲存的資料
      if (userInfo.value) {
        userInfo.value.full_name = userForm.value.full_name;
        // 使用類型轉換處理可能不在數據模型中的欄位
        (userInfo.value as any).address = userForm.value.address;
        (userInfo.value as any).phone = userForm.value.phone;
      }
      
      // 將完整用戶資料存儲到本地，以便下次加載時使用
      localStorage.setItem('userData', JSON.stringify({
        full_name: userForm.value.full_name,
        address: userForm.value.address,
        phone: userForm.value.phone
      }));
      
      // 顯示成功訊息
      message.success('個人資料已成功保存');
    } else {
      throw new Error(response.data?.message || '伺服器回應異常');
    }
  } catch (error: any) {
    console.error('保存個人資料失敗:', error);
    message.error(error.response?.data?.message || error.message || '保存失敗，請稍後再試');
  }
}

// 更新密碼
async function updatePassword() {
  // 密碼變更邏輯
  // 檢查密碼欄位是否為空
  if (!userForm.value.current_password || !userForm.value.new_password || !userForm.value.confirm_password) {
    message.error('密碼欄位不能為空');
    return;
  }
  
  // 檢查新密碼是否一致
  if (userForm.value.new_password !== userForm.value.confirm_password) {
    message.error('兩次輸入的新密碼不一致');
    return;
  }
  
  try {
    const token = localStorage.getItem('access_token');
    if (!token) throw new Error('請先登入');
    
    // 獲取用戶ID
    const userId = userInfo.value?.id;
    console.log('獲取到用戶ID:', userId);
    
    console.log('嘗試使用簡化版密碼修改API');
    
    // 嘗試多個可能的API端點
    let response;
    let error;
    
    // 嘗試不同的API路徑
    const apiUrls = [
      // 相對路徑
      `/api/user/update-password/`,
      `/api/u/update-password/`,
      userId ? `/api/u/update-password/${userId}/` : null,
      
      // 直接URL路徑
      `${baseApiUrl}/api/user/update-password/`,
      `${baseApiUrl}/api/u/update-password/`,
      userId ? `${baseApiUrl}/api/u/update-password/${userId}/` : null
    ].filter(Boolean); // 移除null值
    
    console.log('將嘗試以下API路徑:', apiUrls);
    
    // 依次嘗試每個API路徑
    for (const apiUrl of apiUrls) {
      try {
        console.log(`嘗試API路徑: ${apiUrl}`);
        response = await axios({
          method: 'post',
          url: apiUrl,
          data: {
            current_password: userForm.value.current_password,
            new_password: userForm.value.new_password,
            confirm_password: userForm.value.confirm_password
          },
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          withCredentials: true
        });
        
        // 如果成功則跳出循環
        if (response.status === 200 || response.status === 201) {
          console.log('密碼更新成功，使用的API路徑:', apiUrl);
          break;
        }
      } catch (err) {
        console.error(`使用API路徑 ${apiUrl} 更新密碼失敗:`, err);
        error = err;
      }
    }
    
    // 如果所有API路徑都失敗
    if (!response) {
      throw error || new Error('所有API路徑都請求失敗');
    }
    
    console.log('密碼更新響應:', response.data);
    
    // 如果返回新的訪問令牌，則更新本地存儲
    if (response.data && response.data.access) {
      localStorage.setItem('access_token', response.data.access);
      console.log('已更新訪問令牌');
    }
    
    if (response.data && response.data.refresh) {
      localStorage.setItem('refresh_token', response.data.refresh);
      console.log('已更新刷新令牌');
    }
    
    message.success('密碼已成功更新');
    // 清空密碼欄位
    userForm.value.current_password = '';
    userForm.value.new_password = '';
    userForm.value.confirm_password = '';
    // 隱藏密碼欄位
    showPasswordFields.value = false;
    return true;
  } catch (error: any) {
    console.error('更新密碼失敗:', error);
    // 顯示詳細的錯誤信息
    const errorMsg = error.response?.data?.message || error.message || '密碼更新失敗，請確認當前密碼是否正確';
    message.error(errorMsg);
    return false;
  }
}
</script>

<template>
  <div>
    <NMessageProvider>
      <!-- 歡迎區塊 -->
      <div class="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-md p-8 mb-8">
        <div class="flex items-center space-x-6">
          <div class="relative">
            <img
              :src="avatarUrl"
              alt="用戶頭像"
              class="h-20 w-20 rounded-full object-cover border-4 border-white shadow-md"
            >
            <div class="absolute -bottom-2 -right-2 bg-green-500 p-1.5 rounded-full border-2 border-white">
              <i class="fas fa-check text-white text-xs" />
            </div>
          </div>
          <div class="text-white">
            <h1 class="text-3xl font-bold mb-2">
              歡迎回來，{{ userInfo?.full_name || userInfo?.username }}
            </h1>
            <p class="text-blue-100 flex items-center">
              <i class="fas fa-clock mr-2" />
              上次登入時間：{{ formatDate(userInfo?.last_login) }}
            </p>
          </div>
        </div>
      </div>
    </NMessageProvider>

    <!-- 功能卡片網格 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      <!-- 訂單管理 -->
      <div
        class="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-all duration-200 transform hover:-translate-y-1 cursor-pointer border border-gray-100"
        @click="router.push('/member/orders')"
      >
        <div class="flex items-center justify-between mb-4">
          <div class="bg-blue-100 p-3 rounded-lg">
            <i class="fas fa-shopping-bag text-2xl text-blue-600" />
          </div>
          <span class="text-sm font-medium text-gray-500">訂單管理</span>
        </div>
        <h3 class="text-2xl font-bold text-gray-900 mb-2">
          {{ pendingOrders }}
        </h3>
        <p class="text-sm text-gray-600">
          待處理訂單
        </p>
        <div class="mt-4 flex items-center text-blue-600 hover:text-blue-700">
          <span class="text-sm font-medium">查看詳情</span>
          <i class="fas fa-arrow-right ml-2 text-xs" />
        </div>
      </div>

      <!-- 購物車 -->
      <div
        class="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-all duration-200 transform hover:-translate-y-1 cursor-pointer border border-gray-100"
        @click="router.push('/cart')"
      >
        <div class="flex items-center justify-between mb-4">
          <div class="bg-green-100 p-3 rounded-lg">
            <i class="fas fa-shopping-cart text-2xl text-green-600" />
          </div>
          <span class="text-sm font-medium text-gray-500">購物車</span>
        </div>
        <h3 class="text-2xl font-bold text-gray-900 mb-2">
          {{ cartItemCount }}
        </h3>
        <p class="text-sm text-gray-600">
          商品數量
        </p>
        <div class="mt-4 flex items-center text-green-600 hover:text-green-700">
          <span class="text-sm font-medium">前往購物車</span>
          <i class="fas fa-arrow-right ml-2 text-xs" />
        </div>
      </div>

      <!-- 收藏清單 -->
      <div
        class="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-all duration-200 transform hover:-translate-y-1 cursor-pointer border border-gray-100"
        @click="router.push('/member/wishlist')"
      >
        <div class="flex items-center justify-between mb-4">
          <div class="bg-red-100 p-3 rounded-lg">
            <i class="fas fa-heart text-2xl text-red-600" />
          </div>
          <span class="text-sm font-medium text-gray-500">收藏清單</span>
        </div>
        <h3 class="text-2xl font-bold text-gray-900 mb-2">
          {{ wishlistCount }}
        </h3>
        <p class="text-sm text-gray-600">
          收藏商品
        </p>
        <div class="mt-4 flex items-center text-red-600 hover:text-red-700">
          <span class="text-sm font-medium">查看收藏</span>
          <i class="fas fa-arrow-right ml-2 text-xs" />
        </div>
      </div>

      <!-- 個人資料 -->
      <div
        class="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-all duration-200 transform hover:-translate-y-1 cursor-pointer border border-gray-100"
        @click="router.push('/member/profile')"
      >
        <div class="flex items-center justify-between mb-4">
          <div class="bg-purple-100 p-3 rounded-lg">
            <i class="fas fa-user-circle text-2xl text-purple-600" />
          </div>
          <span class="text-sm font-medium text-gray-500">個人資料</span>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">
          個人資訊
        </h3>
        <p class="text-sm text-gray-600">
          上次更新：{{ formatDate(userInfo?.updated_at) }}
        </p>
        <div class="mt-4 flex items-center text-purple-600 hover:text-purple-700">
          <span class="text-sm font-medium">編輯資料</span>
          <i class="fas fa-arrow-right ml-2 text-xs" />
        </div>
      </div>

      <!-- 訊息中心 -->
      <div
        class="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-all duration-200 transform hover:-translate-y-1 cursor-pointer border border-gray-100"
        @click="router.push('/member/messages')"
      >
        <div class="flex items-center justify-between mb-4">
          <div class="bg-yellow-100 p-3 rounded-lg">
            <i class="fas fa-envelope text-2xl text-yellow-600" />
          </div>
          <span class="text-sm font-medium text-gray-500">訊息中心</span>
        </div>
        <h3 class="text-2xl font-bold text-gray-900 mb-2">
          {{ unreadMessages }}
        </h3>
        <p class="text-sm text-gray-600">
          未讀訊息
        </p>
        <div class="mt-4 flex items-center text-yellow-600 hover:text-yellow-700">
          <span class="text-sm font-medium">查看訊息</span>
          <i class="fas fa-arrow-right ml-2 text-xs" />
        </div>
      </div>

      <!-- 優惠券 -->
      <div
        class="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-all duration-200 transform hover:-translate-y-1 cursor-pointer border border-gray-100"
        @click="router.push('/member/coupons')"
      >
        <div class="flex items-center justify-between mb-4">
          <div class="bg-orange-100 p-3 rounded-lg">
            <i class="fas fa-ticket-alt text-2xl text-orange-600" />
          </div>
          <span class="text-sm font-medium text-gray-500">優惠券</span>
        </div>
        <h3 class="text-2xl font-bold text-gray-900 mb-2">
          {{ availableCoupons }}
        </h3>
        <p class="text-sm text-gray-600">
          可用優惠券
        </p>
        <div class="mt-4 flex items-center text-orange-600 hover:text-orange-700">
          <span class="text-sm font-medium">查看優惠</span>
          <i class="fas fa-arrow-right ml-2 text-xs" />
        </div>
      </div>
    </div>

    <!-- 最近活動 -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-100">
      <div class="p-6 border-b border-gray-100">
        <h2 class="text-xl font-bold text-gray-900">
          最近活動
        </h2>
      </div>
      <div class="divide-y divide-gray-100">
        <div
          v-for="activity in recentActivities"
          :key="activity.id"
          class="p-6 hover:bg-gray-50 transition-colors"
        >
          <div class="flex items-start space-x-4">
            <div class="flex-shrink-0">
              <div class="w-10 h-10 rounded-lg flex items-center justify-center" :style="{ backgroundColor: activity.iconBg || '#EBF5FF' }">
                <i class="text-lg" :class="[activity.icon]" :style="{ color: activity.iconColor }" />
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-gray-900">
                {{ activity.title }}
              </p>
              <p class="text-sm text-gray-500 mt-1">
                {{ activity.description }}
              </p>
            </div>
            <div class="flex-shrink-0">
              <time class="text-sm text-gray-500">{{ formatDate(activity.date) }}</time>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 個人資料表單 -->
    <div class="bg-white rounded-lg shadow-sm p-6 mt-8">
      <h2 class="text-xl font-bold text-gray-900 mb-6">
        編輯個人資料
      </h2>

      <!-- 表單 -->
      <NForm>
        <NFormItem label="姓名" required>
          <NInput v-model:value="userForm.full_name" placeholder="請輸入姓名" />
        </NFormItem>

        <NFormItem label="地址">
          <NInput 
            v-model:value="userForm.address" 
            placeholder="請輸入地址"
          />
          <template v-if="!hasInput.address && !userForm.address">
            <div class="text-gray-400 mt-1 text-sm">尚未設定地址</div>
          </template>
        </NFormItem>

        <NFormItem label="手機號碼">
          <NInput 
            v-model:value="userForm.phone" 
            placeholder="請輸入手機號碼" 
          />
          <template v-if="!hasInput.phone && !userForm.phone">
            <div class="text-gray-400 mt-1 text-sm">尚未設定手機號碼</div>
          </template>
        </NFormItem>

        <!-- 顯示/隱藏密碼變更按鈕 -->
        <div class="mb-4">
          <NButton 
            type="default" 
            @click="togglePasswordFields"
            size="small"
          >
            {{ showPasswordFields ? '取消變更密碼' : '變更密碼' }}
          </NButton>
        </div>

        <!-- 密碼變更欄位 -->
        <template v-if="showPasswordFields">
          <div class="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
            <h3 class="text-lg font-medium text-gray-900 mb-4">變更密碼</h3>
            
            <NFormItem label="當前密碼" required>
              <NInput 
                v-model:value="userForm.current_password" 
                type="password" 
                placeholder="請輸入當前密碼"
                show-password-on="click"
              />
            </NFormItem>
            
            <NFormItem label="新密碼" required>
              <NInput 
                v-model:value="userForm.new_password" 
                type="password" 
                placeholder="請輸入新密碼"
                show-password-on="click"
              />
              <div class="text-gray-500 mt-1 text-xs">密碼須至少8個字符，並包含字母和數字</div>
            </NFormItem>
            
            <NFormItem label="確認新密碼" required>
              <NInput 
                v-model:value="userForm.confirm_password" 
                type="password" 
                placeholder="請再次輸入新密碼"
                show-password-on="click"
              />
            </NFormItem>
          </div>
        </template>

        <div class="flex justify-end mt-6">
          <NButton type="primary" @click="saveProfile">
            保存修改
          </NButton>
        </div>
      </NForm>
    </div>
  </div>
</template>

<style scoped>
.bg-gradient-to-r {
  background-size: 200% 200%;
  animation: gradient 15s ease infinite;
}

@keyframes gradient {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.n-form-item {
  max-width: 600px;
}
</style>
