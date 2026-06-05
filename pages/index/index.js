// pages/index/index.js
const util = require('../../utils/util')

Page({
  data: {
    activeTab: 'active',
    activities: [],
    loading: true,
    showCreate: false,
    creating: false,
    // 多选删除相关
    deleteMode: false,
    selectedIds: [],
    newActivity: {
      name: '',
      startDate: '',
      endDate: '',
      location: ''
    }
  },

  onLoad() {
    this.loadActivities()
  },

  onShow() {
    this.loadActivities()
  },

  // 切换Tab
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab, deleteMode: false, selectedIds: [] })
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
        loading: false,
        deleteMode: false,
        selectedIds: []
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

  // ===== 导航 =====

  // 统一的点击处理：根据 deleteMode 分发
  onActivityTap(e) {
    if (this.data.deleteMode) {
      this.onSelectItem(e)
    } else {
      this.goToMainBook(e)
    }
  },

  // 点击活动 → 直接进入主账本
  goToMainBook(e) {
    const { id, mainBookId } = e.currentTarget.dataset
    if (!mainBookId) {
      util.showToast('该活动暂无主账本')
      return
    }
    wx.navigateTo({ 
      url: `/pages/book-detail/book-detail?id=${mainBookId}&type=main&activityId=${id}` 
    })
  },

  // 点击设置图标 → 进入活动详情
  onSettingsTap(e) {
    if (this.data.deleteMode) return
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/activity-detail/activity-detail?id=${id}` })
  },

  // ===== 多选删除 =====

  // 长按进入删除模式
  onLongPress(e) {
    const id = e.currentTarget.dataset.id
    wx.vibrateShort()
    this.setData({
      deleteMode: true,
      selectedIds: [id]
    })
  },

  // 点击选中/取消
  onSelectItem(e) {
    const id = e.currentTarget.dataset.id
    let selected = [...this.data.selectedIds]
    const idx = selected.indexOf(id)
    if (idx > -1) {
      selected.splice(idx, 1)
    } else {
      selected.push(id)
    }
    // 如果全部取消选中，退出删除模式
    if (selected.length === 0) {
      this.setData({ deleteMode: false, selectedIds: [] })
    } else {
      this.setData({ selectedIds: selected })
    }
  },

  // 退出删除模式
  exitDeleteMode() {
    this.setData({ deleteMode: false, selectedIds: [] })
  },

  // 批量删除
  async batchDelete() {
    const count = this.data.selectedIds.length
    if (count === 0) return

    const confirmed = await util.showConfirm(
      `确定要删除选中的 ${count} 个活动吗？删除后数据无法恢复。`, 
      '确认删除'
    )
    if (!confirmed) return

    util.showLoading('删除中...')
    let failed = 0
    for (const id of this.data.selectedIds) {
      try {
        const res = await wx.cloud.callFunction({
          name: 'deleteActivity',
          data: { activityId: id }
        })
        if (!res.result || !res.result.success) failed++
      } catch (err) {
        console.error('删除活动失败', id, err)
        failed++
      }
    }
    util.hideLoading()

    if (failed === 0) {
      util.showToast(`已删除 ${count} 个活动`, 'success')
    } else {
      util.showToast(`删除完成，${failed} 个失败`)
    }
    this.setData({ deleteMode: false, selectedIds: [] })
    this.loadActivities()
  }
})
