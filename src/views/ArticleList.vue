<script setup>
import { ref, onMounted, onUnmounted, inject, computed, nextTick, watch } from "vue";
import { useRoute } from "vue-router";
import axios from "axios";
import dayjs from "dayjs";
import Header from "../components/Header.vue";
import { useAuth } from "../stores/authStore";
import { storeToRefs } from "pinia";

const auth = useAuth();
const route = useRoute();
const { userData } = storeToRefs(auth);
const $swal = inject("$swal");

const articles = ref([]);
const isLoading = ref(false);
const currentPage = ref(1);
const totalPages = ref(1);
const sortBy = ref("date"); // "date" | "likes"

const newComment = ref({ content: "" });
const newReply = ref({ content: "", replyingTo: null });
const activeMenuId = ref(null);
const isSearchOpen = ref(false);
const isMobile = ref(window.innerWidth < 768);
const highlightedTargetId = ref("");

const api = axios.create({ baseURL: import.meta.env.VITE_BACKEND_BASE_URL });

const formatDate = (date) => dayjs(date).format("YYYY-MM-DD HH:mm");

// 預估閱讀時間（每分鐘 300 字）
const readingTime = (content) => {
  const text = content?.replace(/<[^>]+>/g, "") || "";
  const mins = Math.max(1, Math.ceil(text.length / 300));
  return `約 ${mins} 分鐘`;
};

// 簡易 XSS 防護（移除 script 標籤與 on* 事件屬性）
const sanitize = (html) => {
  if (!html) return "";
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "")
    .replace(/javascript\s*:/gi, "");
};

// 取得封面圖（photo 是陣列）
const coverPhoto = (article) => {
  if (!article.photo) return null;
  return Array.isArray(article.photo) ? article.photo[0] : article.photo;
};

const normalizeArticle = (article) => ({
  ...article,
  comments: article.comments || [],
  showComments: false,
  showFullContent: false,
});

const scrollToTarget = async (targetId) => {
  await nextTick();

  window.setTimeout(() => {
    const target = document.getElementById(targetId);
    if (!target) return;

    const headerOffset = isMobile.value ? 88 : 96;
    const targetTop = target.getBoundingClientRect().top + window.scrollY - headerOffset;

    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior: "smooth",
    });

    highlightedTargetId.value = targetId;
    window.setTimeout(() => {
      if (highlightedTargetId.value === targetId) {
        highlightedTargetId.value = "";
      }
    }, 1800);
  }, 180);
};

const focusArticleFromRoute = async () => {
  const articleId = route.query.articleId;
  if (!articleId) return;

  let article = articles.value.find((item) => item._id === articleId);
  if (!article) {
    try {
      const { data } = await api.get(`/articles/${articleId}`);
      article = normalizeArticle(data);
      articles.value = [
        article,
        ...articles.value.filter((item) => item._id !== articleId),
      ];
    } catch {
      return;
    }
  }

  article.showFullContent = true;
  if (route.query.commentId || route.query.replyId) {
    article.showComments = true;
  }

  const targetId =
    route.query.replyId
      ? `reply-${route.query.replyId}`
      : route.query.commentId
        ? `comment-${route.query.commentId}`
        : `article-${articleId}`;

  await scrollToTarget(targetId);
};

const swal = $swal.mixin({
  customClass: {
    confirmButton: "bg-red-500 text-white px-6 py-2 rounded mx-2 hover:bg-red-600",
    cancelButton: "bg-gray-500 text-white px-6 py-2 rounded mx-2 hover:bg-gray-600",
    actions: "flex justify-center gap-4",
  },
  buttonsStyling: false,
});

// ── 文章載入 ──────────────────────────────────────────────────────

const fetchArticles = async (page = 1) => {
  isLoading.value = true;
  try {
    const userId = userData.value?._id;
    const { data } = await api.get("/articles", {
      params: { userId, page, limit: 10, sortBy: sortBy.value },
    });

    const list = (data.articles || data).map(normalizeArticle);

    if (page === 1) {
      articles.value = list;
    } else {
      articles.value = [...articles.value, ...list];
    }

    totalPages.value = data.totalPages || 1;
    currentPage.value = page;
    await focusArticleFromRoute();
  } catch {
    await swal.fire({ title: "錯誤！", text: "獲取文章失敗，請稍後再試", icon: "error", confirmButtonText: "確定" });
    articles.value = [];
  } finally {
    isLoading.value = false;
  }
};

watch(
  () => route.query,
  focusArticleFromRoute,
);

const loadMore = () => {
  if (currentPage.value < totalPages.value) {
    fetchArticles(currentPage.value + 1);
  }
};

const changeSort = (value) => {
  sortBy.value = value;
  fetchArticles(1);
};

// ── 文章操作 ──────────────────────────────────────────────────────

const toggleContent = (article) => {
  article.showFullContent = !article.showFullContent;
};

const deleteArticle = async (articleId) => {
  const result = await swal.fire({
    title: "確定要刪除文章？", text: "刪除後將無法恢復！", icon: "warning",
    showCancelButton: true, confirmButtonText: "刪除", cancelButtonText: "取消", reverseButtons: true,
  });
  if (!result.isConfirmed) return;

  try {
    await api.delete(`/articles/${articleId}`);
    articles.value = articles.value.filter((a) => a._id !== articleId);
    await swal.fire({ title: "已刪除！", icon: "success", timer: 1500, showConfirmButton: false });
  } catch {
    await swal.fire({ title: "錯誤！", text: "刪除文章失敗", icon: "error" });
  }
};

// ── 按讚 ──────────────────────────────────────────────────────────

const requireLogin = async (msg = "請先登入後再操作") => {
  if (!userData.value) {
    await swal.fire({ title: "提醒", text: msg, icon: "warning", confirmButtonText: "確定" });
    return false;
  }
  return true;
};

const getEndpoint = (type, id) => {
  if (type === "article") return `/articles/${id}/like`;
  if (type === "comment") {
    const art = articles.value.find((a) => a.comments.some((c) => c._id === id));
    return art ? `/articles/${art._id}/comments/${id}/like` : "";
  }
  if (type === "reply") {
    const art = articles.value.find((a) => a.comments.some((c) => c.replies.some((r) => r._id === id)));
    const comment = art?.comments.find((c) => c.replies.some((r) => r._id === id));
    return art && comment ? `/articles/${art._id}/comments/${comment._id}/replies/${id}/like` : "";
  }
  return "";
};

const updateLikeStatus = (type, id, data) => {
  let target;
  if (type === "article") target = articles.value.find((a) => a._id === id);
  if (type === "comment") target = articles.value.flatMap((a) => a.comments).find((c) => c._id === id);
  if (type === "reply") target = articles.value.flatMap((a) => a.comments).flatMap((c) => c.replies).find((r) => r._id === id);
  if (target) {
    target.isLiked = data.isLiked;
    target.likesCount = data.likesCount;
    if (data.likedBy) target.likedBy = data.likedBy;
  }
};

const toggleLike = async (type, id) => {
  if (!await requireLogin("請先登入後再按讚")) return;
  const token = localStorage.getItem("userToken");
  if (!token) { await swal.fire({ title: "提醒", text: "請重新登入", icon: "warning" }); return; }

  const endpoint = getEndpoint(type, id);
  if (!endpoint) return;

  const { data } = await api.post(endpoint, { userId: userData.value._id }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (data) updateLikeStatus(type, id, data);
};

// ── 留言 ──────────────────────────────────────────────────────────

const addComment = async (articleId) => {
  if (!await requireLogin("請先登入後再發表評論")) return;
  if (!newComment.value.content.trim()) {
    await swal.fire({ title: "提醒", text: "請輸入評論內容", icon: "warning" });
    return;
  }

  try {
    const { data } = await api.post(`/articles/${articleId}/comments`, {
      content: newComment.value.content.trim(),
      userId: userData.value._id,
      user: userData.value.name,
      userPhoto: userData.value.profilePicture,
    });

    const article = articles.value.find((a) => a._id === articleId);
    if (article) {
      article.comments.push({
        _id: data._id, content: data.content, userId: userData.value._id,
        user: userData.value.name, userPhoto: userData.value.profilePicture,
        createdAt: data.createdAt, likesCount: 0, isLiked: false, replies: [],
      });
      newComment.value.content = "";
    }
  } catch {
    await swal.fire({ title: "錯誤！", text: "發表評論失敗", icon: "error" });
  }
};

const deleteComment = async (articleId, commentId) => {
  const result = await swal.fire({
    title: "確定要刪除評論？", text: "刪除後將無法恢復！", icon: "warning",
    showCancelButton: true, confirmButtonText: "刪除", cancelButtonText: "取消", reverseButtons: true,
  });
  if (!result.isConfirmed) return;

  try {
    await api.delete(`/articles/${articleId}/comments/${commentId}`);
    const article = articles.value.find((a) => a._id === articleId);
    if (article) {
      const idx = article.comments.findIndex((c) => c._id === commentId);
      if (idx !== -1) article.comments.splice(idx, 1);
    }
    await swal.fire({ title: "已刪除！", icon: "success", timer: 1200, showConfirmButton: false });
  } catch {
    await swal.fire({ title: "錯誤！", text: "刪除評論失敗", icon: "error" });
  }
};

const toggleReplyForm = async (commentId) => {
  if (!await requireLogin("請先登入後再回覆")) return;
  newReply.value.replyingTo = newReply.value.replyingTo === commentId ? null : commentId;
  if (newReply.value.replyingTo) newReply.value.content = "";
};

const addReply = async (articleId, commentId) => {
  if (!await requireLogin()) return;
  if (!newReply.value.content.trim()) {
    await swal.fire({ title: "提醒", text: "請輸入回覆內容", icon: "warning" });
    return;
  }

  try {
    const { data } = await api.post(`/articles/${articleId}/comments/${commentId}/replies`, {
      content: newReply.value.content.trim(),
      userId: userData.value._id,
      user: userData.value.name,
      userPhoto: userData.value.profilePicture,
    });

    const article = articles.value.find((a) => a._id === articleId);
    const comment = article?.comments.find((c) => c._id === commentId);
    if (comment) {
      comment.replies.push({
        _id: data._id, content: data.content, userId: userData.value._id,
        user: userData.value.name, userPhoto: userData.value.profilePicture,
        createdAt: data.createdAt, likesCount: 0, isLiked: false,
      });
    }
    newReply.value.content = "";
    newReply.value.replyingTo = null;
  } catch {
    await swal.fire({ title: "錯誤！", text: "發表回覆失敗", icon: "error" });
  }
};

const deleteReply = async (articleId, commentId, replyId) => {
  const result = await swal.fire({
    title: "確定要刪除回覆？", icon: "warning",
    showCancelButton: true, confirmButtonText: "刪除", cancelButtonText: "取消",
  });
  if (!result.isConfirmed) return;

  try {
    await api.delete(`/articles/${articleId}/comments/${commentId}/replies/${replyId}`);
    const article = articles.value.find((a) => a._id === articleId);
    const comment = article?.comments.find((c) => c._id === commentId);
    if (comment) {
      const idx = comment.replies.findIndex((r) => r._id === replyId);
      if (idx !== -1) comment.replies.splice(idx, 1);
    }
    await swal.fire({ title: "已刪除！", icon: "success", timer: 1200, showConfirmButton: false });
  } catch {
    await swal.fire({ title: "錯誤！", text: "刪除回覆失敗", icon: "error" });
  }
};

const toggleMenu = (id) => {
  activeMenuId.value = activeMenuId.value === id ? null : id;
};

const handleClickOutside = (e) => {
  if (!e.target.closest(".menu-button") && !e.target.closest(".menu-content")) {
    activeMenuId.value = null;
  }
};

const handleSearchToggle = (isOpen) => { isSearchOpen.value = isOpen; };
const handleResize = () => { isMobile.value = window.innerWidth < 768; };

onMounted(async () => {
  await fetchArticles(1);
  document.addEventListener("click", handleClickOutside);
  window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
  window.removeEventListener("resize", handleResize);
});
</script>

<template>
  <Header @search-toggle="handleSearchToggle" />
  <div
    :class="['max-w-4xl mx-auto px-4', isSearchOpen && isMobile ? 'mt-24' : 'md:mt-14 mt-16']"
  >
    <!-- 排序控制列 -->
    <div class="flex items-center gap-3 py-4 border-b mb-6">
      <span class="text-sm text-gray-500 font-medium">排序：</span>
      <button
        @click="changeSort('date')"
        :class="['px-4 py-1.5 rounded-full text-sm transition', sortBy === 'date' ? 'bg-amber-400 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200']"
      >
        最新
      </button>
      <button
        @click="changeSort('likes')"
        :class="['px-4 py-1.5 rounded-full text-sm transition', sortBy === 'likes' ? 'bg-amber-400 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200']"
      >
        最熱門
      </button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading && articles.length === 0" class="flex justify-center py-16">
      <div class="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <!-- 無文章 -->
    <div v-else-if="!isLoading && articles.length === 0" class="text-center py-16 text-gray-400">
      目前沒有食記
    </div>

    <!-- 文章列表 -->
    <article
      v-for="article in articles"
      :id="`article-${article._id}`"
      :key="article._id"
      class="mb-8 overflow-hidden bg-white rounded-xl shadow-md"
      :class="{ 'ring-2 ring-amber-300 ring-offset-2': highlightedTargetId === `article-${article._id}` }"
    >
      <!-- 桌面版 (>=768px) -->
      <div class="hidden md:block p-6">
        <!-- 封面圖 -->
        <div v-if="coverPhoto(article)" class="relative mb-4">
          <img
            :src="coverPhoto(article)"
            :alt="article.title"
            class="object-cover w-full h-64 rounded-lg"
            loading="lazy"
          />
          <!-- 三點選單 -->
          <div v-if="userData && userData._id === article.userId" class="absolute top-3 right-3">
            <button @click.stop="toggleMenu(article._id)" class="p-2 bg-white rounded-full shadow menu-button">
              <font-awesome-icon :icon="['fas', 'ellipsis']" class="text-gray-600" />
            </button>
            <div v-if="activeMenuId === article._id" class="absolute right-0 mt-1 bg-white rounded-lg shadow-lg py-1 min-w-[100px] z-10 menu-content">
              <button @click="deleteArticle(article._id); activeMenuId = null" class="w-full text-center px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50">
                刪除
              </button>
            </div>
          </div>
        </div>

        <!-- 作者 + 餐廳 + 時間 -->
        <div class="flex items-center gap-3 mb-3">
          <img
            :src="article.userPhoto || '/image/default_user.png'"
            class="w-9 h-9 rounded-full object-cover"
            loading="lazy"
          />
          <div>
            <p class="text-sm font-medium text-gray-800">{{ article.user }}</p>
            <p class="text-xs text-gray-400">{{ formatDate(article.createdAt) }} · {{ readingTime(article.content) }}閱讀</p>
          </div>
          <!-- 三點選單（無封面時） -->
          <div v-if="!coverPhoto(article) && userData && userData._id === article.userId" class="ml-auto relative">
            <button @click.stop="toggleMenu(article._id)" class="p-2 menu-button text-gray-400 hover:text-gray-600">
              <font-awesome-icon :icon="['fas', 'ellipsis']" />
            </button>
            <div v-if="activeMenuId === article._id" class="absolute right-0 mt-1 bg-white rounded-lg shadow-lg py-1 min-w-[100px] z-10 menu-content">
              <button @click="deleteArticle(article._id); activeMenuId = null" class="w-full text-center px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50">刪除</button>
            </div>
          </div>
        </div>

        <h2 class="text-lg font-bold text-amber-600 mb-1">{{ article.restaurantName }}</h2>
        <h3 class="text-xl font-bold text-gray-800 mb-3">{{ article.title }}</h3>

        <!-- 內文 -->
        <div class="relative">
          <div
            v-html="sanitize(article.content)"
            :class="['prose prose-sm max-w-none text-gray-700', !article.showFullContent && 'line-clamp-4']"
          ></div>
          <button @click="toggleContent(article)" class="text-amber-500 text-sm mt-2 hover:underline">
            {{ article.showFullContent ? "收起" : "繼續閱讀" }}
          </button>
        </div>

        <!-- 互動列 -->
        <div class="flex items-center justify-between mt-4 pt-3 border-t">
          <button
            @click="toggleLike('article', article._id)"
            class="flex items-center gap-1.5 text-sm transition"
            :class="article.isLiked ? 'text-amber-500' : 'text-gray-400 hover:text-amber-500'"
          >
            <font-awesome-icon :icon="[article.isLiked ? 'fas' : 'far', 'thumbs-up']" />
            <span>{{ article.likesCount }}</span>
          </button>
          <button
            @click="article.showComments = !article.showComments"
            class="flex items-center gap-1.5 text-sm text-gray-400 hover:text-amber-500 transition"
          >
            <font-awesome-icon :icon="['far', 'comment']" />
            <span>{{ article.comments?.length || 0 }} 則留言</span>
          </button>
        </div>
      </div>

      <!-- 手機版 (<768px) -->
      <div class="md:hidden">
        <div class="relative">
          <img
            v-if="coverPhoto(article)"
            :src="coverPhoto(article)"
            :alt="article.title"
            class="object-cover w-full h-48"
            loading="lazy"
          />
          <div v-if="coverPhoto(article)" class="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-bold text-white">{{ article.title }}</h2>
              <div v-if="userData && userData._id === article.userId" class="relative">
                <button @click.stop="toggleMenu(article._id)" class="p-1.5 font-bold text-white menu-button">
                  <font-awesome-icon :icon="['fas', 'ellipsis']" />
                </button>
                <div v-if="activeMenuId === article._id" class="absolute right-0 mt-1 bg-white rounded-lg shadow-lg py-1 min-w-[100px] z-10 menu-content">
                  <button @click="deleteArticle(article._id); activeMenuId = null" class="w-full text-center px-4 py-2 text-sm font-medium text-red-500">刪除</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="p-4 space-y-2">
          <div class="flex items-center gap-2 text-xs text-gray-400">
            <img :src="article.userPhoto || '/image/default_user.png'" class="w-6 h-6 rounded-full object-cover" loading="lazy" />
            <span>{{ article.user }}</span>
            <span>·</span>
            <span>{{ formatDate(article.createdAt) }}</span>
            <span>·</span>
            <span>{{ readingTime(article.content) }}</span>
          </div>

          <h3 v-if="!coverPhoto(article)" class="font-bold text-gray-800">{{ article.title }}</h3>
          <p class="text-sm font-medium text-amber-600">{{ article.restaurantName }}</p>

          <div
            v-html="sanitize(article.content)"
            :class="['prose prose-sm max-w-none text-sm text-gray-700', !article.showFullContent && 'line-clamp-3']"
          ></div>
          <button @click="toggleContent(article)" class="text-amber-500 text-sm hover:underline">
            {{ article.showFullContent ? "收起" : "繼續閱讀" }}
          </button>

          <div class="flex items-center gap-4 pt-2 border-t">
            <button @click="toggleLike('article', article._id)" class="flex items-center gap-1 text-sm" :class="article.isLiked ? 'text-amber-500' : 'text-gray-400'">
              <font-awesome-icon :icon="[article.isLiked ? 'fas' : 'far', 'thumbs-up']" />
              <span>{{ article.likesCount }}</span>
            </button>
            <button @click="article.showComments = !article.showComments" class="flex items-center gap-1 text-sm text-gray-400 hover:text-amber-500">
              <font-awesome-icon :icon="['far', 'comment']" />
              <span>{{ article.comments?.length || 0 }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 評論區塊 -->
      <transition name="slide-fade">
        <div v-if="article.showComments" class="px-4 pb-4 border-t pt-4 space-y-4">
          <!-- 留言輸入框 -->
          <div class="space-y-1">
            <div class="flex gap-2">
              <input
                v-model="newComment.content"
                type="text"
                maxlength="200"
                placeholder="寫下你的評論..."
                class="flex-1 px-4 py-2 border rounded-full text-sm focus:outline-none focus:border-amber-500"
                @keyup.enter="addComment(article._id)"
              />
              <button @click="addComment(article._id)" class="px-4 py-2 text-sm text-white bg-amber-500 rounded-full hover:bg-amber-600 transition">
                發送
              </button>
            </div>
            <p class="text-xs pl-4" :class="newComment.content.length >= 190 ? 'text-red-500' : 'text-gray-400'">
              {{ newComment.content.length }}/200
            </p>
          </div>

          <!-- 留言列表 -->
          <div
            v-for="comment in article.comments"
            :id="`comment-${comment._id}`"
            :key="comment._id"
            class="pl-3 border-l-2 border-amber-100 scroll-mt-24"
            :class="{ 'bg-amber-50 border-amber-300 rounded-md py-2 pr-2 transition-colors': highlightedTargetId === `comment-${comment._id}` }"
          >
            <div class="flex items-center gap-2 mb-1">
              <img :src="comment.userPhoto || '/image/default_user.png'" class="w-7 h-7 rounded-full object-cover" loading="lazy" />
              <div>
                <span class="text-sm font-medium">{{ comment.user }}</span>
                <span class="text-xs text-gray-400 ml-2">{{ formatDate(comment.createdAt) }}</span>
              </div>
            </div>
            <p class="text-sm text-gray-700 ml-9 mb-2">{{ comment.content }}</p>

            <div class="flex items-center gap-4 ml-9">
              <button @click="toggleLike('comment', comment._id)" class="flex items-center gap-1 text-xs" :class="comment.isLiked ? 'text-amber-500' : 'text-gray-400 hover:text-amber-500'">
                <font-awesome-icon :icon="[comment.isLiked ? 'fas' : 'far', 'thumbs-up']" />
                <span>{{ comment.likesCount }}</span>
              </button>
              <button @click="toggleReplyForm(comment._id)" class="text-xs text-gray-400 hover:text-amber-500">
                {{ newReply.replyingTo === comment._id ? "取消" : "回覆" }}
              </button>
              <button
                v-if="userData && userData._id === comment.userId"
                @click="deleteComment(article._id, comment._id)"
                class="text-xs text-red-400 hover:text-red-600"
              >
                刪除
              </button>
            </div>

            <!-- 回覆列表 -->
            <div v-if="comment.replies?.length" class="mt-3 ml-9 space-y-2">
              <div
                v-for="reply in comment.replies"
                :id="`reply-${reply._id}`"
                :key="reply._id"
                class="p-2.5 rounded-lg bg-gray-50 scroll-mt-24"
                :class="{ 'bg-amber-50 ring-2 ring-amber-300': highlightedTargetId === `reply-${reply._id}` }"
              >
                <div class="flex items-center gap-2 mb-1">
                  <img :src="reply.userPhoto || '/image/default_user.png'" class="w-6 h-6 rounded-full object-cover" loading="lazy" />
                  <span class="text-xs font-medium">{{ reply.user }}</span>
                  <span class="text-xs text-gray-400">{{ formatDate(reply.createdAt) }}</span>
                </div>
                <p class="text-sm text-gray-700 ml-8">{{ reply.content }}</p>
                <div class="flex items-center gap-3 mt-1.5 ml-8">
                  <button @click="toggleLike('reply', reply._id)" class="flex items-center gap-1 text-xs" :class="reply.isLiked ? 'text-amber-500' : 'text-gray-400 hover:text-amber-500'">
                    <font-awesome-icon :icon="[reply.isLiked ? 'fas' : 'far', 'thumbs-up']" />
                    <span>{{ reply.likesCount }}</span>
                  </button>
                  <button
                    v-if="userData && userData._id === reply.userId"
                    @click="deleteReply(article._id, comment._id, reply._id)"
                    class="text-xs text-red-400 hover:text-red-600"
                  >
                    刪除
                  </button>
                </div>
              </div>
            </div>

            <!-- 回覆表單 -->
            <div v-if="newReply.replyingTo === comment._id" class="mt-2 ml-9">
              <div class="flex gap-2">
                <textarea
                  v-model="newReply.content"
                  rows="2"
                  maxlength="200"
                  placeholder="請發表回覆..."
                  class="flex-1 p-2 text-sm border rounded focus:outline-none focus:border-amber-400"
                ></textarea>
              </div>
              <div class="flex items-center justify-between mt-1">
                <span class="text-xs" :class="newReply.content.length >= 190 ? 'text-red-500' : 'text-gray-400'">
                  {{ newReply.content.length }}/200
                </span>
                <button @click="addReply(article._id, comment._id)" class="px-3 py-1 text-sm text-white bg-amber-500 rounded hover:bg-amber-600">
                  送出
                </button>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </article>

    <!-- 載入更多 -->
    <div v-if="currentPage < totalPages" class="flex justify-center pb-8">
      <button
        @click="loadMore"
        :disabled="isLoading"
        class="px-6 py-2 text-amber-600 border border-amber-400 rounded-full hover:bg-amber-50 transition disabled:opacity-50"
      >
        {{ isLoading ? "載入中..." : "載入更多" }}
      </button>
    </div>
    <div v-else-if="articles.length > 0" class="text-center py-6 text-sm text-gray-400">
      已顯示全部食記
    </div>
  </div>
</template>

<style scoped>
.slide-fade-enter-active,
.slide-fade-leave-active { transition: all 0.3s ease; }
.slide-fade-enter-from,
.slide-fade-leave-to { opacity: 0; transform: translateY(10px); }

.line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.line-clamp-4 { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
</style>
