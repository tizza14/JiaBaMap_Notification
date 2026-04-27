<script setup>
import { ref } from "vue";
import Swal from "sweetalert2";
import { RouterLink } from "vue-router";
import axios from "axios";
import * as jose from "jose";
import { useRouter } from "vue-router";

const router = useRouter();

const username = ref("");
const password = ref("");

const storeId = ref("");
const placeId = ref("");

const handleLogin = async () => {
  if (username.value && password.value) {
    const resToken = await axios.post(
      `${import.meta.env.VITE_BACKEND_BASE_URL}/auth/store/login`,
      {
        username: username.value,
        password: password.value,
      },
    );

    localStorage.setItem("storeToken", resToken.data.token);
    storeId.value = jose.decodeJwt(resToken.data.token).id;
    placeId.value = jose.decodeJwt(resToken.data.token).placeId;

    await Swal.fire({
      title: "登入成功",
      icon: "success",
      timer: 2000,
      timerProgressBar: true,
    });
    router.push({ name: "dashboard" });
  } else {
    Swal.fire({
      title: "Error",
      text: "登入失敗請再試一次",
      icon: "error",
      confirmButtonText: "OK",
    });
  }
};
</script>

<template>
  <div class="flex items-center justify-center h-screen animated-gradient">
    <div class="w-full max-w-sm p-6 mx-2 bg-white rounded-lg shadow-lg">
      <div class="flex justify-center mb-4">
        <img src="../assets/logo.jpg" alt="Logo" class="h-20" />
      </div>
      <h2 class="mb-2 text-xl font-semibold text-center">店家登入</h2>
      <p class="mb-6 text-sm text-center text-gray-500">
        請先完成<RouterLink
          to="/storesignup"
          class="text-blue-500 hover:underline"
          >註冊</RouterLink
        >，方可登入
      </p>
      <form @submit.prevent="handleLogin">
        <div class="mb-4">
          <label
            for="username"
            class="block mb-1 text-sm font-medium text-gray-700"
            >帳號：</label
          >
          <input
            id="username"
            type="text"
            v-model="username"
            placeholder="請輸入帳號"
            class="w-full px-4 py-2 text-gray-700 border rounded-lg hover:shadow-md focus:outline-orange-300"
            required
          />
        </div>
        <div class="mb-4">
          <label
            for="password"
            class="block mb-1 text-sm font-medium text-gray-700"
            >密碼：</label
          >
          <div class="flex items-center">
            <input
              id="password"
              type="password"
              v-model="password"
              placeholder="請輸入密碼"
              class="w-full px-4 py-2 text-gray-700 border rounded-lg hover:shadow-md focus:outline-orange-300"
              required
            />
            <!--<a href="#" class="ml-2 text-sm text-blue-500 hover:underline">忘記密碼</a>-->
          </div>
        </div>
        <button
          type="submit"
          class="w-full py-2 font-medium text-white bg-orange-400 rounded-lg hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-300"
        >
          立即登入
        </button>
      </form>
      <p class="mt-4 text-sm text-center text-gray-400">
        登入前請參閱我們的
        <router-link to="/terms" class="text-blue-500 hover:underline">服務條款</router-link> 與
        <router-link to="/privacy" class="text-blue-500 hover:underline">隱私政策</router-link>.
      </p>
    </div>
  </div>
</template>

<style>
.animated-gradient {
  background: linear-gradient(
    45deg,
    #ff5005,
    #dbba95,
    #d0bce1,
    #ffee05,
    #ff7e05
  );
  background-size: 300% 300%;
  animation: gradientAnimation 10s ease infinite;
}

@keyframes gradientAnimation {
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
</style>
