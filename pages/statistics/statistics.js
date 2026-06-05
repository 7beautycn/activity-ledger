// pages/statistics/statistics.js
const util = require('../../utils/util')

Page({
  data: {
    bookId: '',
    bookType: '',
    stats: {
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      categorySummary: [],
      itemSummary: [],
      giftTotal: 0,
      settledCash: 0,
      unsettledCash: 0,
      giftSummary: [],
      inventory: []
    },
    util: util
  },

  onLoad(options) {
    const { bookId, bookType } = options
    this.setData({ bookId, bookType })
    this.loadStatistics()
  },

  async loadStatistics() {
    util.showLoading()
    try {
      const res = await wx.cloud.callFunction({
        name: 'getStatistics',
        data: {
          bookId: this.data.bookId,
          bookType: this.data.bookType
        }
      })
      this.setData({ stats: res.result })
    } catch (err) {
      console.error('加载统计失败', err)
      util.showToast('加载失败')
    }
    util.hideLoading()
  },

  // 导出CSV
  async exportCSV() {
    util.showLoading('生成中...')
    try {
      const res = await wx.cloud.callFunction({
        name: 'exportExcel',
        data: {
          bookId: this.data.bookId
        }
      })
      util.hideLoading()
      
      if (res.result && res.result.downloadUrl) {
        wx.showModal({
          title: '导出成功',
          content: 'CSV文件已生成',
          showCancel: true,
          cancelText: '关闭',
          confirmText: '复制链接',
          success: (modalRes) => {
            if (modalRes.confirm) {
              wx.setClipboardData({
                data: res.result.downloadUrl,
                success: () => util.showToast('链接已复制')
              })
            }
          }
        })
      }
    } catch (err) {
      util.hideLoading()
      util.showToast('导出失败')
    }
  }
})
