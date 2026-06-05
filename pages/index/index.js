// pages/index/index.js
const app = getApp()
const util = require('../../utils/util')

Page({
  data: {
    userInfo: {},
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
    this.loadUserInfo()
    this.loadActivities()
  },

  onShow() {
    this.loadActivities()
  },

  // 加载用户信息
  loadUserInfo() {
    const userInfo = app.globalData.userInfo
    if (userInfo) {
      this.setData({ userInfo })
    }
    // 等待登录完成后刷新
    setTimeout(() => {
      if (app.globalData.userInfo) {
        this.setData({ userInfo: app.globalData.userInfo })
      }
    }, 1500)
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

  // 显示创建弹窗
  showCreateDialog() {
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
