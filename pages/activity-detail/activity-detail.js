// pages/activity-detail/activity-detail.js
const util = require('../../utils/util')

Page({
  data: {
    activityId: '',
    activity: {},
    books: [],
    members: [],
    memberNames: [],
    isAdmin: false,
    memberCount: 0,
    loading: true,
    showCreateBook: false,
    creating: false,
    bookTypeOptions: ['收礼账本 (gift)', '仓库账本 (warehouse)'],
    newBookTypeIndex: 0,
    newBookName: '',
    selectedMemberIndex: -1
  },

  onLoad(options) {
    this.setData({ activityId: options.id })
    this.loadData()
  },

  onShow() {
    if (this.data.activityId) {
      this.loadData()
    }
  },

  async loadData() {
    util.showLoading()
    try {
      const res = await wx.cloud.callFunction({
        name: 'getActivityDetail',
        data: { activityId: this.data.activityId }
      })
      const data = res.result
      const books = (data.books || []).map(b => ({
        ...b,
        icon: util.BOOK_TYPES[b.type]?.icon || '📒',
        tagClass: util.BOOK_TYPES[b.type]?.tagClass || 'tag-main',
        typeLabel: util.BOOK_TYPES[b.type]?.label || '总账本'
      }))
      
      this.setData({
        activity: data.activity || {},
        books,
        isAdmin: data.isAdmin || false,
        memberCount: data.memberCount || 0,
        members: data.members || [],
        memberNames: (data.members || []).map(m => m.nickName || '未知用户'),
        loading: false
      })
    } catch (err) {
      console.error('加载失败', err)
      this.setData({ loading: false })
      util.showToast('加载失败')
    }
    util.hideLoading()
  },

  // 跳转账本详情
  goToBook(e) {
    const { id, type } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/book-detail/book-detail?id=${id}&type=${type}&activityId=${this.data.activityId}` })
  },

  // 跳转成员管理
  goToMembers() {
    wx.navigateTo({ url: `/pages/members/members?id=${this.data.activityId}` })
  },

  // 归档活动
  async archiveActivity() {
    const confirmed = await util.showConfirm('确定要归档此活动吗？归档后将不在首页显示。')
    if (!confirmed) return
    
    try {
      await wx.cloud.callFunction({
        name: 'archiveActivity',
        data: { activityId: this.data.activityId }
      })
      util.showToast('已归档', 'success')
      this.loadData()
    } catch (err) {
      util.showToast('操作失败')
    }
  },

  // 上传收款码
  uploadQR(e) {
    const type = e.currentTarget.dataset.type
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      success: async (res) => {
        util.showLoading('上传中...')
        try {
          const cloudPath = `qrcodes/${this.data.activityId}/${type}_${Date.now()}.png`
          const uploadRes = await wx.cloud.uploadFile({
            cloudPath,
            filePath: res.tempFilePaths[0]
          })
          
          await wx.cloud.callFunction({
            name: 'updateActivitySettings',
            data: {
              activityId: this.data.activityId,
              key: type,
              value: uploadRes.fileID
            }
          })
          util.hideLoading()
          util.showToast('上传成功', 'success')
          this.loadData()
        } catch (err) {
          util.hideLoading()
          util.showToast('上传失败')
        }
      }
    })
  },

  // 预览图片
  previewImage(e) {
    wx.previewImage({ urls: [e.currentTarget.dataset.src] })
  },

  // 创建子账本弹窗
  showCreateBookDialog() {
    if (this.data.members.length === 0) {
      util.showToast('请先邀请成员')
      return
    }
    this.setData({ showCreateBook: true, selectedMemberIndex: -1 })
  },
  hideCreateBookDialog() {
    this.setData({ showCreateBook: false })
  },
  stopPropagation() {},
  onBookTypeChange(e) {
    this.setData({ newBookTypeIndex: parseInt(e.detail.value) })
  },
  onBookNameInput(e) {
    this.setData({ newBookName: e.detail.value })
  },
  onMemberChange(e) {
    this.setData({ selectedMemberIndex: parseInt(e.detail.value) })
  },

  // 创建子账本
  async createSubBook() {
    if (this.data.selectedMemberIndex < 0) {
      util.showToast('请选择负责人')
      return
    }
    
    const bookTypes = ['gift', 'warehouse']
    const member = this.data.members[this.data.selectedMemberIndex]
    
    this.setData({ creating: true })
    try {
      await wx.cloud.callFunction({
        name: 'createSubBook',
        data: {
          activityId: this.data.activityId,
          type: bookTypes[this.data.newBookTypeIndex],
          name: this.data.newBookName || this.data.bookTypeOptions[this.data.newBookTypeIndex],
          ownerId: member.userId
        }
      })
      util.showToast('创建成功', 'success')
      this.setData({
        showCreateBook: false,
        creating: false,
        newBookName: ''
      })
      this.loadData()
    } catch (err) {
      this.setData({ creating: false })
      util.showToast('创建失败')
    }
  }
})
