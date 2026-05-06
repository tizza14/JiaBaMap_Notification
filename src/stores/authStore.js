import { defineStore } from "pinia";
import { inject, ref, watch } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";
import * as jose from "jose";
import { useNotificationStore } from "./notificationStore";

const BACKEND_URL = import.meta.env.VITE_BACKEND_BASE_URL;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_LOGIN_KEY;
const GOOGLE_SCRIPT_MAX_RETRIES = 20;
const GOOGLE_SCRIPT_RETRY_DELAY = 250;

const initSession = () => {
  const token = localStorage.getItem("userToken");
  if (token) {
    try {
      const { exp, id } = jose.decodeJwt(token);
      if (exp && exp * 1000 < Date.now()) {
        localStorage.removeItem("userToken");
        localStorage.removeItem("userData");
        return { userData: null, userId: "" };
      }
      return {
        userData: JSON.parse(localStorage.getItem("userData")) || null,
        userId: id || "",
      };
    } catch {
      localStorage.removeItem("userToken");
      localStorage.removeItem("userData");
      return { userData: null, userId: "" };
    }
  }
  return { userData: null, userId: "" };
};

export const useAuth = defineStore("auth", () => {
  const { userData: initialUserData, userId: initialUserId } = initSession();
  const userData = ref(initialUserData);
  const router = useRouter();
  const Swal = inject("$swal");
  const userId = ref(initialUserId);

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

  const waitForGoogleAccounts = (retries = GOOGLE_SCRIPT_MAX_RETRIES) => new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve(window.google.accounts.id);
      return;
    }

    if (retries <= 0) {
      reject(new Error("Google login script is not available."));
      return;
    }

    setTimeout(() => {
      waitForGoogleAccounts(retries - 1).then(resolve).catch(reject);
    }, GOOGLE_SCRIPT_RETRY_DELAY);
  });

  const initializeGoogleButton = async () => {
    const buttonContainer = document.querySelector("#googleButton");
    if (buttonContainer) buttonContainer.innerHTML = "";
    if (!buttonContainer) return;

    if (!GOOGLE_CLIENT_ID) {
      console.error("VITE_GOOGLE_LOGIN_KEY is missing.");
      Swal?.fire({
        title: "Google 登入尚未設定",
        text: "請設定 VITE_GOOGLE_LOGIN_KEY",
        icon: "error",
      });
      return;
    }

    try {
      const googleId = await waitForGoogleAccounts();
      googleId.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      });

      googleId.renderButton(buttonContainer, {
        type: "standard",
        shape: "pill",
        theme: "outline",
        size: "large",
      });
    } catch (err) {
      console.error("Failed to initialize Google login button:", err);
      Swal?.fire({
        title: "Google 登入載入失敗",
        text: "請確認網路連線或稍後再試",
        icon: "error",
      });
    }
  };

  const _handleToken = async (token) => {
    localStorage.setItem("userToken", token);
    userId.value = jose.decodeJwt(token).id;
    await getUserdata();
  };

  const handleCredentialResponse = async (response) => {
    try {
      if (!response?.credential) {
        throw new Error("Google credential is missing.");
      }

      const resToken = await axios.post(`${BACKEND_URL}/auth/user/login/google`, {
        credential: response.credential,
      });
      await _handleToken(resToken.data.token);
      Swal?.fire({ title: "登入成功", icon: "success", timer: 2000, timerProgressBar: true });
    } catch (err) {
      console.error("Google login failed:", err);
      Swal?.fire({
        title: "Google 登入失敗",
        text: err.response?.data?.message || "請確認 Google 登入設定後再試一次",
        icon: "error",
      });
    }
  };

  const getUserdata = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/user/${userId.value}`);
      userData.value = response.data;
    } catch (err) {
      console.error("Failed to fetch user data:", err);
    }
  };

  const emailLogin = async (email, password) => {
    const res = await axios.post(`${BACKEND_URL}/auth/user/login`, { email, password });
    await _handleToken(res.data.token);
    Swal?.fire({ title: "登入成功", icon: "success", timer: 2000, timerProgressBar: true });
  };

  const emailRegister = async (name, email, password) => {
    const res = await axios.post(`${BACKEND_URL}/auth/user/register`, { name, email, password });
    await _handleToken(res.data.token);
    Swal?.fire({ title: "註冊成功", icon: "success", timer: 2000, timerProgressBar: true });
  };

  const logout = () => {
    useNotificationStore().disconnectSocket();
    userData.value = null;
    userId.value = "";
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
