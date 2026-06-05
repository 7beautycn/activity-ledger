/**
 * 公共活动共享账本 - 工具函数
 */

/**
 * 格式化时间
 */
const formatTime = date => {
  if (!date) return ''
  // 兼容字符串格式的时间戳
  if (typeof date === 'string' || typeof date === 'number') {
    date = new Date(date)
  }
  if (isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}`
}

const pad = n => n < 10 ? `0${n}` : `${n}`

/**
 * 格式化日期 (YYYY-MM-DD)
 */
const formatDate = date => {
  if (!date) return ''
  // 兼容字符串格式的时间戳
  if (typeof date === 'string' || typeof date === 'number') {
    date = new Date(date)
  }
  if (isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${year}-${pad(month)}-${pad(day)}`
}

/**
 * 格式化金额
 */
const formatMoney = (amount, decimals = 2) => {
  if (amount === null || amount === undefined) return '0.00'
  return Number(amount).toFixed(decimals)
}

/**
 * 账本类型映射
 */
const BOOK_TYPES = {
  main: { label: '总账本', icon: '📒', tagClass: 'tag-main' },
  gift: { label: '收礼账本', icon: '🎁', tagClass: 'tag-gift' },
  warehouse: { label: '仓库账本', icon: '📦', tagClass: 'tag-warehouse' }
}

/**
 * 支出分类预设
 */
const EXPENSE_CATEGORIES = ['场地', '食物', '礼仪', '交通', '采购', '人工', '其他']

/**
 * 收入类型预设（总账本）
 */
const INCOME_TYPES = ['主家备用金', '子账本结账转入', '礼金', '其他']

/**
 * 收款方式
 */
const PAYMENT_METHODS = ['现金', '微信', '支付宝']

/**
 * 单位预设
 */
const UNITS = ['个', '斤', '公斤', '箱', '件', '瓶', '袋', '包', '套', '份', '台', '条', '盒']

/**
 * 来源预设（仓库入库）
 */
const SOURCE_TYPES = ['采购', '收礼转入', '其他']

/**
 * 生成唯一ID
 */
const generateId = () => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 防抖
 */
const debounce = (fn, delay = 300) => {
  let timer = null
  return function (...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}

/**
 * 显示Toast
 */
const showToast = (title, icon = 'none') => {
  wx.showToast({ title, icon, duration: 2000 })
}

/**
 * 显示加载
 */
const showLoading = (title = '加载中...') => {
  wx.showLoading({ title, mask: true })
}

/**
 * 隐藏加载
 */
const hideLoading = () => {
  wx.hideLoading()
}

/**
 * 确认弹窗
 */
const showConfirm = (content, title = '提示') => {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      success: res => resolve(res.confirm)
    })
  })
}

module.exports = {
  formatTime,
  formatDate,
  formatMoney,
  BOOK_TYPES,
  EXPENSE_CATEGORIES,
  INCOME_TYPES,
  PAYMENT_METHODS,
  UNITS,
  SOURCE_TYPES,
  generateId,
  debounce,
  showToast,
  showLoading,
  hideLoading,
  showConfirm
}
