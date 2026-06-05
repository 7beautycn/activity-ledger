// pages/book-detail/book-detail.js
const util = require('../../utils/util')

Page({
  data: {
    bookId: '',
    bookType: '',
    activityId: '',
    bookName: '',
    typeLabel: '',
    tagClass: '',
    canWrite: false,
    canDelete: false,
    loading: true,
    records: [],
    summary: {
      totalIncome: 0,
      totalExpense: 0,
      balance: 0
    },
    filterOptions: ['全部', '收入', '支出'],
    filterIndex: 0,
    pageSize: 20,
    currentPage: 1,
    hasMore: false,
    util: util
  },

  onLoad(options) {
    const { id, type, activityId } = options
    const bookTypeInfo = util.BOOK_TYPES[type] || util.BOOK_TYPES.main
    
    this.setData({
      bookId: id,
      bookType: type,
      activityId: activityId,
      typeLabel: bookTypeInfo.label,
      tagClass: bookTypeInfo.tagClass,
      bookName: '账本详情' // 后续加载时更新
    })

    if (type === 'warehouse') {
      this.setData({ filterOptions: ['全部', '入库', '出库'] })
    }

    this.loadData()
    this.checkPermission()
  },

  async loadData(append = false) {
    if (!append) util.showLoading()
    
    try {
      const filter = this.data.filterIndex === 0 ? null : 
        this.data.bookType === 'warehouse' ?
          (this.data.filterIndex === 1 ? 'income' : 'expense') :
          (this.data.filterIndex === 1 ? 'income' : 'expense')

      const res = await wx.cloud.callFunction({
        name: 'getRecords',
        data: {
          bookId: this.data.bookId,
          type: filter,
          page: this.data.currentPage,
          pageSize: this.data.pageSize
        }
      })
      
      const result = res.result
      const records = (result.records || []).map(r => ({
        ...r,
        createdAtStr: util.formatTime(r.createdAt)
      }))
      this.setData({
        records: append ? [...this.data.records, ...records] : records,
        summary: result.summary || this.data.summary,
        bookName: result.bookName || this.data.bookName,
        hasMore: result.hasMore || false,
        loading: false
      })
    } catch (err) {
      console.error('加载失败', err)
      this.setData({ loading: false })
      util.showToast('加载失败')
    }
    util.hideLoading()
  },

  async checkPermission() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'checkPermission',
        data: {
          activityId: this.data.activityId,
          bookId: this.data.bookId
        }
      })
      this.setData({
        canWrite: res.result.canWrite || false,
        canDelete: res.result.canDelete || false
      })
    } catch (err) {
      console.error('权限检查失败', err)
    }
  },

  // 筛选
  onFilterChange(e) {
    this.setData({
      filterIndex: parseInt(e.detail.value),
      currentPage: 1
    })
    this.loadData()
  },

  // 加载更多
  loadMore() {
    this.setData({ currentPage: this.data.currentPage + 1 })
    this.loadData(true)
  },

  // 跳转记账
  goToRecord(e) {
    const recordType = e.currentTarget.dataset.type
    wx.navigateTo({
      url: `/pages/record-form/record-form?bookId=${this.data.bookId}&bookType=${this.data.bookType}&recordType=${recordType}&activityId=${this.data.activityId}`
    })
  },

  // 跳转结账
  goToSettle() {
    wx.navigateTo({
      url: `/pages/settle/settle?bookId=${this.data.bookId}&bookType=${this.data.bookType}&activityId=${this.data.activityId}`
    })
  },

  // 跳转活动详情（从主账本）
  goToActivityDetail() {
    wx.navigateTo({
      url: `/pages/activity-detail/activity-detail?id=${this.data.activityId}`
    })
  },

  // 跳转统计
  goToStatistics() {
    wx.navigateTo({
      url: `/pages/statistics/statistics?bookId=${this.data.bookId}&bookType=${this.data.bookType}`
    })
  },

  // 删除记录
  async deleteRecord(e) {
    const id = e.currentTarget.dataset.id
    const confirmed = await util.showConfirm('确定要删除这条记录吗？')
    if (!confirmed) return

    try {
      await wx.cloud.callFunction({
        name: 'deleteRecord',
        data: { recordId: id, bookId: this.data.bookId }
      })
      util.showToast('已删除', 'success')
      this.loadData()
    } catch (err) {
      util.showToast('删除失败')
    }
  }
})
