// 云函数：getSettlePreview
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { bookId, bookType } = event

  try {
    const allRecords = await db.collection('records').where({ bookId }).get()
    const records = allRecords.data

    if (bookType === 'gift') {
      let income = 0, expense = 0
      const giftMap = {}
      records.forEach(r => {
        if (r.type === 'income') {
          income += r.amount || 0
          if (r.items) {
            r.items.forEach(item => {
              if (!giftMap[item.name]) giftMap[item.name] = 0
              giftMap[item.name] += item.quantity || 0
            })
          }
        }
        if (r.type === 'expense') expense += r.amount || 0
      })

      const availableItems = Object.entries(giftMap).map(([name, total]) => ({ name, total }))
      return {
        unsettledCash: income - expense,
        totalGiftCount: Object.values(giftMap).reduce((s, v) => s + v, 0),
        availableItems
      }
    }

    if (bookType === 'warehouse') {
      const stockMap = {}
      records.forEach(r => {
        const name = r.itemName
        if (!name) return
        if (!stockMap[name]) stockMap[name] = 0
        if (r.type === 'stockin') stockMap[name] += r.quantity || 0
        if (r.type === 'stockout') stockMap[name] -= r.quantity || 0
      })
      const availableItems = Object.entries(stockMap)
        .filter(([, s]) => s > 0)
        .map(([name, total]) => ({ name, total }))
      return {
        totalStock: Object.values(stockMap).filter(s => s > 0).reduce((sum, s) => sum + s, 0),
        availableItems
      }
    }

    return { unsettledCash: 0, totalGiftCount: 0, availableItems: [] }
  } catch (err) {
    console.error('getSettlePreview error:', err)
    return { unsettledCash: 0, availableItems: [] }
  }
}
