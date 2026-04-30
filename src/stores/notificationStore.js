import { defineStore } from 'pinia'
import { ref } from 'vue'
import { io } from 'socket.io-client'
import axios from 'axios'

const BACKEND_URL = import.meta.env.VITE_BACKEND_BASE_URL?.replace(/\/+$/, '')
const MAX_NOTIFICATIONS = 50

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref([])
  const unreadCount = ref(0)
  const isConnected = ref(false)
  const activeTokenType = ref('user')
  let socket = null

  const authHeader = (type = activeTokenType.value) => {
    const token = type === 'store'
      ? localStorage.getItem('storeToken')
      : localStorage.getItem('userToken')

    return {
      Authorization: `Bearer ${token}`
    }
  }

  async function fetchNotifications(userId, type = activeTokenType.value) {
    if (!userId) return
    activeTokenType.value = type
    try {
      const { data } = await axios.get(`${BACKEND_URL}/notification/${userId}`, {
        headers: authHeader(type)
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
    const notification = notifications.value.find(n => n._id === notificationId)
    if (!notification || notification.read) return

    notification.read = true
    unreadCount.value = Math.max(0, unreadCount.value - 1)

    try {
      await axios.patch(`${BACKEND_URL}/notification/read/${notificationId}`, {}, {
        headers: authHeader()
      })
    } catch (e) {
      notification.read = false
      unreadCount.value++
      console.error('markAsRead error:', e)
    }
  }

  async function markAllAsRead(userId) {
    if (!userId) return

    const prevStates = notifications.value.map(n => n.read)
    const prevCount = unreadCount.value
    notifications.value.forEach(n => { n.read = true })
    unreadCount.value = 0

    try {
      await axios.patch(`${BACKEND_URL}/notification/${userId}/read-all`, {}, {
        headers: authHeader()
      })
    } catch (e) {
      notifications.value.forEach((n, i) => { n.read = prevStates[i] })
      unreadCount.value = prevCount
      console.error('markAllAsRead error:', e)
    }
  }

  function initSocket(userId, type = 'user') {
    if (!userId) return
    activeTokenType.value = type

    if (socket?.connected) {
      socket.emit('join', userId)
      return
    }

    const token = type === 'store' 
      ? localStorage.getItem('storeToken') 
      : localStorage.getItem('userToken')
    
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
      const notification = notifications.value.find(n => n._id === notificationId)
      if (notification && !notification.read) {
        notification.read = true
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
      const message = getNotificationMessage(
        notification.actionType,
        notification.metadata,
        notification.relatedType
      )
      new window.Notification('呷飽地圖通知', {
        body: message,
        icon: notification.userImg || notification.metadata?.userImg || '/public/favicon.jpg'
      })
    }
  }

  function getNotificationMessage(actionType, metadata = {}, relatedType = '') {
    const relatedMessages = {
      article_like: '有人按讚了你的文章',
      article_comment: '有人留言了你的文章',
      article_comment_like: '有人按讚了你的留言',
      article_comment_reply: '有人回覆了你的留言',
      article_reply_like: '有人按讚了你的回覆',
      restaurant_comment: '有人評論了你的餐廳',
      restaurant_comment_like: '有人按讚了你的評論',
    }

    if (relatedMessages[relatedType]) return relatedMessages[relatedType]

    if (actionType === 'new_order') {
      return `收到來自 ${metadata.userName || '顧客'} 的新訂單！`
    }
    if (actionType === 'order_status') {
      return `您的訂單狀態更新為：${metadata.statusText || '處理中'}`
    }
    if (actionType === 'like') return '有人按讚了你的內容'
    if (actionType === 'comment') return '有人留下了評論'
    if (actionType === 'reply') return '有人回覆了你'

    return '你有新的通知'
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
