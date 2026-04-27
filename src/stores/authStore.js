import { defineStore } from "pinia";
import { inject, ref, watch } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";
import * as jose from "jose";
import { useNotificationStore } from "./notificationStore";

const BACKEND_URL = import.meta.env.VITE_BACKEND_BASE_URL;

export const useAuth = defineStore("auth", () => {
  const userData = ref(JSON.parse(localStorage.getItem("userData")) || null);
  const router = useRouter();
  const Swal = inject("$swal");
  const userId = ref("");

  watch(
    userData,
    (newValue) => {
      if (newValue) {
        localStorage.setItem("userData", JSON.stringify(newValue));
      } else {
        localStorage.removeItem("userData");
      }
    },
    { deep: true },
  );

  const setPicture = (newPicture) => {
    if (userData.value) {
      userData.value.profilePicture = newPicture;
      localStorage.setItem("userData", JSON.stringify(userData.value));
    }
  };

  const initializeGoogleButton = () => {
    const buttonContainer = document.querySelector("#googleButton");
    if (buttonContainer) buttonContainer.innerHTML = "";

    if (window.google && window.google.accounts) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_LOGIN_KEY,
        callback: handleCredentialResponse,
      });
    }

    window.google.accounts.id.renderButton(buttonContainer, {
      type: "standard",
      shape: "pill",
      theme: "outline",
      size: "large",
    });
  };

  // ── 內部：token 存入 + 取得使用者資料 ───────────────────────────
  const _handleToken = async (token) => {
    localStorage.setItem("userToken", token);
    userId.value = jose.decodeJwt(token).id;
    await getUserdata();
  };

  const handleCredentialResponse = async (response) => {
    const resToken = await axios.post(`${BACKEND_URL}/auth/user/login/google`, response);
    await _handleToken(resToken.data.token);
    Swal.fire({ title: "登入成功", icon: "success", timer: 2000, timerProgressBar: true });
  };

  const getUserdata = async () => {
    const response = await axios.get(`${BACKEND_URL}/user/${userId.value}`);
    userData.value = response.data;
  };

  // ── 一般用戶：Email 登入 ─────────────────────────────────────────
  const emailLogin = async (email, password) => {
    const res = await axios.post(`${BACKEND_URL}/auth/user/login`, { email, password });
    await _handleToken(res.data.token);
    Swal.fire({ title: "登入成功", icon: "success", timer: 2000, timerProgressBar: true });
  };

  // ── 一般用戶：Email 註冊 ─────────────────────────────────────────
  const emailRegister = async (name, email, password) => {
    const res = await axios.post(`${BACKEND_URL}/auth/user/register`, { name, email, password });
    await _handleToken(res.data.token);
    Swal.fire({ title: "註冊成功", icon: "success", timer: 2000, timerProgressBar: true });
  };

  const logout = () => {
    useNotificationStore().disconnectSocket();
    userData.value = null;
    localStorage.removeItem("userData");
    localStorage.removeItem("userToken");
    router.push({ name: "home" });
  };

  return {
    userData,
    userId,
    setPicture,
    initializeGoogleButton,
    emailLogin,
    emailRegister,
    getUserdata,
    logout,
  };
});
