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

const routes = [
  {
    path: "/",
    name: "home",
    component: HomePage,
  },
  {
    path: "/store",
    name: "store",
    component: StorePage,
  },
  {
    path: "/user",
    name: "user",
    component: UserProfile,
    meta: { requiresAuth: false },
  },
  {
    path: "/search",
    name: "search",
    component: SearchPage,
  },
  {
    path: "/login",
    name: "login",
    component: Login,
  },
  {
    path: "/myarticle",
    name: "myArticle",
    component: MyArticle,
    meta: { requiresAuth: true },
  },
  {
    path: "/articlelist",
    name: "articlelist",
    component: ArticleList,
  },
  {
    path: "/about",
    name: "about",
    component: AboutTeam,
  },
  {
    path: "/createnote",
    name: "CreateNote",
    component: CreateNoteView,
  },
  {
    path: "/previewnote",
    name: "PreviewNote",
    component: PreviewNoteView,
  },
  {
    path: "/dashboard",
    name: "dashboard",
    component: Dashboard,
  },
  {
    path: "/storecart",
    name: "storecart",
    component: StoreCart,
  },
  {
    path: "/storesignup",
    name: "storesignup",
    component: StoreSignUp,
  },
  {
    path: "/menu-management",
    name: "MenuManagement",
    component: () => import("../views/MenuManagement.vue"),
  },
  {
    path: "/checkout/:orderId",
    name: "CheckoutPage",
    component: CheckoutPage,
  },
  {
    path: "/checkout-detail",
    name: "CheckoutDetail",
    component: CheckoutDetail,
  },
  {
    path: "/storesignin",
    name: "storesignin",
    component: StoreSignIn,
  },
  {
    path: "/Cart",
    name: "Cart",
    component: Cart,
  },
  {
    path: "/terms",
    name: "Terms",
    component: Terms,
  },
  {
    path: "/privacy",
    name: "Privacy",
    component: Privacy,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // 滾動到頂部
    return { top: 0 };
  },
});
router.beforeEach((to, from, next) => {
  const user = useAuth();
  const Swal = inject("$swal");

  if (to.matched.some((record) => record.meta.requiresAuth)) {
    if (!user.userData || Object.keys(user.userData).length === 0) {
      Swal.fire({
        title: "請先登入！",
        icon: "error",
      });
      next({ name: "home" });
    } else {
      next();
    }
  } else {
    next();
  }
});

export default router;
