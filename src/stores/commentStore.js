import { defineStore } from "pinia";
import { ref } from "vue";
import axios from "axios";
import { useStore } from "@/stores/storePage";

export const useCommentStore = defineStore("commentStore", () => {
  const store = useStore();
  const comments = ref([]);
  // const addComment = (newComment) => {
  //     comments.value.unshift(newComment)
  // }

  const getComment = async () => {
    const response = await axios.get(
      `${import.meta.env.VITE_BACKEND_BASE_URL}/comments/restaurant/${
        store.placesId
      }`,
    );
    comments.value = response.data;

    const userRes = await Promise.allSettled(
      comments.value.map((comment) =>
        axios.get(
          `${import.meta.env.VITE_BACKEND_BASE_URL}/user/${comment.userId}`,
        ),
      ),
    );
    comments.value = comments.value.map((comment, index) => {
      const result = userRes[index];
      const user = result.status === "fulfilled" ? result.value.data : {};
      return {
        ...comment,
        name: user.name || "匿名",
        avatar: user.profilePicture || null,
      };
    });
  };
  return {
    comments,
    getComment,
    // addComment,
  };
});
