// pages/settle/settle.js
const util = require('../../utils/util')

Page({
  data: {
    bookId: '',
    bookType: '',
    activityId: '',
    settling: false,
    settleCash: '',
    settleItems: [],
    availableItems: [],
    settleResult: null,
    summary: {
      unsettledCash: 0,
      totalGiftCount: 0,
      totalStock: 0
    },
    util: util
  },

  onLoad(options) {
    const { bookId, bookType, activityId } = options
    this.setData({ bookId, bookType, activityId })
    this.loadSummary()
  },

  async loadSummary() {
    util.showLoading()
    try {
      const res = await wx.cloud.callFunction({
        name: 'getSettlePreview',
        data: { bookId: this.data.bookId, bookType: this.data.bookType }
      })
      const data = res.result
      this.setData({
        summary: {
          unsettledCash: data.unsettledCash || 0,
          totalGiftCount: data.totalGiftCount || 0,
          totalStock: data.totalStock || 0
        },
        availableItems: data.availableItems || []
      })
    } catch (err) {
      console.error('加载失败', err)
      util.showToast('加载失败')
    }
    util.hideLoading()
  },

  onCashInput(e) {
    this.setData({ settleCash: e.detail.value })
  },

  addItem() {
    this.setData({ settleItems: [...this.data.settleItems, { name: '', quantity: '' }] })
  },

  removeItem(e) {
    const idx = e.currentTarget.dataset.index
    const items = this.data.settleItems
    items.splice(idx, 1)
    this.setData({ settleItems: items })
  },

  onItemInput(e) {
    const { index, field } = e.currentTarget.dataset
    this.setData({ [`settleItems[${index}].${field}`]: e.detail.value })
  },

  pickFromAvailable(e) {
    const item = e.currentTarget.dataset.item
    const exists = this.data.settleItems.find(i => i.name === item.name)
    if (exists) {
      util.showToast('该物品已在列表中')
      return
    }
    this.setData({
      settleItems: [...this.data.settleItems, { name: item.name, quantity: item.total }]
    })
  },

  // 执行结账
  async doSettle() {
    const { bookType, settleCash, settleItems, summary } = this.data

    if (bookType === 'gift') {
      if (!settleCash || isNaN(Number(settleCash)) || Number(settleCash) <= 0) {
        util.showToast('请输入有效转交金额')
        return
      }
      if (Number(settleCash) > summary.unsettledCash) {
        util.showToast('转交金额不能超过未结现金')
        return
      }
    }

    const confirmed = await util.showConfirm('确认执行结账操作？结账后不可撤销。')
    if (!confirmed) return

    this.setData({ settling: true })
    try {
      const res = await wx.cloud.callFunction({
        name: 'settleBook',
        data: {
          bookId: this.data.bookId,
          bookType: this.data.bookType,
          activityId: this.data.activityId,
          cashAmount: bookType === 'gift' ? Number(settleCash) : 0,
          items: settleItems.filter(i => i.name.trim()).map(i => ({
            name: i.name,
            quantity: Number(i.quantity) || 1
          }))
        }
      })
      this.setData({
        settleResult: res.result,
        settling: false
      })
      util.showToast('结账成功', 'success')
    } catch (err) {
      console.error('结账失败', err)
      this.setData({ settling: false })
      util.showToast('结账失败：' + (err.errMsg || '未知错误'))
    }
  },

  // 预览结账单（以canvas绘制）
  previewSettle() {
    if (!this.data.settleResult) return
    // 简单的文本预览，实际项目可用canvas绘制
    const result = this.data.settleResult
    let content = `结账单\n\n`
    content += `现金：${util.formatMoney(result.cashAmount)} 元\n`
    if (result.items && result.items.length > 0) {
      content += `物品：\n`
      result.items.forEach(item => {
        content += `  ${item.name} x${item.quantity}\n`
      })
    }
    content += `\n时间：${result.transferTime || ''}`
    
    wx.showModal({
      title: '结账单',
      content,
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 导出为图片（简化实现，实际可用canvas绘制后保存）
  exportSettleImage() {
    util.showToast('导出功能开发中，请截图保存')
  }
})
