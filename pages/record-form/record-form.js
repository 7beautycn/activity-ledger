// pages/record-form/record-form.js
const util = require('../../utils/util')

Page({
  data: {
    bookId: '',
    bookType: '',
    recordType: '',
    activityId: '',
    pageTitle: '',
    submitting: false,
    showQR: false,
    qrCodeUrl: '',
    form: {
      person: '',
      amount: '',
      category: '',
      remark: '',
      hasGift: false,
      gifts: [],
      attachments: [],
      items: [],
      itemName: '',
      quantity: '',
      price: '',
      purpose: '',
      receiver: '',
      createdAt: util.formatDate(new Date())
    },
    formDate: util.formatDate(new Date()),
    // 选项
    paymentMethods: util.PAYMENT_METHODS,
    paymentMethodIndex: 0,
    incomeTypes: util.INCOME_TYPES,
    incomeTypeIndex: 0,
    expenseCategories: util.EXPENSE_CATEGORIES,
    expenseCategoryIndex: 0,
    units: util.UNITS,
    unitIndex: 0,
    sourceTypes: util.SOURCE_TYPES,
    sourceIndex: 0,
    subBookNames: [],
    subBookIndex: 0
  },

  onLoad(options) {
    const { bookId, bookType, recordType, activityId } = options
    let pageTitle = '记账'

    switch (bookType) {
      case 'main':
        pageTitle = recordType === 'income' ? '记收入' : recordType === 'expense' ? '记支出' : '物品入库'
        break
      case 'gift':
        pageTitle = '登记收礼'
        break
      case 'warehouse':
        pageTitle = recordType === 'stockin' ? '物品入库' : '物品出库'
        break
    }

    this.setData({ bookId, bookType, recordType, activityId, pageTitle })
    wx.setNavigationBarTitle({ title: pageTitle })

    if (bookType === 'gift' || (bookType === 'main' && recordType === 'income')) {
      this.loadQRCode()
    }
    if (bookType === 'main' && recordType === 'income') {
      this.loadSubBooks()
    }
  },

  // 加载收款码
  async loadQRCode() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getActivitySettings',
        data: { activityId: this.data.activityId }
      })
      // 根据当前收款方式显示对应收款码
      if (res.result && res.result.wxPayQR) {
        this.setData({ qrCodeUrl: res.result.wxPayQR })
      }
    } catch (err) {
      console.error('加载收款码失败', err)
    }
  },

  // 加载子账本列表（用于收入来源选择）
  async loadSubBooks() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getSubBooks',
        data: { activityId: this.data.activityId }
      })
      this.setData({
        subBookNames: res.result.names || [],
        subBookIndex: 0
      })
    } catch (err) {
      console.error('加载子账本失败', err)
    }
  },

  // 通用表单输入
  onFieldInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  // 日期选择
  onDateChange(e) {
    this.setData({
      formDate: e.detail.value,
      'form.createdAt': e.detail.value
    })
  },

  // 收款方式
  onPaymentMethodChange(e) {
    this.setData({ paymentMethodIndex: parseInt(e.detail.value) })
    this.loadQRCode()
  },

  // 收入类型
  onIncomeTypeChange(e) {
    this.setData({ incomeTypeIndex: parseInt(e.detail.value) })
  },

  // 支出分类
  onExpenseCategoryChange(e) {
    this.setData({ expenseCategoryIndex: parseInt(e.detail.value) })
  },

  // 单位
  onUnitChange(e) {
    this.setData({ unitIndex: parseInt(e.detail.value) })
  },

  // 来源
  onSourceChange(e) {
    this.setData({ sourceIndex: parseInt(e.detail.value) })
  },

  // 子账本选择
  onSubBookChange(e) {
    this.setData({ subBookIndex: parseInt(e.detail.value) })
  },

  // 是否有礼品
  onHasGiftChange(e) {
    this.setData({ 'form.hasGift': e.detail.value })
    if (e.detail.value && this.data.form.gifts.length === 0) {
      this.addGift()
    }
  },

  // 添加礼品
  addGift() {
    const gifts = this.data.form.gifts
    gifts.push({ name: '', quantity: 1 })
    this.setData({ 'form.gifts': gifts })
  },

  // 删除礼品
  removeGift(e) {
    const gifts = this.data.form.gifts
    gifts.splice(e.currentTarget.dataset.index, 1)
    this.setData({ 'form.gifts': gifts })
  },

  // 礼品字段输入
  onGiftFieldInput(e) {
    const { index, field } = e.currentTarget.dataset
    this.setData({ [`form.gifts[${index}].${field}`]: e.detail.value })
  },

  // 支出物品
  addExpenseItem() {
    const items = this.data.form.items
    items.push({ name: '', quantity: '', price: '' })
    this.setData({ 'form.items': items })
  },

  removeExpenseItem(e) {
    const items = this.data.form.items
    items.splice(e.currentTarget.dataset.index, 1)
    this.setData({ 'form.items': items })
  },

  onExpenseItemInput(e) {
    const { index, field } = e.currentTarget.dataset
    this.setData({ [`form.items[${index}].${field}`]: e.detail.value })
  },

  // 上传附件
  uploadAttach() {
    wx.chooseImage({
      count: 9 - this.data.form.attachments.length,
      sizeType: ['compressed'],
      success: async (res) => {
        util.showLoading('上传中...')
        const urls = []
        for (const path of res.tempFilePaths) {
          try {
            const cloudPath = `attachments/${this.data.activityId}/${Date.now()}_${Math.random().toString(36).substr(2, 8)}.jpg`
            const uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath: path })
            urls.push(uploadRes.fileID)
          } catch (err) {
            console.error('上传失败', err)
          }
        }
        this.setData({ 'form.attachments': [...this.data.form.attachments, ...urls] })
        util.hideLoading()
      }
    })
  },

  previewAttach(e) {
    wx.previewImage({ urls: [e.currentTarget.dataset.src] })
  },

  // 显示收款码
  showQRCode() {
    this.setData({ showQR: true })
  },
  hideQRCode() {
    this.setData({ showQR: false })
  },

  stopPropagation() {},

  // 提交记录
  async submitRecord() {
    const { bookType, recordType, form, paymentMethodIndex, incomeTypeIndex, 
            expenseCategoryIndex, unitIndex, sourceIndex, subBookIndex } = this.data

    // 构建记录数据
    let recordData = {
      bookId: this.data.bookId,
      activityId: this.data.activityId,
      remark: form.remark,
      createdAt: form.createdAt ? new Date(form.createdAt).toISOString() : new Date().toISOString()
    }

    if (bookType === 'gift' && recordType === 'gift') {
      if (!form.person.trim()) { util.showToast('请输入姓名'); return }
      if (form.amount === '' || isNaN(Number(form.amount))) { util.showToast('请输入有效金额'); return }
      
      recordData.type = 'income'
      recordData.category = '礼金'
      recordData.person = form.person
      recordData.amount = Number(form.amount)
      recordData.paymentMethod = util.PAYMENT_METHODS[paymentMethodIndex]
      
      if (form.hasGift) {
        recordData.items = form.gifts.filter(g => g.name.trim()).map(g => ({
          name: g.name,
          quantity: Number(g.quantity) || 1,
          unit: '个'
        }))
      }
    }
    else if (bookType === 'main' && recordType === 'income') {
      if (form.amount === '' || isNaN(Number(form.amount))) { util.showToast('请输入有效金额'); return }
      
      recordData.type = 'income'
      recordData.category = util.INCOME_TYPES[incomeTypeIndex]
      recordData.amount = Number(form.amount)
      recordData.attachments = form.attachments
      
      if (incomeTypeIndex === 1 && this.data.subBookNames.length > 0) {
        recordData.sourceBookName = this.data.subBookNames[subBookIndex]
      }
    }
    else if (bookType === 'main' && recordType === 'expense') {
      if (form.amount === '' || isNaN(Number(form.amount))) { util.showToast('请输入有效金额'); return }
      
      recordData.type = 'expense'
      recordData.category = util.EXPENSE_CATEGORIES[expenseCategoryIndex]
      recordData.amount = Number(form.amount)
      recordData.items = form.items.filter(i => i.name.trim()).map(i => ({
        name: i.name,
        quantity: Number(i.quantity) || 0,
        price: Number(i.price) || 0
      }))
    }
    else if (bookType === 'main' && recordType === 'stockin') {
      if (!form.itemName.trim()) { util.showToast('请输入物品名称'); return }
      if (!form.quantity || Number(form.quantity) <= 0) { util.showToast('请输入有效数量'); return }
      
      recordData.type = 'stockin'
      recordData.itemName = form.itemName
      recordData.quantity = Number(form.quantity)
      recordData.unit = util.UNITS[unitIndex]
      recordData.price = form.price ? Number(form.price) : 0
      recordData.source = util.SOURCE_TYPES[sourceIndex]
    }
    else if (bookType === 'warehouse') {
      if (!form.itemName.trim()) { util.showToast('请输入物品名称'); return }
      if (!form.quantity || Number(form.quantity) <= 0) { util.showToast('请输入有效数量'); return }
      
      recordData.type = recordType === 'stockin' ? 'stockin' : 'stockout'
      recordData.itemName = form.itemName
      recordData.quantity = Number(form.quantity)
      recordData.unit = util.UNITS[unitIndex]
      
      if (recordType === 'stockin') {
        recordData.price = form.price ? Number(form.price) : 0
        recordData.source = util.SOURCE_TYPES[sourceIndex]
      } else {
        recordData.purpose = form.purpose
        recordData.receiver = form.receiver
      }
    }

    this.setData({ submitting: true })
    try {
      await wx.cloud.callFunction({
        name: 'addRecord',
        data: recordData
      })
      util.showToast('记录成功', 'success')
      setTimeout(() => wx.navigateBack(), 1000)
    } catch (err) {
      console.error('提交失败', err)
      util.showToast('提交失败，请重试')
    }
    this.setData({ submitting: false })
  }
})
