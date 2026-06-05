// pages/index/index.js
const app = getApp()
const util = require('../../utils/util')

Page({
  data: {
    userInfo: {},
    isLoggedIn: false,
    activeTab: 'active',
    activities: [],
    loading: true,
    showCreate: false,
    creating: false,
    newActivity: {
      name: '',
      startDate: '',
      endDate: '',
      location: ''
    }
  },

  onLoad() {
    this.initLogin()
  },

  onShow() {
    // 每次显示页面时刷新登录状态和活动列表
    this.syncLoginState()
    if (app.globalData.isLoggedIn) {
      this.loadActivities()
    }
  },

  // 初始化登录
  async initLogin() {
    try {
      await app.ensureLogin()
      this.syncLoginState()
      this.loadActivities()
    } catch (err) {
      console.error('登录失败', err)
      this.setData({ loading: false })
    }
  },

  // 同步登录状态到页面 data
  syncLoginState() {
    const userInfo = app.globalData.userInfo
    const isLoggedIn = app.globalData.isLoggedIn
    this.setData({
      userInfo: userInfo || {},
      isLoggedIn: !!isLoggedIn
    })
  },

  // 点击用户区域 → 如果未登录则触发登录
  async onTapUser() {
    if (this.data.isLoggedIn) {
      // 已登录，可以跳转到个人信息页（暂未实现，仅提示）
      util.showToast('已登录：' + (this.data.userInfo.nickName || '微信用户'))
      return
    }
    // 未登录，重新登录
    util.showLoading('登录中...')
    try {
      await app.ensureLogin()
      this.syncLoginState()
      this.loadActivities()
      util.showToast('登录成功', 'success')
    } catch (err) {
      console.error('登录失败', err)
      util.showToast('登录失败，请重试')
    }
    util.hideLoading()
  },

  // 切换Tab
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
    this.loadActivities()
  },

  // 加载活动列表
  async loadActivities() {
    util.showLoading('加载中...')
    try {
      const res = await wx.cloud.callFunction({
        name: 'getActivities',
        data: { status: this.data.activeTab }
      })
      this.setData({
        activities: res.result.activities || [],
        loading: false
      })
    } catch (err) {
      console.error('加载活动失败', err)
      this.setData({ loading: false })
      util.showToast('加载失败')
    }
    util.hideLoading()
  },

  // 显示创建弹窗（先检查登录状态）
  showCreateDialog() {
    if (!this.data.isLoggedIn) {
      util.showToast('请先点击上方头像登录')
      return
    }
    this.setData({ showCreate: true })
  },

  // 隐藏创建弹窗
  hideCreateDialog() {
    this.setData({ showCreate: false })
  },

  stopPropagation() {},

  // 表单输入
  onActivityNameInput(e) {
    this.setData({ 'newActivity.name': e.detail.value })
  },
  onStartDateChange(e) {
    this.setData({ 'newActivity.startDate': e.detail.value })
  },
  onEndDateChange(e) {
    this.setData({ 'newActivity.endDate': e.detail.value })
  },
  onLocationInput(e) {
    this.setData({ 'newActivity.location': e.detail.value })
  },

  // 创建活动
  async createActivity() {
    if (!this.data.isLoggedIn) {
      util.showToast('请先登录')
      return
    }
    const { name, startDate } = this.data.newActivity
    if (!name.trim()) {
      util.showToast('请输入活动名称')
      return
    }
    if (!startDate) {
      util.showToast('请选择开始日期')
      return
    }
    
    this.setData({ creating: true })
    try {
      await wx.cloud.callFunction({
        name: 'createActivity',
        data: this.data.newActivity
      })
      util.showToast('创建成功', 'success')
      this.setData({
        showCreate: false,
        creating: false,
        'newActivity.name': '',
        'newActivity.startDate': '',
        'newActivity.endDate': '',
        'newActivity.location': ''
      })
      this.loadActivities()
    } catch (err) {
      console.error('创建失败', err)
      this.setData({ creating: false })
      util.showToast('创建失败，请重试')
    }
  },

  // 跳转到活动详情
  goToActivity(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/activity-detail/activity-detail?id=${id}` })
  }
})
