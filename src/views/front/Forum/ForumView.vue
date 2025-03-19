<script setup lang="ts">
import { computed, onMounted, ref, watch, nextTick } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import {
  AddOutlined,
  CategoryOutlined,
  ChatBubbleOutlined,
  FavoriteBorderOutlined,
  FavoriteOutlined,
  FilterAltOutlined,
  GroupsOutlined,
  LocalOfferOutlined,
  NavigateNextOutlined,
  PersonOutlined,
  SearchOutlined,
  SortOutlined,
  VisibilityOutlined,
  ChevronLeftOutlined,
  ChevronRightOutlined,
} from '@vicons/material';
import {
  NButton,
  NCard,
  NCarousel,
  NDatePicker,
  NForm,
  NFormItem,
  NIcon,
  NInput,
  NModal,
  NSelect,
  NSwitch,
  useMessage,
} from 'naive-ui';
import PostDetailModal from './components/PostDetailModal.vue';
import { useUserStore } from '@/stores';
import {
  apiForumGetPosts,
  apiForumGetCategories,
  apiForumGetModerators,
  apiForumToggleLike,
  apiForumIncrementViews,
  api,
} from '@/utils/api';
import Footer from '@/components/Footer.vue';
import taiwanMountain from '@/img/10001.jpeg';
import taiwanHouse from '@/img/10002.jpg';
import sunMoonLake from '@/img/10003.jpg';
import hualienCoast from '@/img/10004.jpg';
import taiwanTeaFarm from '@/img/10005.jpg';
import taipeiNight from '@/img/10006.jpg';

const router = useRouter();
const userStore = useUserStore();
const isLoggedIn = computed(() => userStore.loginStatus);
const message = useMessage();

// 添加 baseUrl 變量
const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// 處理頭像 URL 的函數
function getAuthorAvatar(author: any) {
  if (!author?.avatar)
    return 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';

  let avatarUrl = author.avatar;

  // 如果是完整的 URL，直接返回
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://'))
    return avatarUrl;

  // 移除開頭的 media/ 或 /media/（如果存在）
  avatarUrl = avatarUrl.replace(/^media\/|^\/media\//, '');

  // 構建完整的 URL
  return `${baseUrl}/media/${avatarUrl}`;
}

const title = ref('討論區');
const activeCategory = ref('全部');  // 修改預設分類為"全部"

// 分類列表
const categories = ref([]);

// 頂部按鈕列表
const topButtons = ref([]);

// 文章列表
const posts = ref([]);
const allPosts = ref([]); // 保存所有文章的原始列表
const isLoading = ref(false);

// 版務人員
const moderator = ref({
  avatar: '',
  name: '',
  status: '',
});

// 活躍作者
const activeAuthors = ref([]);

// 分類選項
const categoryOptions = ref([]);

// 標籤列表
const tags = ref([]);
const selectedTags = ref([]);

// 分頁相關變數
const currentPage = ref(1);
const pageSize = ref(6); // 每頁顯示6篇文章

// 計算總頁數
const totalPages = computed(() => {
  console.log('重新計算總頁數，文章總數:', filteredPosts.value.length);
  return Math.ceil(filteredPosts.value.length / pageSize.value) || 1;
});

// 根據活動分類過濾文章
const filteredPosts = computed(() => {
  if (!activeCategory.value || activeCategory.value === '全部') {
    return allPosts.value;
  }
  return allPosts.value.filter(post => 
    post.category?.name === activeCategory.value
  );
});

// 計算當前頁的文章
const paginatedPosts = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  const slicedPosts = filteredPosts.value.slice(start, end);
  console.log('重新計算當前頁文章，頁碼:', currentPage.value, '顯示文章數:', slicedPosts.length, '分類:', activeCategory.value);
  return slicedPosts;
});

// 分頁導航方法
function goToPage(page: number) {
  if (page < 1 || page > totalPages.value) return;
  console.log('切換到頁碼:', page, '當前頁:', currentPage.value);
  currentPage.value = page;
  // 滾動到頁面頂部
  window.scrollTo({ top: 500, behavior: 'smooth' });
}

function goToNextPage() {
  if (currentPage.value < totalPages.value) {
    goToPage(currentPage.value + 1);
  }
}

function goToPrevPage() {
  if (currentPage.value > 1) {
    goToPage(currentPage.value - 1);
  }
}

// 生成分頁按鈕數組
const pageButtons = computed(() => {
  const buttons = [];
  const maxVisibleButtons = 5; // 最多顯示的按鈕數
  
  if (totalPages.value <= maxVisibleButtons) {
    // 頁數少於最大顯示按鈕數，全部顯示
    for (let i = 1; i <= totalPages.value; i++) {
      buttons.push(i);
    }
  } else {
    // 頁數較多，需要有省略號
    if (currentPage.value <= 3) {
      // 當前頁靠前
      for (let i = 1; i <= 4; i++) {
        buttons.push(i);
      }
      buttons.push('...');
      buttons.push(totalPages.value);
    } else if (currentPage.value >= totalPages.value - 2) {
      // 當前頁靠後
      buttons.push(1);
      buttons.push('...');
      for (let i = totalPages.value - 3; i <= totalPages.value; i++) {
        buttons.push(i);
      }
    } else {
      // 當前頁在中間
      buttons.push(1);
      buttons.push('...');
      buttons.push(currentPage.value - 1);
      buttons.push(currentPage.value);
      buttons.push(currentPage.value + 1);
      buttons.push('...');
      buttons.push(totalPages.value);
    }
  }
  
  return buttons;
});

// 加載分類列表
async function loadCategories() {
  try {
    console.log('開始載入分類列表...');
    const response = await axios.get('http://localhost:8000/api/public/categories/', {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('分類列表響應:', response.data);

    if (response.data && response.data.status === 'success' && Array.isArray(response.data.data)) {
      // 確保每個分類都有必要的欄位
      const validCategories = response.data.data.filter(category =>
        category && typeof category.id === 'number' && typeof category.name === 'string',
      );

      if (validCategories.length === 0) {
        console.error('沒有有效的分類數據');
        message.error('無法載入分類列表');
        return;
      }

      // 添加"全部"選項
      categoryOptions.value = [
        {
          label: '全部',
          value: 0,
          description: '顯示所有分類的文章',
          post_count: validCategories.reduce((total, cat) => total + (cat.post_count || 0), 0),
        },
        ...validCategories.map(category => ({
        label: category.name,
        value: category.id,
        description: category.description || '',
        post_count: category.post_count || 0,
        }))
      ];

      categories.value = categoryOptions.value;
      // 修改這裡，移除重複的"全部"
      topButtons.value = validCategories.map(c => c.name);
      topButtons.value.unshift('全部');  // 在開頭加入"全部"選項

      console.log('分類列表已更新:', categoryOptions.value);
    }
    else {
      console.error('無效的分類資料格式:', response.data);
      message.error('分類資料格式錯誤');
      categoryOptions.value = [];
      categories.value = [];
      topButtons.value = [];
    }
  }
  catch (error) {
    console.error('載入分類列表失敗:', error);
    console.error('錯誤詳情:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
    });
    message.error('載入分類列表失敗');
    categoryOptions.value = [];
    categories.value = [];
    topButtons.value = [];
  }
}

// 加載文章列表
async function loadPosts() {
  try {
    console.log('開始加載文章列表...');
    isLoading.value = true;

    const headers = {
      'Content-Type': 'application/json',
    };

    const token = localStorage.getItem('access_token');
    if (token)
      headers.Authorization = `Bearer ${token}`;

    const response = await axios.get('http://localhost:8000/api/public/posts/', { headers });

    console.log('文章列表響應:', response.data);

    if (Array.isArray(response.data)) {
      const formattedPosts = response.data.map((post: any) => ({
        id: post.id || 0,
        title: post.title || '',
        content: post.content || '',
        category_id: post.category?.id || null,
        category: {
          id: post.category?.id || null,
          name: post.category?.name || '未知分類',
        },
        author: {
          id: post.author?.id || 0,
          username: post.author?.username || '匿名用戶',
          avatar: post.author?.avatar || null,
        },
        created_at: post.created_at || new Date().toISOString(),
        views: post.views || 0,
        likes_count: post.like_count || 0,
        like_count: post.like_count || 0, // 保留兩種命名方式以確保兼容性
        comments_count: post.comment_count || 0,
        comment_count: post.comment_count || 0, // 保留兩種命名方式以確保兼容性
        tags: Array.isArray(post.tags)
          ? post.tags.map(tag => ({
              id: tag.id,
              name: tag.name,
              description: tag.description || '',
            }))
          : [],
        is_liked: post.is_liked || false,
      }));
      
      // 保存所有文章
      allPosts.value = formattedPosts;
      
      // 更新當前展示的文章列表（根據過濾條件）
      posts.value = formattedPosts;
      
      console.log('更新後的文章列表:', posts.value);
      
      // 重置為第一頁
      currentPage.value = 1;
    }
    else {
      console.error('無效的響應格式:', response.data);
      allPosts.value = [];
      posts.value = [];
    }
  }
  catch (error: any) {
    console.error('加載文章列表失敗:', error);
    allPosts.value = [];
    posts.value = [];
    message.error(error.response?.data?.message || '加載文章列表失敗，請稍後重試');
  }
  finally {
    isLoading.value = false;
  }
}

// 加載標籤列表
async function loadTags() {
  try {
    console.log('開始載入標籤列表...');
    const response = await axios.get('http://localhost:8000/api/public/tags/', {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('標籤API響應:', response.data);

    if (Array.isArray(response.data)) {
      tags.value = response.data.map(tag => ({
        label: tag.name,
        value: tag.id,
        description: tag.description || '',
      }));
      console.log('處理後的標籤數據:', tags.value);
    }
    else {
      console.error('標籤數據格式不正確:', response.data);
      tags.value = [];
    }
  }
  catch (error) {
    console.error('載入標籤列表失敗:', error);
    message.error('載入標籤列表失敗');
    tags.value = [];
  }
}

// 判斷是否為新文章（24小時內）
function isNewPost(created_at) {
  const postDate = new Date(created_at);
  const now = new Date();
  return (now - postDate) < 24 * 60 * 60 * 1000;
}

// 格式化日期
function formatDate(date) {
  return new Date(date).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// 發文表單
const showPostModal = ref(false);
const postForm = ref({
  category_id: null,
  title: '',
  content: '',
  tags: [],
  is_public: true,
  allow_comments: true,
});

// 重置表單
function resetForm() {
  postForm.value = {
    category_id: null,
    title: '',
    content: '',
    tags: [],
    is_public: true,
    allow_comments: true,
  };
  selectedTags.value = [];
}

// 表單驗證規則
const rules = {
  category_id: {
    required: true,
    type: 'number',
    message: '請選擇文章分類',
    trigger: ['blur', 'change', 'input'],
  },
  title: {
    required: true,
    message: '請輸入文章標題',
    trigger: ['blur', 'input'],
    min: 2,
    max: 100,
  },
  content: {
    required: true,
    message: '請輸入文章內容',
    trigger: ['blur', 'input'],
    min: 10,
  },
};

// 狀態
const isSubmitting = ref(false);
const showLoginModal = ref(false);

// 獲取分類名稱
function getCategoryName(categoryId) {
  const category = categoryOptions.value.find(c => c.value === categoryId);
  return category ? category.label : '未知分類';
}

// 監聽登入狀態變化
watch(isLoggedIn, async (newValue) => {
  if (!newValue) {
    try {
      // 呼叫後端登出 API
      const token = localStorage.getItem('access_token');
      if (token) {
        await axios.post('http://localhost:8000/api/auth/logout/', null, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }

      // 清除本地存儲和狀態
      localStorage.clear();
      userStore.setLoginStatus(false);
      userStore.clearUserInfo();
      message.success('已登出系統');

      // 重新加載文章列表（不需要認證）
      await loadPosts();

      router.push('/login');
    }
    catch (error) {
      console.error('登出錯誤:', error);
      // 即使後端 API 呼叫失敗，仍然清除本地數據
      localStorage.clear();
      userStore.setLoginStatus(false);
      userStore.clearUserInfo();
      message.warning('登出時發生錯誤，但已清除本地登入狀態');

      // 重新加載文章列表（不需要認證）
      await loadPosts();

      router.push('/login');
    }
  }
  else {
    // 重新加載數據
    await loadCategories();
    await loadPosts();
    await loadTags();
  }
});

// 提交表單
async function handleSubmit() {
  try {
    isSubmitting.value = true;

    // 檢查登入狀態
    if (!isLoggedIn.value) {
      message.error('請先登入');
      showLoginModal.value = true;
      isSubmitting.value = false;
      return;
    }

    // 獲取 token
    const token = localStorage.getItem('access_token');
    if (!token) {
      message.error('登入已過期，請重新登入');
      showLoginModal.value = true;
      isSubmitting.value = false;
      return;
    }

    // 準備發送的數據
    const response = await axios.post(
      'http://localhost:8000/api/public/posts/',
      {
        title: postForm.value.title.trim(),
        content: postForm.value.content.trim(),
        category_id: Number(postForm.value.category_id),
        tags_ids: selectedTags.value, // 修改欄位名稱
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      },
    );

    console.log('API 響應:', response.data);

    if (response.data && response.data.data) {
      message.success('發文成功');
      showPostModal.value = false;
      resetForm();
      // 延遲一下再重新加載文章列表
      setTimeout(async () => {
        await loadPosts();
      }, 500);
    }
    else {
      throw new Error(response.data.message || '發文失敗');
    }
  }
  catch (error) {
    console.error('發文錯誤:', error);
    if (error.response) {
      const errorMessage = error.response.data.message || error.response.data.detail || '發文失敗';
      message.error(errorMessage);
      console.error('API 錯誤詳情:', error.response.data);
    }
    else {
      message.error(error.message || '發文失敗，請稍後重試');
    }
  }
  finally {
    isSubmitting.value = false;
  }
}

// 在組件掛載時加載數據
onMounted(async () => {
  await loadCategories();
  await loadPosts();
  await loadTags();
  await loadModerators();
  // 加載完數據後，重置為第一頁
  currentPage.value = 1;
})

// 輪播圖片列表
const carouselImages = [
  {
    url: taiwanMountain,
    title: '台北101城市之美',
    description: '夜間燈光隨節慶或活動變換色彩，為臺北增添璀璨風采。',
  },
  {
    url: taiwanHouse,
    title: '台灣九份老街',
    description: '保存台灣傳統文化的古厝建築，細膩展現歷史風華"金瓜石"',
  },
  {
    url: sunMoonLake,
    title: '基隆港口',
    description: '基隆港是台灣最大的國際商港，也是北台灣重要的海上交通樞紐。',
  },
  {
    url: hualienCoast,
    title: '花蓮雲海',
    description: '台灣東部壯麗的海岸線風光，藍天碧海相映成趣',
  },
  {
    url: taiwanTeaFarm,
    title: '台灣日月潭風光',
    description: '日月潭的湖景，展現台灣獨特的自然風光',
  },
  {
    url: taipeiNight,
    title: '陽明山之美',
    description: '陽明山是台北市著名的郊山，以其豐富的自然景觀和溫泉資源而聞名。',
  },
];

// 跳轉到文章詳情頁
const showPostDetailModal = ref(false);
const selectedPost = ref(null);

// 處理發文按鈕點擊
function handlePostButtonClick() {
  if (!isLoggedIn.value) {
    showLoginModal.value = true;
    return;
  }
  showPostModal.value = true;
}

// 跳轉到註冊頁面
function goToRegister() {
  router.push('/register');
  showLoginModal.value = false;
}

// 在 script setup 區塊的開頭添加新的 ref
const moderators = ref([]);

// 在 script setup 區塊中添加新的函數
async function loadModerators() {
  try {
    console.log('開始載入版務人員資訊...');
    const response = await axios.get('http://localhost:8000/api/forum/moderators/', {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('版務人員資訊響應:', response.data);

    if (response.data?.status === 'success' && Array.isArray(response.data.data)) {
      moderators.value = response.data.data.map(mod => ({
        ...mod,
        avatar: mod.avatar
          ? getAuthorAvatar(mod)
          : 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y',
      }));
    }
    else {
      console.error('無效的版務人員資料格式:', response.data);
      moderators.value = [];
    }
  }
  catch (error) {
    console.error('載入版務人員資訊失敗:', error);
    moderators.value = [];
  }
}

// 處理按讚
async function handleLike(post: any, index: number) {
  if (!isLoggedIn.value) {
    message.warning('請先登入後才能點讚');
    return;
  }

  try {
    console.log('文章列表中點讚 - 文章ID:', post.id, '當前狀態:', post.is_liked, '點讚數:', post.likes_count);
    
    // 保存原始狀態以便恢復
    const isCurrentlyLiked = post.is_liked;
    const originalLikeCount = post.likes_count;
    
    // 樂觀更新 UI（創建新對象以確保響應性）
    const updatedPost = JSON.parse(JSON.stringify(post)); // 深拷貝確保響應性
    updatedPost.is_liked = !isCurrentlyLiked;
    updatedPost.likes_count += isCurrentlyLiked ? -1 : 1;
    if (updatedPost.like_count !== undefined) {
      updatedPost.like_count += isCurrentlyLiked ? -1 : 1;
    }
    
    // 更新當前頁面的顯示（強制響應式更新）
    const currentPageIndex = paginatedPosts.value.findIndex(p => p.id === post.id);
    if (currentPageIndex !== -1) {
      // 先替換當前頁面的文章顯示（立即更新UI）
      paginatedPosts.value[currentPageIndex] = updatedPost;
      // 強制 Vue 刷新視圖
      paginatedPosts.value = [...paginatedPosts.value];
    }
    
    // 更新主數據源
    const postIndex = allPosts.value.findIndex(p => p.id === post.id);
    if (postIndex !== -1) {
      allPosts.value.splice(postIndex, 1, updatedPost);
      console.log('UI已樂觀更新 - 新狀態:', updatedPost.is_liked, '新點讚數:', updatedPost.likes_count);
    }
    
    // 立即強制更新視圖
    await nextTick();
    
    // 添加點擊指定文章的點讚按鈕動畫
    const likeBtn = document.querySelector(`.like-btn-${post.id}`);
    if (likeBtn) {
      // 移除然後再添加動畫類，以便能觸發多次
      likeBtn.classList.remove('like-animation');
      setTimeout(() => {
        likeBtn.classList.add('like-animation');
      }, 10);
    }

    // 發送請求到後端
    const response = await apiForumToggleLike(post.id);
    console.log('點讚API響應:', response.data);

    if (response.data.status === 'success') {
      // 使用後端返回的實際數據再次更新
      const finalPost = JSON.parse(JSON.stringify(updatedPost)); // 深拷貝
      finalPost.is_liked = response.data.data.is_liked;
      finalPost.likes_count = response.data.data.like_count;
      if (finalPost.like_count !== undefined) {
        finalPost.like_count = response.data.data.like_count;
      }
      
      // 更新所有引用到該文章的地方
      
      // 1. 更新主數據源
      const postIndex = allPosts.value.findIndex(p => p.id === post.id);
      if (postIndex !== -1) {
        allPosts.value.splice(postIndex, 1, finalPost);
      }
      
      // 2. 更新當前頁面顯示
      const currentPageIndex = paginatedPosts.value.findIndex(p => p.id === post.id);
      if (currentPageIndex !== -1) {
        paginatedPosts.value[currentPageIndex] = finalPost;
        // 強制 Vue 刷新視圖
        paginatedPosts.value = [...paginatedPosts.value];
      }
      
      console.log('API更新完成 - 最終狀態:', finalPost.is_liked, '最終點讚數:', finalPost.likes_count);
      
      // 多次強制更新UI，確保渲染生效
      await nextTick();
      setTimeout(() => {
        // 再次強制刷新，解決某些瀏覽器渲染延遲問題
        if (postIndex !== -1) {
          const forcedRefreshPost = JSON.parse(JSON.stringify(finalPost));
          allPosts.value.splice(postIndex, 1, forcedRefreshPost);
        }
        console.log('UI延遲強制刷新完成');
      }, 50);
      
      message.success(response.data.message || (finalPost.is_liked ? '已點讚！' : '已取消點讚'));
    }
    else {
      // 如果請求失敗，恢復原始狀態
      const restoredPost = JSON.parse(JSON.stringify(post)); // 深拷貝
      restoredPost.is_liked = isCurrentlyLiked;
      restoredPost.likes_count = originalLikeCount;
      if (restoredPost.like_count !== undefined) {
        restoredPost.like_count = originalLikeCount;
      }
      
      // 更新主數據源
      const postIndex = allPosts.value.findIndex(p => p.id === post.id);
      if (postIndex !== -1) {
        allPosts.value.splice(postIndex, 1, restoredPost);
      }
      
      // 更新當前頁面顯示
      const currentPageIndex = paginatedPosts.value.findIndex(p => p.id === post.id);
      if (currentPageIndex !== -1) {
        paginatedPosts.value[currentPageIndex] = restoredPost;
        // 強制 Vue 刷新視圖
        paginatedPosts.value = [...paginatedPosts.value];
      }
      
      console.log('恢復原狀 - 恢復狀態:', isCurrentlyLiked, '恢復點讚數:', originalLikeCount);
      
      throw new Error(response.data.message || '操作失敗');
    }
  }
  catch (error: any) {
    console.error('按讚失敗:', error);
    message.error('操作失敗，請稍後重試');
  }
}

// 處理分類切換
function handleCategoryChange(category: string) {
  console.log('切換分類至:', category);
  activeCategory.value = category;
  // 切換分類後重置到第一頁
  currentPage.value = 1;
}

// 搜尋關鍵字
const searchKeyword = ref('');

// 排序選項
const sortOptions = [
  { label: '最新發布', value: 'newest' },
  { label: '最多觀看', value: 'most-viewed' },
  { label: '最多回覆', value: 'most-replied' },
  { label: '最多喜歡', value: 'most-liked' },
];
const currentSort = ref('newest');

// 篩選選項
const filterOptions = ref({
  dateRange: null,
  category: null,
  author: null,
});

// 處理搜尋
function handleSearch() {
  // TODO: 實作搜尋邏輯
  console.log('搜尋關鍵字:', searchKeyword.value);
  // 重置為第一頁
  currentPage.value = 1;
}

async function goToPostDetail(post) {
  try {
    // 確保使用深拷貝，避免引用問題，同時確保選中的文章是最新狀態
    selectedPost.value = JSON.parse(JSON.stringify(post));
    console.log('查看文章詳情:', selectedPost.value);
    
    // 先顯示模態框（讓用戶體驗更流暢）
    showPostDetailModal.value = true;
    
    // 直接增加觀看數，不做防重複檢查（由後端處理）
    console.log('正在增加觀看數，文章ID:', post.id);
    
    try {
      // 調用增加觀看數 API
      const apiPath = api.forum.incrementViews(post.id);
      console.log('使用API路徑:', apiPath);
      
      const response = await apiForumIncrementViews(post.id);
      console.log('增加觀看數API響應:', response.data);
      
      if (response.data && response.data.status === 'success') {
        // 更新本地文章的觀看數
        const newViewCount = response.data.data.views;
        
        // 更新選中的文章
        if (selectedPost.value) {
          selectedPost.value.views = newViewCount;
          console.log('選中文章觀看數已更新為:', newViewCount);
        }
        
        // 更新主列表中的文章
        const postIndex = allPosts.value.findIndex(p => p.id === post.id);
        if (postIndex !== -1) {
          // 創建新對象以確保響應性
          const updatedPost = { ...allPosts.value[postIndex] };
          updatedPost.views = newViewCount;
          
          // 使用數組替換方法確保Vue能檢測到變化
          allPosts.value.splice(postIndex, 1, updatedPost);
          
          console.log('主列表文章觀看數已更新，文章ID:', post.id, '新觀看數:', newViewCount);
          
          // 強制Vue重新計算顯示
          nextTick(() => {
            console.log('UI已強制刷新');
          });
        }
      } else {
        console.error('增加觀看數API返回錯誤:', response.data);
      }
    } catch (error) {
      console.error('增加觀看數失敗:', error);
      // 顯示錯誤消息但不影響用戶體驗（用戶仍然可以看到文章）
      message.error('無法更新觀看數，但您仍然可以查看文章');
    }
  } catch (error) {
    console.error('顯示文章詳情失敗:', error);
    message.error('顯示文章詳情時發生錯誤');
  }
}
</script>

<template>
  <div class="forum-container">
    <!-- 頂部導航 - 更改為清新旅遊風格 -->
    <div class="bg-gradient-to-r from-blue-400 to-teal-400 border-b border-teal-500 sticky top-0 z-10 shadow-md">
      <div class="max-w-7xl mx-auto">
        <div class="flex items-center justify-between py-3 px-4">
          <div class="flex items-center">
            <h1 class="text-white text-xl font-bold mr-4">清新旅遊討論區</h1>
          </div>
          <div class="flex items-center gap-3">
            <div class="relative">
              <input 
                type="text" 
                v-model="searchKeyword" 
                placeholder="搜尋文章..." 
                class="bg-white/10 text-white placeholder-white/70 border border-white/30 rounded-full py-1.5 px-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
              >
              <button class="absolute right-3 top-1/2 -translate-y-1/2 text-white">
                <NIcon><SearchOutlined /></NIcon>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 輪播圖區域 - 改為清新旅遊風格 -->
    <div class="max-w-7xl mx-auto px-4 pt-4 pb-6 relative">
      <div class="absolute top-8 left-8 w-20 h-20 bg-teal-400 rounded-full opacity-20 blur-xl -z-10"></div>
      <div class="absolute bottom-10 right-10 w-32 h-32 bg-blue-400 rounded-full opacity-20 blur-xl -z-10"></div>
      
      <div class="relative">
      <NCarousel
        autoplay
        :interval="5000"
        dot-type="line"
        effect="fade"
          class="h-[280px] rounded-lg overflow-hidden shadow-md"
        >
          <div v-for="(image, index) in carouselImages" :key="index">
            <div
              class="h-[280px] relative group overflow-hidden"
              :style="{
                backgroundImage: `url(${image.url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }"
            >
              <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
              <div class="absolute inset-0 flex flex-col justify-end p-8 text-white">
                <h3 class="text-3xl font-bold mb-2 shadow-text">{{ image.title }}</h3>
                <p class="text-base opacity-90 shadow-text max-w-xl">{{ image.description }}</p>
            </div>
          </div>
        </div>
      </NCarousel>
        
        <!-- 將發表文章按鈕修改為綠色調 -->
        <button 
          @click="handlePostButtonClick"
          class="absolute right-6 bottom-6 z-10 flex items-center gap-2 bg-gradient-to-r from-teal-400 to-green-500 hover:from-teal-500 hover:to-green-600 text-white px-5 py-3 rounded-full shadow-lg transform transition-transform hover:scale-105"
        >
              <NIcon size="20">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
              </NIcon>
          <span class="font-medium">發表文章</span>
        </button>
      </div>
          </div>

    <!-- 分類標籤和篩選區 - 改為更清新的顏色 -->
    <div class="max-w-7xl mx-auto px-4 mb-6">
      <div class="bg-white rounded-lg shadow-md border border-gray-200 p-3">
        <div class="flex flex-wrap items-center mb-3">
          <div class="mr-3 font-medium text-gray-700">主題分類：</div>
          <div class="flex flex-wrap gap-2">
            <button 
              v-for="category in topButtons" 
              :key="category"
              class="px-3 py-1.5 rounded-full text-sm border transition-colors"
              :class="[
                activeCategory === category 
                  ? 'bg-gradient-to-r from-blue-400 to-teal-400 text-white border-transparent shadow-sm'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              ]"
              @click="handleCategoryChange(category)"
            >
              {{ category }}
            </button>
          </div>
        </div>

        <div class="flex flex-wrap justify-between items-center border-t border-gray-100 pt-3">
          <div class="flex items-center gap-3">
            <div class="flex items-center">
                    <NSelect
                      v-model:value="currentSort"
                      :options="sortOptions"
                placeholder="排序方式"
                class="w-36"
                size="small"
                    >
                      <template #prefix>
                        <NIcon><SortOutlined /></NIcon>
                      </template>
                    </NSelect>
                  </div>
            <button class="px-3 py-1.5 text-sm border border-gray-200 rounded-md text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors">
              <span>熱門</span>
            </button>
            <button class="px-3 py-1.5 text-sm border border-gray-200 rounded-md text-gray-600 hover:bg-teal-50 hover:text-teal-600 hover:border-teal-200 transition-colors">
              <span>精選</span>
            </button>
                </div>

          <div class="flex items-center text-sm text-gray-500">
            <span class="mr-2">版務人員：</span>
            <div class="flex -space-x-2">
              <img 
                v-for="(mod, i) in (moderators.length > 0 ? moderators.slice(0, 2) : [{avatar: 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'}])"
                :key="i"
                :src="mod.avatar" 
                :alt="mod.username || '版主'" 
                class="w-7 h-7 rounded-full border-2 border-white shadow-sm"
              />
            </div>
          </div>
                </div>
              </div>
            </div>

    <!-- 主要內容區 - 保留原有結構但優化佈局 -->
    <div class="max-w-7xl mx-auto px-4">
      <div class="flex flex-col lg:flex-row gap-6">
        <!-- 左側內容 -->
        <div class="w-full lg:w-3/4">
            <!-- 文章列表 -->
          <div class="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden mb-6">
            <div v-if="isLoading" class="p-8 text-center">
              <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-teal-500"></div>
              <p class="mt-2 text-gray-500">載入中...</p>
              </div>
            <div v-else-if="paginatedPosts.length === 0" class="p-12 text-center">
              <div class="text-gray-400 mb-4">
                <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                </svg>
              </div>
              <p class="text-gray-500 mb-4">暫無文章，快來發表第一篇吧！</p>
              <button 
                @click="handlePostButtonClick" 
                class="inline-flex items-center px-4 py-2 bg-gradient-to-r from-teal-400 to-green-500 text-white rounded-md shadow-sm hover:from-teal-500 hover:to-green-600 transition-colors"
              >
                <NIcon class="mr-1" size="16">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                </NIcon>
                發表第一篇文章
              </button>
            </div>
            <div v-else>
              <div v-for="(post, index) in paginatedPosts" :key="post.id" 
                  class="border-b border-gray-100 last:border-b-0 group transition-all hover:shadow-md"
                  :class="[
                    index % 2 === 0 
                      ? 'bg-gradient-to-r from-blue-50/30 to-teal-50/20' 
                      : 'bg-white'
                  ]">
                <div 
                  class="px-5 py-4 cursor-pointer relative overflow-hidden"
                  @click="goToPostDetail(post)"
                >
                  <!-- 裝飾元素 -->
                  <div class="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-blue-400 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div class="flex">
                    <!-- 左側數據顯示 -->
                    <div class="w-20 mr-4 flex flex-col justify-center items-center">
                      <!-- 評論數統計 -->
                      <div class="bg-gradient-to-r from-blue-100 to-teal-100 rounded-lg p-2 w-16 flex flex-col justify-center items-center border border-blue-200 shadow-sm group-hover:shadow group-hover:scale-105 transition-all">
                        <div class="text-lg font-medium text-blue-600">
                          {{ post.comments_count || 0 }}
                        </div>
                        <div class="text-xs text-teal-600">回覆</div>
                      </div>
                    </div>
                    
                    <!-- 文章內容 -->
                    <div class="flex-1">
                      <div class="mb-2">
                        <h3 class="text-base font-medium text-gray-900 group-hover:text-teal-600 transition-colors inline-flex items-center">
                          <span class="inline-block px-2 py-0.5 rounded mr-2 text-xs"
                            :class="[
                              post.category?.name === '交通資訊' ? 'bg-blue-100 text-blue-800' : 
                              post.category?.name === '美食推薦' ? 'bg-teal-100 text-teal-800' : 
                              post.category?.name === '住宿分享' ? 'bg-sky-100 text-sky-800' : 
                              post.category?.name === '行程規劃' ? 'bg-green-100 text-green-800' : 
                              post.category?.name === '國內旅遊' ? 'bg-cyan-100 text-cyan-800' : 
                              post.category?.name === '海外旅遊' ? 'bg-blue-100 text-blue-800' : 
                              'bg-blue-100 text-blue-800'
                            ]"
                          >{{ post.category?.name || '討論' }}</span>
                          {{ post.title }}
                          <span v-if="isNewPost(post.created_at)" class="ml-2 px-1.5 py-0.5 bg-green-100 text-green-600 text-xs rounded-sm">新</span>
                        </h3>
                      </div>
                      <p class="text-sm text-gray-600 line-clamp-2 mb-2 group-hover:text-gray-900">
                        {{ post.content.length > 100 ? post.content.substring(0, 100) + '...' : post.content }}
                      </p>
                      <div class="flex items-center text-xs text-gray-500 mt-2">
                        <div class="bg-gradient-to-r from-blue-100 to-teal-100 rounded-full p-0.5">
                        <img
                          :src="getAuthorAvatar(post.author)"
                          :alt="post.author.username"
                            class="w-6 h-6 rounded-full border border-white"
                          @error="(e) => e.target.src = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'"
                        >
                      </div>
                        <span class="text-gray-700 ml-1 mr-1 font-medium">{{ post.author.username }}</span>
                        <span class="mr-2 text-gray-400">{{ formatDate(post.created_at) }}</span>
                        
                        <!-- 互動指標（所有螢幕尺寸都顯示） -->
                        <div class="flex items-center ml-auto gap-2">
                          <span class="flex items-center bg-blue-50 text-blue-600 px-2 py-1 rounded-md">
                            <NIcon size="14" class="mr-1"><VisibilityOutlined /></NIcon>
                            <span class="font-medium">{{ post.views || 0 }}</span>
                        </span>
                          <span 
                            :class="[
                              'flex items-center px-2 py-1 rounded-md cursor-pointer transition-colors like-btn-' + post.id,
                              post.is_liked 
                                ? 'bg-green-100 text-green-600 hover:bg-green-200 border border-green-200' 
                                : 'bg-green-50 text-green-600 hover:bg-green-100 hover:border-green-200 border border-transparent'
                            ]"
                            @click.stop="handleLike(post, index)"
                          >
                            <NIcon size="14" class="mr-1">
                              <component :is="post.is_liked ? FavoriteOutlined : FavoriteBorderOutlined" 
                                         :class="['like-icon', { 'like-animation': post.is_liked }]" />
                          </NIcon>
                            <span class="font-medium" :key="`post-${post.id}-likes-${post.likes_count}-${post.is_liked}`">{{ post.likes_count || 0 }}</span>
                        </span>
                          <span class="flex items-center bg-teal-50 text-teal-600 px-2 py-1 rounded-md">
                            <NIcon size="14" class="mr-1"><ChatBubbleOutlined /></NIcon>
                            <span class="font-medium">{{ post.comments_count || 0 }}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
                </div>
              </div>
          
          <!-- 分頁導航 -->
          <div class="flex justify-center mb-8">
            <div class="bg-white rounded-full shadow-md border border-gray-200 flex items-center py-1.5 px-3">
              <button 
                class="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                @click="goToPrevPage"
                :disabled="currentPage <= 1"
              >
                <ChevronLeftOutlined />
              </button>
              <div class="flex items-center px-2">
                <template v-for="(btn, index) in pageButtons" :key="index">
                  <button 
                    v-if="btn !== '...'" 
                    class="min-w-[36px] h-9 flex items-center justify-center mx-1 rounded-full font-medium transition-colors"
                    :class="[
                      currentPage === btn 
                        ? 'bg-gradient-to-r from-blue-400 to-teal-400 text-white shadow-sm' 
                        : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                    ]"
                    @click="goToPage(btn)"
                  >
                    {{ btn }}
                  </button>
                  <span v-else class="px-1">...</span>
                </template>
              </div>
              <button 
                class="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                @click="goToNextPage"
                :disabled="currentPage >= totalPages"
              >
                <ChevronRightOutlined />
              </button>
            </div>
          </div>
        </div>

        <!-- 右側側邊欄 - 保留原有內容但優化設計 -->
        <div class="w-full lg:w-1/4">
          <!-- 旅遊達人推薦 -->
          <div class="bg-white rounded-lg shadow-md border border-gray-200 mb-5 overflow-hidden">
            <div class="bg-gradient-to-r from-blue-400 to-teal-400 px-4 py-3 flex items-center text-white">
              <NIcon size="18" class="mr-2"><CategoryOutlined /></NIcon>
              <h3 class="font-medium">旅遊達人推薦</h3>
              <div class="ml-auto text-white/80">
                <NavigateNextOutlined />
              </div>
            </div>
            <div class="p-3">
              <div 
                v-for="(moderator, index) in moderators.length > 0 ? moderators : [{username: '旅行家', avatar: 'https://i.pravatar.cc/150?img=1'}, {username: '行程規劃師', avatar: 'https://i.pravatar.cc/150?img=2'}, {username: '美食搜索者', avatar: 'https://i.pravatar.cc/150?img=3'}]" 
                :key="index" 
                class="flex items-center p-2.5 rounded-md hover:bg-blue-50 transition-colors"
              >
                <div class="bg-gradient-to-br from-blue-200 to-teal-200 rounded-full p-1 mr-3">
                    <img
                      :src="moderator.avatar"
                      :alt="moderator.username"
                    class="w-10 h-10 rounded-full border border-white shadow-sm object-cover"
                      @error="(e) => e.target.src = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'"
                    />
                  </div>
                  <div>
                  <div class="flex items-center">
                    <span class="font-medium text-gray-800">{{ moderator.username }}</span>
                    <span class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-blue-500 to-teal-500 text-white shadow-sm">
                      旅遊達人
                      </span>
                    </div>
                  <div class="text-xs text-gray-500 mt-0.5">分享了 {{ Math.floor(Math.random() * 20) + 1 }} 篇旅遊心得</div>
                  </div>
              </div>
            </div>
          </div>

          <!-- 熱門活動 -->
          <div class="bg-white rounded-lg shadow-md border border-gray-200 mb-5 overflow-hidden">
            <div class="bg-gradient-to-r from-blue-400 to-teal-400 px-4 py-3 flex items-center text-white">
              <NIcon size="18" class="mr-2"><LocalOfferOutlined /></NIcon>
              <h3 class="font-medium">廠商招商專區</h3>
                  </div>
            <div class="p-4">
              <div class="rounded-md overflow-hidden shadow-md mb-4 relative group">
                <div class="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-teal-400/40 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <img 
                  src="https://img.freepik.com/free-photo/business-partners-handshake-global-corporate-with-technology-concept_53876-102615.jpg" 
                  alt="廠商合作計畫" 
                  class="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div class="p-3 text-sm text-gray-600 border-t border-gray-100 bg-gradient-to-r from-blue-50 to-teal-50">
                  加入我們的旅遊合作夥伴計劃，擴展您的業務觸及範圍！
                  </div>
                </div>
              <div class="bg-white rounded-lg p-4 border border-gray-100 mb-4">
                <div class="text-sm text-gray-700 mb-3">
                  <div class="font-medium text-teal-600 mb-1">合作夥伴優勢</div>
                  <ul class="list-disc pl-5 space-y-1 text-gray-600">
                    <li>獲得曝光於我們活躍的旅遊社群</li>
                    <li>專屬推廣活動與折扣方案</li>
                    <li>與其他頂級旅遊品牌共同合作</li>
                  </ul>
                </div>
              </div>
              <div>
                <button class="w-full bg-gradient-to-r from-teal-400 to-green-500 hover:from-teal-500 hover:to-green-600 text-white rounded-md px-4 py-2.5 transition-colors text-sm shadow-sm font-medium">
                  申請成為合作夥伴
                </button>
              </div>
            </div>
          </div>

          <!-- 旅遊熱門標籤 -->
          <div class="bg-white rounded-lg shadow-md border border-gray-200 mb-5 overflow-hidden">
            <div class="bg-gradient-to-r from-blue-400 to-teal-400 px-4 py-3 flex items-center text-white">
              <NIcon size="18" class="mr-2"><LocalOfferOutlined /></NIcon>
              <h3 class="font-medium">熱門旅遊標籤</h3>
            </div>
            <div class="p-4 flex flex-wrap gap-2 bg-gradient-to-br from-white to-blue-50">
              <span v-for="(tag, index) in tags.length > 0 ? tags : ['台北美食', '環島旅行', '花蓮景點', '親子遊', '自由行', '住宿推薦']" :key="index" 
                    class="px-3 py-1.5 rounded-full text-xs cursor-pointer shadow-sm"
                    :class="[
                      index % 3 === 0 ? 'bg-gradient-to-r from-blue-400 to-teal-400 text-white' : 
                      index % 3 === 1 ? 'bg-gradient-to-r from-teal-400 to-green-400 text-white' :
                      'bg-gradient-to-r from-sky-400 to-blue-400 text-white'
                    ]">
                #{{ typeof tag === 'string' ? tag : tag.label }}
              </span>
          </div>
        </div>
      </div>
    </div>
    </div>
    
  <Footer />
  </div>
  
  <!-- 文章詳情模態框 -->
  <PostDetailModal
    v-model:show="showPostDetailModal"
    :post="selectedPost"
    @like="(data) => {
      console.log('收到點讚事件，數據：', data);
      
      if (!selectedPost || !allPosts.value) return;
      
      try {
        // 1. 更新當前選中的文章
        selectedPost.is_liked = data.is_liked;
        selectedPost.likes_count = data.like_count;
        selectedPost.like_count = data.like_count;
        
        // 2. 更新主列表中的文章
        const postIndex = allPosts.value.findIndex(p => p.id === selectedPost.id);
        if (postIndex !== -1) {
          // 創建新對象來確保響應性
          const updatedPost = JSON.parse(JSON.stringify(allPosts.value[postIndex]));
          updatedPost.is_liked = data.is_liked;
          updatedPost.likes_count = data.like_count;
          updatedPost.like_count = data.like_count;
          
          // 使用數組替換方法確保Vue能檢測到變化
          allPosts.value.splice(postIndex, 1, updatedPost);
          
          console.log('主列表已更新，文章ID:', selectedPost.id, '新點讚狀態:', data.is_liked, '新點讚數:', data.like_count);
        }
        
        // 3. 更新當前頁面的文章
        const pageIndex = paginatedPosts.value.findIndex(p => p.id === selectedPost.id);
        if (pageIndex !== -1) {
          const pagePost = JSON.parse(JSON.stringify(paginatedPosts.value[pageIndex]));
          pagePost.is_liked = data.is_liked;
          pagePost.likes_count = data.like_count;
          pagePost.like_count = data.like_count;
          
          // 更新當前頁面的文章
          paginatedPosts.value[pageIndex] = pagePost;
          // 強制刷新頁面文章列表
          paginatedPosts.value = [...paginatedPosts.value];
          
          console.log('當前頁面列表已更新');
        }
        
        // 4. 強制Vue更新渲染
        nextTick(() => {
          console.log('UI已強制更新');
          
          // 再次延遲更新，解決某些瀏覽器渲染延遲問題
    setTimeout(() => {
            if (postIndex !== -1) {
              const forcedRefreshPost = JSON.parse(JSON.stringify(allPosts.value[postIndex]));
              allPosts.value.splice(postIndex, 1, forcedRefreshPost);
            }
            console.log('UI延遲強制刷新完成');
          }, 50);
        });
      }
      catch (err) {
        console.error('更新點讚狀態時出錯:', err);
      }
    }"
    @comment-count-update="(count) => {
      console.log('收到評論數更新事件，新數量：', count);
      
      if (!selectedPost || !allPosts.value) return;
      
      try {
        // 1. 更新當前選中的文章
        selectedPost.comment_count = count;
        selectedPost.comments_count = count;
        
        // 2. 更新主列表中的文章
        const postIndex = allPosts.value.findIndex(p => p.id === selectedPost.id);
        if (postIndex !== -1) {
          // 創建新對象來確保響應性
          const updatedPost = JSON.parse(JSON.stringify(allPosts.value[postIndex]));
          updatedPost.comment_count = count;
          updatedPost.comments_count = count;
          
          // 使用數組替換方法確保Vue能檢測到變化
          allPosts.value.splice(postIndex, 1, updatedPost);
          
          console.log('主列表已更新，文章ID:', selectedPost.id, '新評論數:', count);
        }
        
        // 3. 更新當前頁面的文章
        const pageIndex = paginatedPosts.value.findIndex(p => p.id === selectedPost.id);
        if (pageIndex !== -1) {
          const pagePost = JSON.parse(JSON.stringify(paginatedPosts.value[pageIndex]));
          pagePost.comment_count = count;
          pagePost.comments_count = count;
          
          // 更新當前頁面的文章
          paginatedPosts.value[pageIndex] = pagePost;
          // 強制刷新頁面文章列表
          paginatedPosts.value = [...paginatedPosts.value];
          
          console.log('當前頁面列表已更新');
        }
        
        // 4. 強制Vue更新渲染
        nextTick(() => {
          console.log('UI已強制更新');
        });
      }
      catch (err) {
        console.error('更新評論數時出錯:', err);
      }
    }"
  />
  
  <!-- 發表新文章模態框 -->
  <NModal v-model:show="showPostModal" style="width: 800px">
    <NCard
      title="發表新文章"
      :bordered="false"
      size="huge"
      role="dialog"
      aria-modal="true"
      class="shadow-xl"
      :header-style="{ 
        background: 'linear-gradient(to right, #0d9488, #0ea5e9)', 
        color: 'white', 
        borderTopLeftRadius: '0.375rem', 
        borderTopRightRadius: '0.375rem' 
      }"
    >
      <NForm ref="formRef" :model="postForm" :rules="rules">
        <NFormItem label="主題分類" path="category_id" required>
          <NSelect
            v-model:value="postForm.category_id"
            :options="categoryOptions"
            placeholder="請選擇分類"
            :disabled="isSubmitting"
            @update:value="(val) => {
              console.log('選擇的分類值:', val);
              if (!val) {
                postForm.category_id = null;
                message.warning('請選擇文章分類');
                return;
              }
              const selectedCategory = categoryOptions.value.find(cat => cat.value === val);
              if (selectedCategory) {
                postForm.category_id = val;
                message.success(`已選擇分類: ${selectedCategory.label}`);
              }
              else {
                postForm.category_id = null;
                message.error('無效的分類選擇');
              }
            }"
          />
        </NFormItem>
        <NFormItem label="文章標題" path="title" required>
          <NInput
            v-model:value="postForm.title"
            placeholder="請輸入標題（2-100字）"
            :maxlength="100"
            show-count
          />
        </NFormItem>
        <NFormItem label="文章內容" path="content" required>
          <NInput
            v-model:value="postForm.content"
            type="textarea"
            placeholder="請輸入內容（至少10字）"
            :rows="10"
            show-count
          />
        </NFormItem>
        <NFormItem label="旅遊標籤" path="tags">
          <NSelect
            v-model:value="selectedTags"
            :options="tags"
            multiple
            placeholder="請選擇標籤"
            :disabled="isSubmitting"
            @update:value="(val) => {
              console.log('選擇的標籤:', val);
              selectedTags.value = val;
            }"
          />
        </NFormItem>
        <NFormItem label="文章設定">
          <div class="space-y-2">
            <NSwitch v-model:value="postForm.is_public">
              <template #checked>
                公開
              </template>
              <template #unchecked>
                私密
              </template>
            </NSwitch>
            <NSwitch v-model:value="postForm.allow_comments">
              <template #checked>
                允許評論
              </template>
              <template #unchecked>
                禁止評論
              </template>
            </NSwitch>
          </div>
        </NFormItem>
      </NForm>
      <template #footer>
        <div class="flex justify-end gap-4">
          <NButton @click="showPostModal = false">
            取消
          </NButton>
          <NButton
            type="primary"
            :loading="isSubmitting"
            :disabled="!postForm.category_id || !postForm.title.trim() || !postForm.content.trim()"
            @click="handleSubmit"
            class="bg-gradient-to-r from-blue-400 to-teal-400 border-none"
          >
            發表文章
          </NButton>
        </div>
      </template>
    </NCard>
  </NModal>

  <!-- 登入提示彈窗 -->
  <NModal v-model:show="showLoginModal" style="width: 400px">
    <NCard
      title="需要註冊"
      :bordered="false"
      size="huge"
      role="dialog"
      aria-modal="true"
      class="shadow-xl"
      :header-style="{ 
        background: 'linear-gradient(to right, #0d9488, #0ea5e9)', 
        color: 'white', 
        borderTopLeftRadius: '0.375rem', 
        borderTopRightRadius: '0.375rem' 
      }"
    >
      <div class="text-center">
        <p class="mb-6">
          發表文章需要先註冊成為會員
        </p>
        <div class="flex justify-center gap-4">
          <NButton type="primary" @click="goToRegister" class="bg-gradient-to-r from-blue-400 to-teal-400 border-none">
            立即註冊
          </NButton>
          <NButton @click="showLoginModal = false">
            取消
          </NButton>
        </div>
      </div>
    </NCard>
  </NModal>
</template>

<style>
.forum-container {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background-color: #AEDFF7; /* 淺藍色背景 */
  background-image: radial-gradient(#A1E3D8 0.5px, transparent 0.5px); /* 湖水綠點狀背景 */
  background-size: 15px 15px;
  min-height: 100vh;
  padding-bottom: 2rem;
}

.shadow-text {
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
}

/* 分類標籤顏色 */
.category-交通資訊 { @apply bg-blue-100 text-blue-800; }
.category-美食推薦 { @apply bg-teal-100 text-teal-800; }
.category-住宿分享 { @apply bg-sky-100 text-sky-800; }
.category-行程規劃 { @apply bg-green-100 text-green-800; }
.category-國內旅遊 { @apply bg-cyan-100 text-cyan-800; }
.category-海外旅遊 { @apply bg-blue-100 text-blue-800; }

/* 保留原有樣式但修改顏色變量 */
.text-primary {
  color: #A1E3D8; /* 湖水綠 */
}

.bg-primary {
  background-color: #A1E3D8; /* 湖水綠 */
}

.border-primary {
  border-color: #A1E3D8; /* 湖水綠 */
}

.hover\:text-primary:hover {
  color: #A1E3D8; /* 湖水綠 */
}

.hover\:bg-primary:hover {
  background-color: #A1E3D8; /* 湖水綠 */
}

.ring-primary {
  --tw-ring-color: #A1E3D8; /* 湖水綠 */
}

.bg-primary\/5 {
  background-color: rgba(161, 227, 216, 0.05); /* 湖水綠透明度5% */
}

.bg-primary\/10 {
  background-color: rgba(161, 227, 216, 0.1); /* 湖水綠透明度10% */
}

.bg-primary\/20 {
  background-color: rgba(161, 227, 216, 0.2); /* 湖水綠透明度20% */
}

/* 新增漸變動畫效果 */
@keyframes gradient-shift {
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

.animate-gradient {
  background-size: 200% 200%;
  animation: gradient-shift 3s ease infinite;
}

/* 點讚按鈕動畫效果 */
.like-icon {
  transition: transform 0.3s ease;
}

.like-icon:hover {
  transform: scale(1.2);
}

.like-animation {
  animation: heartBeat 0.6s ease-in-out;
}

@keyframes heartBeat {
  0% {
    transform: scale(1);
  }
  14% {
    transform: scale(1.3);
  }
  28% {
    transform: scale(1);
  }
  42% {
    transform: scale(1.3);
  }
  70% {
    transform: scale(1);
  }
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.3);
  }
  100% {
    transform: scale(1);
  }
}
</style>
