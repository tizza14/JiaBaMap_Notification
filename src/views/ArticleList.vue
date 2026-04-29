<script setup>
import { ref, onMounted, onUnmounted, inject, computed } from "vue";
import axios from "axios";
import dayjs from "dayjs";
import Header from "../components/Header.vue";
import { useAuth } from "../stores/authStore";
import { storeToRefs } from "pinia";

const auth = useAuth();
const { userData } = storeToRefs(auth);

const $swal = inject("$swal"); // 注入 $swal

const formatDate = (date) => {
  return dayjs(date).format("YYYY-MM-DD HH:mm:ss");
};

const articles = ref([]);

const newComment = ref({
  content: "",
});

const newReply = ref({
  content: "",
  replyingTo: null,
});

// 設置 axios  URL
const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_BASE_URL,
});

// 獲取所有文章
const fetchArticles = async () => {
  try {
    const userId = userData.value?.sub;
    const { data } = await api.get("/articles", {
      params: { userId },
    });

    articles.value = data.map((article) => ({
      ...article,
      comments: article.comments || [],
      showComments: false,
    }));
  } catch (error) {
    await swalWithBootstrapButtons.fire({
      title: "錯誤！",
      text: "獲取文章失敗，請稍後再試",
      icon: "error",
      confirmButtonText: "確定",
    });
    articles.value = []; // 清空文章列表
  }
};

// 獲取文章按讚端點
const getArticleLikeEndpoint = (id) => {
  return `/articles/${id}/like`;
};

// 獲取評論按讚端點
const getCommentLikeEndpoint = (id) => {
  const article = articles.value.find((a) =>
    a.comments.some((c) => c._id === id),
  );
  if (article) {
    return `/articles/${article._id}/comments/${id}/like`;
  }
  return "";
};

// 獲取回覆按讚端點
const getReplyLikeEndpoint = (id) => {
  const article = articles.value.find((a) =>
    a.comments.some((c) => c.replies.some((r) => r._id === id)),
  );
  if (article) {
    const comment = article.comments.find((c) =>
      c.replies.some((r) => r._id === id),
    );
    if (comment) {
      return `/articles/${article._id}/comments/${comment._id}/replies/${id}/like`;
    }
  }
  return "";
};

// 更新按讚狀態
const updateLikeStatus = (type, id, responseData) => {
  let target;

  switch (type) {
    case "article":
      target = articles.value.find((item) => item._id === id);
      break;
    case "comment":
      target = articles.value
        .flatMap((a) => a.comments)
        .find((item) => item._id === id);
      break;
    case "reply":
      target = articles.value
        .flatMap((a) => a.comments)
        .flatMap((c) => c.replies)
        .find((item) => item._id === id);
      break;
  }

  if (target) {
    target.isLiked = responseData.isLiked;
    target.likesCount = responseData.likesCount;
    if (responseData.likedBy) {
      target.likedBy = responseData.likedBy;
    }
  }
};

// 按讚功能主函數
const toggleLike = async (type, id) => {
  // 檢查登入狀態
  if (!userData.value) {
    await swalWithBootstrapButtons.fire({
      title: "提醒",
      text: "請先登入後再按讚",
      icon: "warning",
      confirmButtonText: "確定",
    });
    return;
  }

  // 檢查用戶 ID
  const userId = userData.value._id;
  if (!userId) {
    console.error("No userId found in userData:", userData.value);
    await swalWithBootstrapButtons.fire({
      title: "錯誤",
      text: "無法獲取用戶資訊，請重新登入",
      icon: "error",
      confirmButtonText: "確定",
    });
    return;
  }

   // 獲取 token
   const token = localStorage.getItem('userToken');
    if (!token) {
      await swalWithBootstrapButtons.fire({
        title: "提醒",
        text: "請重新登入",
        icon: "warning",
        confirmButtonText: "確定",
      });
      return;
    }

  // 獲取對應的端點
  let endpoint = "";
  switch (type) {
    case "article":
      endpoint = getArticleLikeEndpoint(id);
      break;
    case "comment":
      endpoint = getCommentLikeEndpoint(id);
      break;
    case "reply":
      endpoint = getReplyLikeEndpoint(id);
      break;
  }

  const response = await api.post(
    endpoint,
    { userId },
    {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    },
  );

  if (response.status === 200) {
    updateLikeStatus(type, id, response.data);
  }
};

// 添加評論
const addComment = async (articleId) => {
  if (!userData.value) {
    await swalWithBootstrapButtons.fire({
      title: "提醒",
      text: "請先登入後再發表評論",
      icon: "warning",
      confirmButtonText: "確定",
    });
    return;
  }

  if (!newComment.value.content.trim()) {
    await swalWithBootstrapButtons.fire({
      title: "提醒",
      text: "請輸入評論內容",
      icon: "warning",
      confirmButtonText: "確定",
    });
    return;
  }

  try {
    const commentData = {
      content: newComment.value.content.trim(),
      userId: userData.value._id,
      user: userData.value.name,
      userPhoto: userData.value.profilePicture,
    };

    const { data } = await api.post(
      `/articles/${articleId}/comments`,
      commentData,
    );

    const article = articles.value.find((a) => a._id === articleId);
    if (article) {
      if (!article.comments) {
        article.comments = [];
      }
      article.comments.push({
        _id: data._id,
        content: data.content,
        userId: userData.value._id,
        user: userData.value.name,
        userPhoto: userData.value.profilePicture,
        createdAt: data.createdAt,
        likesCount: 0,
        isLiked: false,
        replies: [],
      });
      newComment.value.content = "";
    }
  } catch (error) {
    await swalWithBootstrapButtons.fire({
      title: "錯誤！",
      text: "發表評論失敗，請稍後再試",
      icon: "error",
    });
  }
};

// 刪除評論函數
const deleteComment = async (articleId, commentId) => {
  const result = await swalWithBootstrapButtons.fire({
    title: "確定要刪除評論？",
    text: "刪除後將無法恢復！",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "刪除！",
    cancelButtonText: "取消",
    reverseButtons: true,
  });

  if (result.isConfirmed) {
    try {
      await api.delete(`/articles/${articleId}/comments/${commentId}`);

      // 在前端更新資料
      const article = articles.value.find((a) => a._id === articleId);
      if (article) {
        const commentIndex = article.comments.findIndex(
          (c) => c._id === commentId,
        );
        if (commentIndex !== -1) {
          article.comments.splice(commentIndex, 1);
        }
      }

      await swalWithBootstrapButtons.fire({
        title: "已刪除！",
        text: "評論已成功刪除。",
        icon: "success",
      });
    } catch (error) {
      await swalWithBootstrapButtons.fire({
        title: "錯誤！",
        text: error.response?.data?.message || "刪除評論失敗，請稍後再試",
        icon: "error",
      });
    }
  }
};

// 新增回覆
const addReply = async (articleId, commentId) => {
  if (!userData.value) {
    await swalWithBootstrapButtons.fire({
      title: "提醒",
      text: "請先登入後再發表回覆",
      icon: "warning",
      confirmButtonText: "確定",
    });
    return;
  }

  if (!newReply.value.content.trim()) {
    await swalWithBootstrapButtons.fire({
      title: "提醒",
      text: "請輸入回覆內容",
      icon: "warning",
      confirmButtonText: "確定",
    });
    return;
  }

  try {
    const newReplyData = {
      content: newReply.value.content.trim(),
      userId: userData.value._id,
      user: userData.value.name,
      userPhoto: userData.value.profilePicture,
    };

    const { data } = await api.post(
      `/articles/${articleId}/comments/${commentId}/replies`,
      newReplyData,
    );
    const article = articles.value.find((a) => a._id === articleId);
    if (article) {
      const comment = article.comments.find((c) => c._id === commentId);
      if (comment) {
        if (!comment.replies) {
          comment.replies = [];
        }
        comment.replies.push({
          _id: data._id,
          content: data.content,
          userId: userData.value._id,
          user: userData.value.name,
          userPhoto: userData.value.profilePicture,
          createdAt: data.createdAt,
          likesCount: 0,
          isLiked: false,
        });
      }
    }
    newReply.value.content = "";
    newReply.value.replyingTo = null;
  } catch (error) {
    await swalWithBootstrapButtons.fire({
      title: "錯誤！",
      text: error.response?.data?.message || "發表回覆失敗，請稍後再試",
      icon: "error",
    });
  }
};

// 刪除回覆函數
const deleteReply = async (articleId, commentId, replyId) => {
  const result = await swalWithBootstrapButtons.fire({
    title: "確定要刪除回覆？",
    text: "刪除後將無法恢復！",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "刪除",
    cancelButtonText: "取消",
    reverseButtons: true,
  });

  if (result.isConfirmed) {
    try {
      await api.delete(
        `/articles/${articleId}/comments/${commentId}/replies/${replyId}`,
      );

      const article = articles.value.find((a) => a._id === articleId);
      if (article) {
        const comment = article.comments.find((c) => c._id === commentId);
        if (comment) {
          const replyIndex = comment.replies.findIndex(
            (r) => r._id === replyId,
          );
          if (replyIndex !== -1) {
            comment.replies.splice(replyIndex, 1);
          }
        }
      }

      await swalWithBootstrapButtons.fire({
        title: "已刪除！",
        text: "回覆已刪除。",
        icon: "success",
      });
    } catch (error) {
      await swalWithBootstrapButtons.fire({
        title: "錯誤！",
        text: error.response?.data?.message || "刪除回覆失敗，請稍後再試",
        icon: "error",
      });
    }
  }
};

const toggleContent = (article) => {
  article.showFullContent = !article.showFullContent;
};

const toggleReplyForm = async (commentId) => {
  if (!userData.value) {
    await swalWithBootstrapButtons.fire({
      title: "提醒",
      text: "請先登入後再發表回覆",
      icon: "warning",
      confirmButtonText: "確定",
    });
    return;
  }

  if (newReply.value.replyingTo === commentId) {
    newReply.value.replyingTo = null; // 關閉表單
  } else {
    newReply.value.replyingTo = commentId; // 打開表單
  }
};

// 追蹤當前打開的選單 ID
const activeMenuId = ref(null);

// 打開閱讀更多選單
const toggleMenu = (id) => {
  activeMenuId.value = activeMenuId.value === id ? null : id;
};

// 點擊外部關閉選單
const handleClickOutside = (event) => {
  if (
    !event.target.closest(".menu-button") &&
    !event.target.closest(".menu-content")
  ) {
    activeMenuId.value = null;
  }
};

// 控制手機版搜尋欄的狀態
const isSearchOpen = ref(false);
const isMobile = ref(window.innerWidth < 768);

// 處理搜尋欄開關事件
const handleSearchToggle = (isOpen) => {
  isSearchOpen.value = isOpen;
};

// 監聽視窗大小變化
const handleResize = () => {
  isMobile.value = window.innerWidth < 768;
};

console.log(articles.content);

// 在 onMounted 中調用
onMounted(async () => {
  await fetchArticles();
  document.addEventListener("click", handleClickOutside);
  window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
  window.removeEventListener("resize", handleResize);
});

// 配置 SweetAlert 樣式
const swalWithBootstrapButtons = $swal.mixin({
  customClass: {
    confirmButton:
      "bg-red-500 text-white px-6 py-2 rounded mx-2 hover:bg-red-600",
    cancelButton:
      "bg-gray-500 text-white px-6 py-2 rounded mx-2 hover:bg-gray-600",
    actions: "flex justify-center gap-4",
  },
  buttonsStyling: false,
});

const deleteArticle = async (articleId) => {
  const result = await swalWithBootstrapButtons.fire({
    title: "確定要刪除文章？",
    text: "刪除後將無法恢復！",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "刪除",
    cancelButtonText: "取消",
    reverseButtons: true,
  });

  if (result.isConfirmed) {
    try {
      await api.delete(`/articles/${articleId}`);
      await fetchArticles(); // 重新獲取文章列表
      await swalWithBootstrapButtons.fire({
        title: "已刪除！",
        text: "文章已成功刪除。",
        icon: "success",
      });
    } catch (error) {
      await swalWithBootstrapButtons.fire({
        title: "錯誤！",
        text: "刪除文章失敗，請稍後再試",
        icon: "error",
      });
    }
  }
};

// 切換評論顯示
const toggleComments = (articleId) => {
  const article = articles.value.find((a) => a._id === articleId);
  if (article) {
    article.showComments = !article.showComments;
  }
};
const contentHtml = `${articles.value.content}`;
</script>

<template>
  <Header @search-toggle="handleSearchToggle" />
  <div
    :class="[
      'max-w-4xl mx-auto',
      {
        'mt-24': isSearchOpen && isMobile,
        'md:mt-14 mt-16': !isSearchOpen || !isMobile,
      },
    ]"
  >
    <article
      v-for="article in articles"
      :key="article._id"
      class="mb-8 overflow-hidden bg-white rounded-lg shadow-md"
    >
      <!-- 桌面版排版 (>=768px) -->
      <div class="hidden md:block">
        <div class="p-6">
          <div class="flex items-start justify-between mb-4">
            <img
              :src="article.photo"
              :alt="article.title"
              class="object-cover w-full h-64 rounded-lg"
              loading="lazy"
              decoding="async"
            />
            <!-- 三點選單 -->
            <div
              v-if="userData && userData._id === article.userId"
              class="relative ml-2 group"
            >
              <button
                @click.stop="toggleMenu(article._id)"
                class="px-2 font-bold text-gray-500 hover:text-gray-700 menu-button"
              >
                <font-awesome-icon :icon="['fas', 'ellipsis']" />
              </button>
              <!-- 下拉選單 -->
              <div
                v-if="activeMenuId === article._id"
                class="absolute right-0 mt-1 bg-amber-100 hover:bg-amber-200 rounded-lg shadow-lg py-1 min-w-[100px] z-10 menu-content"
              >
                <button 
                  @click="deleteArticle(article._id); activeMenuId = null"
                  class="bg-transparent w-full text-center px-4 py-2 text-sm font-bold text-red-500"
                >
                  刪除
                </button>
              </div>
            </div>
          </div>
          <div class="space-y-4">
            <h2 class="text-2xl font-bold">{{ article.restaurantName }}</h2>
            <h2 class="text-2xl font-bold">{{ article.title }}</h2>
            <div class="flex items-center space-x-4 text-gray-600">
              <span>{{ formatDate(article.createdAt) }}</span>
            </div>
            <div class="relative">
              <!-- <p class="leading-relaxed text-gray-700 break-words whitespace-pre-wrap line-clamp-3" 
                 :class="{ 'line-clamp-none': article.showFullContent }">
                {{ article.content }}
              </p> -->
              <div v-html="article.content"></div>
              <button
                @click="toggleContent(article)"
                class="text-amber-500 text-sm mt-2"
              >
                {{ article.showFullContent ? "收起" : "繼續閱讀" }}
              </button>
            </div>
            <div class="flex items-center justify-between mt-4">
              <div class="flex items-center space-x-2">
                <button
                  @click="toggleLike('article', article._id)"
                  class="flex items-center space-x-2 text-amber-500 hover:text-amber-600"
                >
                  <font-awesome-icon
                    :icon="[article.isLiked ? 'fas' : 'far', 'thumbs-up']"
                    class="text-xl"
                  />
                  <span class="text-sm">{{ article.likesCount }}</span>
                </button>
              </div>

              <div class="flex items-center">
                <button
                  @click="toggleComments(article._id)"
                  class="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
                >
                  <font-awesome-icon :icon="['far', 'comment']" class="text-xl text-amber-500
                  " />
                  <span class="text-sm text-amber-500 ">{{ article.comments?.length || 0 }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 手機版排版 (<768px) -->
      <div class="md:hidden">
        <div class="relative">
          <img
            :src="article.photo"
            :alt="article.title"
            class="object-cover w-full h-48"
            loading="lazy"
            decoding="async"
          />
          <div
            class="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent"
          >
            <div class="flex items-center justify-between">
              <h2 class="text-xl font-bold text-white">{{ article.title }}</h2>
              <!-- 三點選單 -->
              <div
                v-if="userData && userData._id === article.userId"
                class="relative group"
              >
                <button
                  @click.stop="toggleMenu(article._id)"
                  class="px-2 font-bold text-white hover:text-gray-200 menu-button"
                >
                  <font-awesome-icon :icon="['fas', 'ellipsis']" />
                </button>
                <!-- 下拉選單 -->
                <div
                  v-if="activeMenuId === article._id"
                  class="absolute right-0 mt-1 bg-amber-200 hover:bg-amber-300 rounded-lg shadow-lg py-1 min-w-[100px] z-10 menu-content"
                >
                  <button 
                    @click="deleteArticle(article._id); activeMenuId = null"
                    class="bg-transparent w-full text-center px-4 py-2 text-sm font-bold text-red-500"
                  >
                    刪除
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="p-4 space-y-3">
          <div class="flex items-center justify-between text-sm text-gray-600">
            <span>{{ formatDate(article.createdAt) }}</span>
          </div>
          <div class="relative">
            <!-- <p
              class="text-sm text-gray-700 line-clamp-3"
              :class="{ 'line-clamp-none': !article.showFullContent }"
            >
              {{ article.content }}
            </p> -->
            <div v-html="article.content"></div>
            <button
              @click="toggleContent(article)"
              class="text-amber-500 text-sm mt-2"
            >
              {{ article.showFullContent ? "繼續閱讀" : "收起" }}
            </button>
          </div>
          <button
            @click="toggleLike('article', article._id)"
            class="flex items-center space-x-1 text-amber-500 hover:text-amber-600"
          >
            <font-awesome-icon
              :icon="[article.isLiked ? 'fas' : 'far', 'thumbs-up']"
              class="text-xl"
            />
            <span>{{ article.likesCount }}</span>
          </button>
        </div>
      </div>

      <!-- 評論區塊 -->
      <transition name="slide-fade">
        <div v-if="article.showComments" class="mt-4 space-y-4">
          <!-- 評論輸入框 -->
          <div class="flex space-x-2">
            <input
              v-model="newComment.content"
              type="text"
              placeholder="寫下你的評論..."
              class="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:border-amber-500"
              @keyup.enter="addComment(article._id)"
            />
            <button
              @click="addComment(article._id)"
              class="px-4 py-2 text-white transition-colors rounded-full bg-amber-500 hover:bg-amber-600"
            >
              發送
            </button>
          </div>

          <!-- 評論列表 -->
          <div
            v-for="comment in article.comments"
            :key="comment._id"
            class="pl-4 border-l-2"
          >
            <div class="flex items-center gap-3 mb-2">
              <div class="w-8 h-8">
                <img
                  :src="comment.userPhoto"
                  class="object-cover w-full h-full rounded-full"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div class="flex flex-col">
                <span class="text-sm font-medium md:text-base">{{
                  comment.user
                }}</span>
                <span class="text-xs text-gray-500 md:text-sm">{{
                  formatDate(comment.createdAt)
                }}</span>
              </div>
            </div>
            <p class="text-sm text-gray-700 md:text-base ml-11">
              {{ comment.content }}
            </p>

            <div class="flex items-center justify-between mt-2">
              <div class="flex items-center w-full gap-4 ml-11">
                <button
                  @click="toggleLike('comment', comment._id)"
                  class="flex items-center space-x-1 text-amber-500 hover:text-amber-600"
                >
                  <font-awesome-icon
                    :icon="[comment.isLiked ? 'fas' : 'far', 'thumbs-up']"
                    class="text-xl"
                  />
                  <span>{{ comment.likesCount }}</span>
                </button>
                <div class="flex items-center gap-2">
                  <button
                    @click="toggleReplyForm(comment._id)"
                    class="text-amber-500 text-sm hover:text-amber-500"
                  >
                    {{
                      newReply.replyingTo === comment._id ? "取消回覆" : "回覆"
                    }}
                  </button>
                  <!-- 評論的三點選單 -->
                  <div class="relative group">
                    <button
                      @click.stop="toggleMenu(comment._id)"
                      class="px-2 font-bold text-gray-500 hover:text-gray-700 menu-button"
                    >
                      <font-awesome-icon :icon="['fas', 'ellipsis']" />
                    </button>
                    <!-- 下拉選單 -->
                    <div
                      v-if="activeMenuId === comment._id"
                      class="absolute left-8 top-0  bg-amber-100 hover:bg-amber-200 rounded-lg shadow-lg py-1 min-w-[100px] z-10 menu-content"
                    >
                      <button 
                        @click="deleteComment(article._id, comment._id); activeMenuId = null"
                        class="bg-transparent w-full text-center px-4 py-2 text-sm font-bold text-red-500"
                      >
                        刪除
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 回覆列表 -->
            <div
              v-if="comment.replies && comment.replies.length > 0"
              class="mt-3 space-y-3 ml-11"
            >
              <div
                v-for="reply in comment.replies"
                :key="reply._id"
                class="p-3 rounded bg-gray-50"
              >
                <div class="flex items-center gap-3 mb-2">
                  <div class="w-6 h-6">
                    <img
                      :src="reply.userPhoto"
                      class="object-cover w-full h-full rounded-full"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div class="flex flex-col">
                    <span class="text-sm font-medium">{{ reply.user }}</span>
                    <span class="text-xs text-gray-500">{{
                      formatDate(reply.createdAt)
                    }}</span>
                  </div>
                </div>
                <p class="text-sm text-gray-700 ml-9">{{ reply.content }}</p>
                <div class="flex items-center gap-4 mt-2 ml-9">
                  <button
                    @click="toggleLike('reply', reply._id)"
                    class="flex items-center space-x-1 text-amber-500 hover:text-amber-600"
                  >
                    <font-awesome-icon
                      :icon="[reply.isLiked ? 'fas' : 'far', 'thumbs-up']"
                      class="text-lg"
                    />
                    <span>{{ reply.likesCount }}</span>
                  </button>
                  <!-- 回覆的三點選單 -->
                  <div class="relative group">
                    <button
                      @click.stop="toggleMenu(reply._id)"
                      class="px-2 font-bold text-gray-500 hover:text-gray-700 menu-button"
                    >
                      <font-awesome-icon :icon="['fas', 'ellipsis']" />
                    </button>
                    <!-- 下拉選單 -->
                    <div
                      v-if="activeMenuId === reply._id"
                      class="absolute left-8 top-0 bg-amber-100 hover:bg-amber-200 rounded-lg shadow-lg py-1 min-w-[100px] z-10 menu-content"
                    >
                      <button 
                        @click="deleteReply(article._id, comment._id, reply._id); activeMenuId = null"
                        class="bg-transparent w-full text-center px-4 py-2 text-sm font-bold text-red-500  z-50"
                      >
                        刪除
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 回覆表單 -->
            <div v-if="newReply.replyingTo === comment._id" class="mt-3 ml-11">
              <div class="flex items-start gap-3">
                <div v-if="userData" class="w-6 h-6">
                  <img
                    :src="userData.profilePicture"
                    class="object-cover w-full h-full rounded-full"
                  />
                </div>
                <div
                  v-else
                  class="flex items-center justify-center w-6 h-6 bg-gray-200 rounded-full"
                >
                  <font-awesome-icon
                    :icon="['fas', 'user']"
                    class="text-sm text-gray-400"
                  />
                </div>
                <div class="flex-1">
                  <div class="relative">
                    <textarea
                      v-model="newReply.content"
                      rows="2"
                      maxlength="200"
                      class="w-full p-2 text-sm border rounded disabled:bg-gray-100"
                      :class="{ 'bg-gray-50': newReply.content.length >= 200 }"
                      :placeholder="
                        userData ? '請發表回覆...' : '請先登入後再發表回覆...'
                      "
                      :disabled="!userData"
                      @input="
                        newReply.content = $event.target.value.slice(0, 200)
                      "
                    ></textarea>
                    <p
                      v-if="newReply.content.length > 0"
                      class="mt-1 text-xs"
                      :class="
                        newReply.content.length >= 200
                          ? 'text-red-500'
                          : 'text-gray-500'
                      "
                    >
                      {{
                        newReply.content.length >= 200
                          ? "已達到字數上限"
                          : `還可以輸入 ${200 - newReply.content.length} 字`
                      }}
                    </p>
                  </div>
                  <button
                    @click="addReply(article._id, comment._id)"
                    class="mt-1 bg-amber-500 text-white px-3 py-1 rounded text-sm hover:bg-amber-600"
                    :disabled="!userData"
                  >
                    {{ userData ? "發表回覆" : "請先登入" }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </article>
  </div>
</template>

<style scoped>
/* 修改過渡動畫 */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* 修改按鈕的通用 hover 效果 */
button {
  transition: all 0.2s ease;
  padding: 0.5rem;
  border-radius: 9999px;
}

/* 只對沒有背景色的按鈕添加 hover 效果 */
button:not([class*="bg-"]):hover {
  transform: scale(1.1);
  background-color: rgba(0, 0, 0, 0.05);
}

/* 為有背景色的按鈕添加特定的 hover 效果 */
button.bg-amber-500:hover {
  background-color: rgb(217 119 6) !important;
  transform: scale(1.05);
}

button.bg-blue-500:hover {
  background-color: rgb(37 99 235) !important;
  transform: scale(1.05);
}

/* 圖示和數字的間距 */
.space-x-2 > * + * {
  margin-left: 0.5rem;
}

/* 只添加這個確保下拉選單在最上層 */
.dropdown-menu {
  z-index: 50 !important;
}

/* 確保所有琥珀色按鈕的 hover 效果一致 */
button.bg-amber-500 {
  transition: background-color 0.2s ease;
}

button.bg-amber-500:hover {
  background-color: rgb(217 119 6) !important; /* amber-600 */
}
</style>
