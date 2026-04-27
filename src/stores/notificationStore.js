import { defineStore } from 'pinia'
import { ref } from 'vue'
import { io } from 'socket.io-client'
import axios from 'axios'

const BACKEND_URL = import.meta.env.VITE_BACKEND_BASE_URL
const MAX_NOTIFICATIONS = 50

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref([])
  const unreadCount = ref(0)
  const isConnected = ref(false)
  let socket = null

  const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem('userToken')}`
  })

  async function fetchNotifications(userId) {
    if (!userId) return
    try {
      const { data } = await axios.get(`${BACKEND_URL}/notification/${userId}`, {
        headers: authHeader()
      })
      notifications.value = data
        .sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt))
        .slice(0, MAX_NOTIFICATIONS)
      unreadCount.value = notifications.value.filter(n => !n.read).length
    } catch (e) {
      console.error('fetchNotifications error:', e)
    }
  }

  async function markAsRead(notificationId) {
    const n = notifications.value.find(n => n._id === notificationId)
    if (!n || n.read) return
    // optimistic update
    n.read = true
    unreadCount.value = Math.max(0, unreadCount.value - 1)
    try {
      await axios.patch(`${BACKEND_URL}/notification/read/${notificationId}`, {}, {
        headers: authHeader()
      })
    } catch (e) {
      // rollback
      n.read = false
      unreadCount.value++
      console.error('markAsRead error:', e)
    }
  }

  async function markAllAsRead(userId) {
    if (!userId) return
    const prevStates = notifications.value.map(n => n.read)
    const prevCount = unreadCount.value
    // optimistic update
    notifications.value.forEach(n => { n.read = true })
    unreadCount.value = 0
    try {
      await axios.patch(`${BACKEND_URL}/notification/${userId}/read-all`, {}, {
        headers: authHeader()
      })
    } catch (e) {
      // rollback
      notifications.value.forEach((n, i) => { n.read = prevStates[i] })
      unreadCount.value = prevCount
      console.error('markAllAsRead error:', e)
    }
  }

  function initSocket(userId) {
    if (!userId) return
    // 已連線則直接加入房間，不重複建立連線
    if (socket?.connected) {
      socket.emit('join', userId)
      return
    }

    const token = localStorage.getItem('userToken')
    if (!token) return

    socket = io(BACKEND_URL, {
      auth: { token },
      withCredentials: true,
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    })

    socket.on('connect', () => {
      isConnected.value = true
      socket.emit('join', userId)
    })

    socket.on('connect_error', () => {
      isConnected.value = false
    })

    socket.on('disconnect', reason => {
      isConnected.value = false
      if (reason === 'io server disconnect') socket.connect()
    })

    socket.on('newNotification', ({ notification }) => {
      if (!notification) return
      notifications.value.unshift(notification)
      if (notifications.value.length > MAX_NOTIFICATIONS) notifications.value.pop()
      unreadCount.value++
      sendBrowserNotification(notification)
    })

    socket.on('readNotification', ({ notificationId }) => {
      const n = notifications.value.find(n => n._id === notificationId)
      if (n && !n.read) {
        n.read = true
        unreadCount.value = Math.max(0, unreadCount.value - 1)
      }
    })

    socket.on('readAllNotifications', () => {
      notifications.value.forEach(n => { n.read = true })
      unreadCount.value = 0
    })

    socket.connect()
  }

  function disconnectSocket() {
    socket?.disconnect()
    socket = null
    isConnected.value = false
    notifications.value = []
    unreadCount.value = 0
  }

  function sendBrowserNotification(notification) {
    if ('Notification' in window && window.Notification.permission === 'granted') {
      new window.Notification('新通知', {
        body: getNotificationMessage(notification.actionType),
        icon: notification.userImg || notification.metadata?.userImg || '/default-avatar.jpg'
      })
    }
  }

  function getNotificationMessage(actionType) {
    const messages = {
      comment: '評論了你的貼文',
      like: '對你的貼文按讚',
      reply: '回覆了你的評論'
    }
    return messages[actionType] || '與你互動'
  }

  return {
    notifications,
    unreadCount,
    isConnected,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    initSocket,
    disconnectSocket,
    getNotificationMessage
  }
})
