import { createRouter, createWebHistory } from "vue-router";
import HomePage from "@/views/HomePage.vue";
import UserProfile from "@/views/UserProfile.vue";
import StorePage from "@/views/StorePage.vue";
import SearchPage from "@/views/SearchPage.vue";
import Login from "@/components/Login.vue";
import MyArticle from "@/views/MyArticle.vue";
import ArticleList from "@/views/ArticleList.vue";
import AboutTeam from "@/views/Footer/AboutTeam.vue";
import { useAuth } from "@/stores/authStore";
import { inject } from "vue";
import CreateNoteView from "@/views/CreateNoteView.vue";
import PreviewNoteView from "@/views/PreviewNoteView.vue";
import Dashboard from "@/views/DashboardView.vue";
import StoreCart from "@/views/StoreCartView.vue";
import StoreSignUp from "@/views/StoreSignUp.vue";
import CheckoutPage from "@/views/Checkout/CheckoutPage.vue";
import CheckoutDetail from "@/views/Checkout/CheckoutDetail.vue";
import StoreSignIn from "../views/StoreSignIn.vue";
import Cart from "@/views/Cart.vue";
import Terms from "../views/Footer/Terms.vue";
import Privacy from "../views/Footer/Privacy.vue";

// 店家路由使用懶加載
const MenuManagement = () => import("../views/MenuManagement.vue");
const OrderManagement = () => import("../views/OrderManagement.vue");
const StoreProfile = () => import("../views/StoreProfile.vue");

const routes = [
  { path: "/", name: "home", component: HomePage },
  { path: "/store", name: "store", component: StorePage },
  { path: "/user", name: "user", component: UserProfile, meta: { requiresAuth: false } },
  { path: "/search", name: "search", component: SearchPage },
  { path: "/login", name: "login", component: Login },
  { path: "/myarticle", name: "myArticle", component: MyArticle, meta: { requiresAuth: true } },
  { path: "/articlelist", name: "articlelist", component: ArticleList },
  { path: "/about", name: "about", component: AboutTeam },
  { path: "/createnote", name: "CreateNote", component: CreateNoteView },
  { path: "/previewnote", name: "PreviewNote", component: PreviewNoteView },
  { path: "/storecart/:placeId", name: "storecart", component: StoreCart },
  { path: "/storesignup", name: "storesignup", component: StoreSignUp },
  { path: "/checkout/:orderId", name: "CheckoutPage", component: CheckoutPage },
  { path: "/checkout-detail", name: "CheckoutDetail", component: CheckoutDetail },
  { path: "/storesignin", name: "storesignin", component: StoreSignIn },
  { path: "/Cart", name: "Cart", component: Cart },
  { path: "/terms", name: "Terms", component: Terms },
  { path: "/privacy", name: "Privacy", component: Privacy },

  // 店家後台（需要 storeToken）
  {
    path: "/dashboard",
    name: "dashboard",
    component: Dashboard,
    meta: { requiresStoreAuth: true },
  },
  {
    path: "/menu-management",
    name: "MenuManagement",
    component: MenuManagement,
    meta: { requiresStoreAuth: true },
  },
  {
    path: "/order-management",
    name: "OrderManagement",
    component: OrderManagement,
    meta: { requiresStoreAuth: true },
  },
  {
    path: "/store-profile",
    name: "StoreProfile",
    component: StoreProfile,
    meta: { requiresStoreAuth: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

router.beforeEach((to, from, next) => {
  const user = useAuth();

  if (to.matched.some((record) => record.meta.requiresStoreAuth)) {
    const token = sessionStorage.getItem("storeToken");
    if (!token) {
      next({ name: "storesignin" });
      return;
    }
  }

  if (to.matched.some((record) => record.meta.requiresAuth)) {
    if (!user.userData || Object.keys(user.userData).length === 0) {
      const Swal = inject("$swal");
      if (Swal) {
        Swal.fire({ title: "請先登入！", icon: "error" });
      }
      next({ name: "home" });
      return;
    }
  }

  next();
});

export default router;
