<template>
  <div
    v-if="visible && !authStore.userData"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    @click.self="closeModal"
  >
    <div class="bg-white rounded-xl shadow-xl w-[360px] p-6">
      <h1 class="text-center text-lg font-bold mb-4">登入 JiaBaMap</h1>

      <!-- Tabs -->
      <div class="flex border-b border-gray-200 mb-5">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key; isRegisterMode = false; clearForm()"
          class="flex-1 pb-2 text-sm transition-colors"
          :class="activeTab === tab.key
            ? 'border-b-2 border-amber-500 text-amber-600 font-semibold'
            : 'text-gray-400 hover:text-gray-600'"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Google 登入 -->
      <div v-if="activeTab === 'google'" class="flex flex-col items-center gap-4">
        <p class="text-sm text-gray-500">使用 Google 帳號快速登入</p>
        <div id="googleButton"></div>
      </div>

      <!-- Email 登入 / 註冊 -->
      <div v-if="activeTab === 'email'" class="flex flex-col gap-3">
        <template v-if="!isRegisterMode">
          <input v-model="form.email" type="email" placeholder="Email" class="input-field" />
          <input v-model="form.password" type="password" placeholder="密碼" class="input-field" />
          <button @click="handleEmailLogin" class="btn-primary">登入</button>
          <p class="text-center text-xs text-gray-400">
            還沒有帳號？
            <button @click="isRegisterMode = true" class="text-amber-500 hover:underline">立即註冊</button>
          </p>
        </template>
        <template v-else>
          <input v-model="form.name" type="text" placeholder="姓名" class="input-field" />
          <input v-model="form.email" type="email" placeholder="Email" class="input-field" />
          <input v-model="form.password" type="password" placeholder="密碼" class="input-field" />
          <input v-model="form.confirmPassword" type="password" placeholder="確認密碼" class="input-field" />
          <button @click="handleEmailRegister" class="btn-primary">註冊</button>
          <p class="text-center text-xs text-gray-400">
            已有帳號？
            <button @click="isRegisterMode = false" class="text-amber-500 hover:underline">立即登入</button>
          </p>
        </template>
      </div>

      <!-- 錯誤訊息 -->
      <p v-if="errorMsg" class="mt-3 text-center text-xs text-red-500">{{ errorMsg }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from "vue";
import { useAuth } from "@/stores/authStore";

const authStore = useAuth();

const props = defineProps({
  visible: { type: Boolean, default: false },
});
const emit = defineEmits(["close"]);

const tabs = [
  { key: "google", label: "Google 登入" },
  { key: "email",  label: "會員登入" },
];

const activeTab = ref("google");
const isRegisterMode = ref(false);
const errorMsg = ref("");

const form = ref({
  name: "", email: "", password: "", confirmPassword: "",
});

const clearForm = () => {
  Object.keys(form.value).forEach(k => { form.value[k] = "" });
  errorMsg.value = "";
};

const closeModal = () => emit("close");

// ── 動作 ───────────────────────────────────────────────────────────
const handleEmailLogin = async () => {
  errorMsg.value = "";
  try {
    await authStore.emailLogin(form.value.email, form.value.password);
    closeModal();
  } catch (e) {
    errorMsg.value = e.response?.data?.message || "登入失敗，請再試一次";
  }
};

const handleEmailRegister = async () => {
  errorMsg.value = "";
  if (form.value.password !== form.value.confirmPassword) {
    errorMsg.value = "兩次密碼不一致";
    return;
  }
  try {
    await authStore.emailRegister(form.value.name, form.value.email, form.value.password);
    closeModal();
  } catch (e) {
    errorMsg.value = e.response?.data?.message || "註冊失敗，請再試一次";
  }
};

// Google 按鈕初始化
watch(
  () => props.visible,
  (val) => {
    if (val) nextTick(() => authStore.initializeGoogleButton());
  },
);
</script>

<style scoped>
.input-field {
  @apply w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300;
}
.btn-primary {
  @apply w-full bg-amber-500 hover:bg-amber-600 text-white rounded-lg py-2 text-sm font-medium transition-colors;
}
</style>
