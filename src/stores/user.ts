import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { apiUserSignin, apiUserLogout, apiUserCheckSignin } from '../utils/api';
import { useRouter } from 'vue-router';
import { successMsg } from '@/utils/api';

export interface UserInfo {
  id: number;
  username: string;
  email: string;
  full_name: string;
  avatar?: string;
  last_login?: string;
  updated_at?: string;
}

export const useUserStore = defineStore('user', () => {
  const router = useRouter();
  const userInfo = ref<UserInfo | null>(null);
  const loginStatus = ref(false);
  const isLoading = ref(false);

  // 計算屬性：用戶顯示名稱
  const displayName = computed(() => {
    return userInfo.value?.full_name || userInfo.value?.username || '';
  });

  // 更新用戶狀態
  const updateUserState = (user: UserInfo | null, status: boolean = true) => {
    console.log('Updating user state:', { user, status });
    userInfo.value = user;
    loginStatus.value = status;
    
    // 同步更新到 localStorage 和 sessionStorage
    if (user) {
      localStorage.setItem('userInfo', JSON.stringify(user));
      localStorage.setItem('loginStatus', 'true');
      sessionStorage.setItem('userInfo', JSON.stringify(user));
      sessionStorage.setItem('loginStatus', 'true');
    } else {
      localStorage.removeItem('userInfo');
      localStorage.removeItem('loginStatus');
      sessionStorage.removeItem('userInfo');
      sessionStorage.removeItem('loginStatus');
    }
  };

  // 初始化用戶狀態
  const initializeUserState = () => {
    console.log('Initializing user state');
    // 優先從 sessionStorage 讀取
    const sessionUserInfo = sessionStorage.getItem('userInfo');
    const sessionLoginStatus = sessionStorage.getItem('loginStatus');
    
    if (sessionUserInfo && sessionLoginStatus === 'true') {
      try {
        const parsedUserInfo = JSON.parse(sessionUserInfo);
        updateUserState(parsedUserInfo, true);
        console.log('User state initialized from sessionStorage');
        return;
      } catch (error) {
        console.error('Error parsing session user info:', error);
      }
    }
    
    // 如果 sessionStorage 沒有，則從 localStorage 讀取
    const localUserInfo = localStorage.getItem('userInfo');
    const localLoginStatus = localStorage.getItem('loginStatus');
    
    if (localUserInfo && localLoginStatus === 'true') {
      try {
        const parsedUserInfo = JSON.parse(localUserInfo);
        updateUserState(parsedUserInfo, true);
        console.log('User state initialized from localStorage');
      } catch (error) {
        console.error('Error parsing stored user info:', error);
        localStorage.removeItem('userInfo');
        localStorage.removeItem('loginStatus');
      }
    } else {
      updateUserState(null, false);
    }
  };

  // 登入功能
  const signin = async (data: { username: string; password: string; rememberMe?: boolean }) => {
    console.log('Signing in...');
    isLoading.value = true;

    try {
      const res = await apiUserSignin({
        username: data.username,
        password: data.password,
      });

      const { data: responseData } = res;
      console.log('Sign in response:', responseData);

      if (responseData.success) {
        // 設置 cookie 過期時間
        const expires = data.rememberMe
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString()
          : '';

        // 保存 token
        document.cookie = `token=${responseData.data.token};path=/;expires=${expires}`;
        if (responseData.data.refresh) {
          document.cookie = `refresh_token=${responseData.data.refresh};path=/;expires=${expires}`;
        }

        // 更新用戶狀態
        updateUserState(responseData.data.user, true);
        
        // 強制保存到 sessionStorage，確保頁面重新載入時能恢復狀態
        sessionStorage.setItem('userInfo', JSON.stringify(responseData.data.user));
        sessionStorage.setItem('loginStatus', 'true');

        // 等待一下確保狀態已更新
        await new Promise(resolve => setTimeout(resolve, 100));

        console.log('User state updated after sign in');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      isLoading.value = false;
    }
  };

  // 檢查登入狀態
  const checkLoginStatus = async () => {
    try {
      const response = await apiUserCheckSignin();
      const { success, isAuthenticated, user } = response.data;
      
      loginStatus.value = isAuthenticated;
      if (isAuthenticated && user) {
        userInfo.value = user;
      } else {
        userInfo.value = null;
      }
      
      return isAuthenticated;
    } catch (error) {
      console.error('檢查登入狀態時發生錯誤:', error);
      loginStatus.value = false;
      userInfo.value = null;
      return false;
    }
  };

  // 設置登入狀態
  const setLoginStatus = (status: boolean, user = null) => {
    loginStatus.value = status;
    userInfo.value = user;
  };

  // 登出功能
  const logout = async () => {
    console.log('Logging out...');
    try {
      // 清除用戶狀態
      updateUserState(null, false);
      
      // 清除所有相關的 cookies
      document.cookie = 'token=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
      document.cookie = 'refresh_token=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
      document.cookie = 'sessionid=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';

      // 嘗試呼叫後端登出 API，但不等待回應
      apiUserLogout().catch(() => {
        console.log('Backend logout API call failed, but local logout successful');
      });

      // 顯示登出成功訊息
      successMsg('已成功登出');

      // 跳轉到首頁
      router.push('/');
      
      return true;
    } catch (error) {
      console.log('Local logout process completed');
      return true;  // 即使有錯誤也返回成功
    }
  };

  // 初始化
  initializeUserState();

  return {
    userInfo,
    loginStatus,
    isLoading,
    displayName,
    signin,
    logout,
    checkLoginStatus,
    setLoginStatus,
    updateUserState,
  };
});
