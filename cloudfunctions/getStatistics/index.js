// 云函数：getStatistics
// 根据账本类型返回统计数据
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { bookId, bookType } = event

  try {
    const allRecords = await db.collection('records').where({ bookId }).get()
    const records = allRecords.data

    if (bookType === 'main') {
      return getMainBookStats(records)
    } else if (bookType === 'gift') {
      return getGiftBookStats(records)
    } else if (bookType === 'warehouse') {
      return getWarehouseStats(records)
    }

    return {}
  } catch (err) {
    console.error('getStatistics error:', err)
    return { error: err.message }
  }
}

function getMainBookStats(records) {
  let totalIncome = 0, totalExpense = 0
  const categoryMap = {}

  records.forEach(r => {
    if (r.type === 'income' || r.type === 'stockin') {
      totalIncome += r.amount || 0
    } else {
      totalExpense += r.amount || 0
    }
    
    // 按分类汇总
    if (r.category && r.type === 'expense') {
      if (!categoryMap[r.category]) categoryMap[r.category] = 0
      categoryMap[r.category] += r.amount || 0
    }
  })

  const totalExpenseForPercent = totalExpense || 1
  const categorySummary = Object.entries(categoryMap).map(([category, total]) => ({
    category,
    total,
    percent: Math.round((total / totalExpenseForPercent) * 100)
  })).sort((a, b) => b.total - a.total)

  // 物品消耗汇总
  const itemMap = {}
  records.forEach(r => {
    if (r.items && Array.isArray(r.items)) {
      r.items.forEach(item => {
        if (!itemMap[item.name]) itemMap[item.name] = { totalQuantity: 0, unit: item.unit || '个' }
        itemMap[item.name].totalQuantity += item.quantity || 0
      })
    }
  })
  const itemSummary = Object.entries(itemMap).map(([name, data]) => ({
    name,
    totalQuantity: data.totalQuantity,
    unit: data.unit
  })).sort((a, b) => b.totalQuantity - a.totalQuantity)

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    categorySummary,
    itemSummary,
    recordCount: records.length
  }
}

function getGiftBookStats(records) {
  let giftTotal = 0, settledCash = 0
  const giftMap = {}

  records.forEach(r => {
    if (r.type === 'income') {
      giftTotal += r.amount || 0
      if (r.items) {
        r.items.forEach(item => {
          if (!giftMap[item.name]) giftMap[item.name] = 0
          giftMap[item.name] += item.quantity || 0
        })
      }
    }
    if (r.type === 'expense' && r.category === '结账转出') {
      settledCash += r.amount || 0
    }
  })

  const giftSummary = Object.entries(giftMap).map(([name, totalQuantity]) => ({
    name, totalQuantity
  })).sort((a, b) => b.totalQuantity - a.totalQuantity)

  return {
    totalIncome: giftTotal,
    totalExpense: settledCash,
    balance: giftTotal - settledCash,
    giftTotal,
    settledCash,
    unsettledCash: giftTotal - settledCash,
    giftSummary,
    recordCount: records.length
  }
}

function getWarehouseStats(records) {
  const inventoryMap = {}

  records.forEach(r => {
    const name = r.itemName
    if (!name) return
    if (!inventoryMap[name]) inventoryMap[name] = { stock: 0, unit: r.unit || '个' }
    if (r.type === 'stockin') {
      inventoryMap[name].stock += r.quantity || 0
    } else if (r.type === 'stockout') {
      inventoryMap[name].stock -= r.quantity || 0
    }
  })

  const inventory = Object.entries(inventoryMap).map(([name, data]) => ({
    name, stock: data.stock, unit: data.unit
  }))

  const totalStock = inventory.reduce((sum, i) => sum + Math.max(0, i.stock), 0)

  return {
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    inventory,
    totalStock,
    recordCount: records.length
  }
}
