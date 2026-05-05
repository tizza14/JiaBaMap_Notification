<script setup>
import { ref, onMounted, onBeforeUnmount, inject, watch } from "vue";
import { useAuth } from "../stores/authStore";
import axios from "axios";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();
const auth = useAuth();
const $swal = inject("$swal");
const articles = ref([]);
const isLoading = ref(false);

const swal = $swal.mixin({
  customClass: {
    confirmButton: "bg-red-500 text-white px-6 py-2 rounded mx-2 hover:bg-red-600",
    cancelButton: "bg-gray-500 text-white px-6 py-2 rounded mx-2 hover:bg-gray-600",
    actions: "flex justify-center gap-4",
  },
  buttonsStyling: false,
});

// 從 DB 載入草稿（需要登入），合併 localStorage 草稿
const loadDrafts = async () => {
  isLoading.value = true;
  const allDrafts = [];

  // 1. DB 草稿（需要登入）
  if (auth.userData?._id) {
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_BACKEND_BASE_URL}/articles/drafts/${auth.userData._id}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("userToken")}` } }
      );
      data.forEach((d) => allDrafts.push({ ...d, source: "db" }));
    } catch {
      // 靜默失敗
    }
  }

  // 2. localStorage 草稿（未登入也能看）
  const localData = localStorage.getItem("formData");
  if (localData) {
    try {
      const parsed = JSON.parse(localData);
      // 若 DB 已有同 draftId 則不重複顯示
      const alreadyInDb = allDrafts.some((d) => d._id === parsed.draftId);
      if (!alreadyInDb) {
        allDrafts.push({
          id: parsed.draftId || "local",
          title: parsed.title || "未命名草稿",
          restaurantName: parsed.restaurantName || "",
          createdAt: new Date().toISOString(),
          source: "local",
          localData: parsed,
        });
      }
    } catch {
      // 靜默失敗
    }
  }

  articles.value = allDrafts;
  isLoading.value = false;
};

// 從資料庫讀取已發布文章
const loadPublishedArticles = async () => {
  if (!auth.userData?._id) {
    await swal.fire({ title: "提醒", text: "請先登入後再查看已發佈文章", icon: "warning", confirmButtonText: "確定" });
    return;
  }
  isLoading.value = true;
  try {
    const { data } = await axios.get(
      `${import.meta.env.VITE_BACKEND_BASE_URL}/articles/published/${auth.userData._id}`
    );
    articles.value = data;
  } catch {
    await swal.fire({ title: "錯誤", text: "載入已發佈文章失敗", icon: "error", confirmButtonText: "確定" });
  } finally {
    isLoading.value = false;
  }
};

// 編輯草稿
const editDraft = (article) => {
  if (article.source === "db") {
    router.push({ path: "/createnote", query: { draftId: article._id } });
  } else {
    const draftId = article.id || "local";
    if (article.localData) {
      localStorage.setItem(`draft_${draftId}`, JSON.stringify(article.localData));
    }
    router.push({ path: "/createnote", query: { draftId } });
  }
};

// 編輯已發佈文章
const editPublishedArticle = (articleId) => {
  router.push({ path: "/createnote", query: { id: articleId, type: "published" } });
};

// 刪除文章（統一）
const deleteArticle = async (articleId = null) => {
  const result = await swal.fire({
    title: "確定要刪除嗎？", text: "刪除後將無法恢復！", icon: "warning",
    showCancelButton: true, confirmButtonText: "確定刪除", cancelButtonText: "取消", reverseButtons: true,
  });
  if (!result.isConfirmed) return;

  try {
    if (route.query.status === "published") {
      await axios.delete(`${import.meta.env.VITE_BACKEND_BASE_URL}/articles/${articleId}`);
      await loadPublishedArticles();
    } else {
      // 刪除草稿：DB + localStorage
      if (articleId && articleId !== "local") {
        try {
          await axios.delete(`${import.meta.env.VITE_BACKEND_BASE_URL}/articles/${articleId}`);
        } catch { /* 可能是 local-only 草稿 */ }
      }
      // 只有當 localStorage 草稿對應到這筆才一起清除
      const localRaw = localStorage.getItem("formData");
      if (localRaw) {
        try {
          const parsed = JSON.parse(localRaw);
          if (!articleId || articleId === "local" || parsed.draftId === articleId) {
            localStorage.removeItem("formData");
          }
        } catch {
          localStorage.removeItem("formData");
        }
      }
      // 清除 MyArticle.vue 編輯本地草稿時暫存的 draft_* key
      if (articleId && articleId !== "local") {
        localStorage.removeItem(`draft_${articleId}`);
      }
      await loadDrafts();
    }

    await swal.fire({
      title: "已刪除！",
      text: route.query.status === "published" ? "文章已成功刪除" : "草稿已成功刪除",
      icon: "success", timer: 1500, showConfirmButton: false,
    });
  } catch {
    await swal.fire({ title: "錯誤", text: "刪除失敗，請稍後再試", icon: "error", confirmButtonText: "確定" });
  }
};

// 監聽 tab 切換
watch(
  () => route.query.status,
  (newStatus) => {
    if (newStatus === "published") {
      loadPublishedArticles();
    } else {
      loadDrafts();
    }
  },
  { immediate: true }
);

const windowWidth = ref(window.innerWidth);
const handleResize = () => { windowWidth.value = window.innerWidth; };

onMounted(() => {
  window.addEventListener("resize", handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", handleResize);
});
</script>

<template>
  <div class="container px-4 py-8 mx-auto">
    <div
      class="flex items-center justify-between mb-8"
      :class="{ 'mt-24': windowWidth < 768, 'mt-20': windowWidth >= 768 && windowWidth < 1167 }"
    >
      <h1 class="text-2xl font-bold">我的食記</h1>
      <button
        @click="router.push({ path: '/createnote', query: { from: 'articleList' } })"
        class="px-4 py-2 text-white transition rounded bg-amber-400 hover:bg-amber-500"
      >
        撰寫食記
      </button>
    </div>

    <!-- Tab 切換 -->
    <div class="flex mb-8 space-x-2 border-b">
      <router-link
        :to="{ query: { status: 'draft' } }"
        class="px-4 py-2 rounded-t text-sm font-medium transition"
        :class="route.query.status !== 'published' ? 'bg-amber-400 text-white' : 'text-gray-600 hover:bg-gray-100'"
      >
        草稿
      </router-link>
      <router-link
        :to="{ query: { status: 'published' } }"
        class="px-4 py-2 rounded-t text-sm font-medium transition"
        :class="route.query.status === 'published' ? 'bg-amber-400 text-white' : 'text-gray-600 hover:bg-gray-100'"
      >
        已發佈
      </router-link>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <div class="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <!-- 無文章 -->
    <div v-else-if="articles.length === 0" class="py-12 text-center text-gray-400">
      目前沒有{{ route.query.status === "published" ? "已發佈的文章" : "草稿" }}
    </div>

    <!-- 文章列表 -->
    <div v-else class="space-y-4">
      <div
        v-for="article in articles"
        :key="article._id || article.id"
        class="p-4 bg-white rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow duration-200"
        @click="route.query.status === 'published' ? editPublishedArticle(article._id) : editDraft(article)"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1 min-w-0">
            <h2 class="mb-1 text-lg font-semibold truncate">{{ article.title || "無標題" }}</h2>
            <p class="mb-1 text-sm text-gray-500 truncate">{{ article.restaurantName || "未指定餐廳" }}</p>
            <div class="flex items-center gap-3 text-xs text-gray-400">
              <span>{{ route.query.status === "published" ? "發佈時間" : "最後編輯" }}：{{ new Date(article.updatedAt || article.createdAt).toLocaleString("zh-TW") }}</span>
              <span v-if="article.source === 'local'" class="px-2 py-0.5 bg-yellow-100 text-yellow-600 rounded">本機草稿</span>
            </div>
          </div>
          <div class="flex gap-2 ml-4 flex-shrink-0">
            <button
              @click.stop="route.query.status === 'published' ? editPublishedArticle(article._id) : editDraft(article)"
              class="px-3 py-1.5 text-sm border-2 rounded border-amber-400 text-amber-500 hover:bg-amber-400 hover:text-white transition"
            >
              編輯
            </button>
            <button
              @click.stop="deleteArticle(article._id || article.id)"
              class="px-3 py-1.5 text-sm text-red-500 border-2 border-red-400 rounded hover:bg-red-500 hover:text-white transition"
            >
              刪除
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
