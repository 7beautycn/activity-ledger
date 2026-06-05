// 云函数：settleBook
// 子账本结账操作
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { bookId, bookType, activityId, cashAmount = 0, items = [] } = event

  try {
    // 权限校验
    let userRes = await db.collection('users').where({ openId: OPENID }).get()
    if (userRes.data.length === 0) {
      await db.collection('users').add({
        data: { openId: OPENID, nickName: '微信用户', avatarUrl: '', role: 'viewer', createTime: db.serverDate() }
      })
      userRes = await db.collection('users').where({ openId: OPENID }).get()
    }
    const userId = userRes.data[0]._id

    const canSettle = await checkSettlePermission(db, activityId, userId, bookId)
    if (!canSettle) return { success: false, error: '无权限执行结账' }

    // 获取账本
    const bookRes = await db.collection('books').doc(bookId).get()
    const book = bookRes.data

    // 获取主事人总账本
    const mainBookRes = await db.collection('books').where({
      activityId, type: 'main'
    }).get()
    if (mainBookRes.data.length === 0) return { success: false, error: '未找到总账本' }
    const mainBookId = mainBookRes.data[0]._id

    // 计算未结现金（针对收礼账本）
    if (bookType === 'gift') {
      const allRecords = await db.collection('records').where({ bookId }).get()
      const unsettledCash = calculateUnsettledCash(allRecords.data)
      
      if (cashAmount > unsettledCash) {
        return { success: false, error: `转交金额(${cashAmount})不能超过未结现金(${unsettledCash})` }
      }
    }

    const now = db.serverDate()

    // 如果是收礼账本且有现金转交，生成支出记录
    if (bookType === 'gift' && cashAmount > 0) {
      await db.collection('records').add({
        data: {
          bookId,
          type: 'expense',
          category: '结账转出',
          amount: cashAmount,
          person: '结账转交',
          paymentMethod: '结账',
          remark: `转交给主事人总账本`,
          createdBy: userId,
          createdAt: now
        }
      })
    }

    // 生成物品出库记录
    for (const item of items) {
      if (bookType === 'gift') {
        await db.collection('records').add({
          data: {
            bookId,
            type: 'expense',
            category: '礼品转出',
            amount: 0,
            items: [{ name: item.name, quantity: item.quantity, unit: '个' }],
            remark: '转交给主事人',
            createdBy: userId,
            createdAt: now
          }
        })
      } else if (bookType === 'warehouse') {
        await db.collection('records').add({
          data: {
            bookId,
            type: 'stockout',
            itemName: item.name,
            quantity: item.quantity,
            unit: '个',
            purpose: '结账转交',
            receiver: '主事人',
            remark: '转交给主事人总账本',
            createdBy: userId,
            createdAt: now
          }
        })
      }
    }

    // 创建结账记录
    const transferRes = await db.collection('transfers').add({
      data: {
        fromBookId: bookId,
        toBookId: mainBookId,
        cashAmount,
        items,
        transferTime: now,
        operatorId: userId
      }
    })

    return {
      success: true,
      cashAmount,
      items,
      transferTime: new Date().toLocaleString(),
      transferId: transferRes._id
    }
  } catch (err) {
    console.error('settleBook error:', err)
    return { success: false, error: err.message }
  }
}

async function checkSettlePermission(db, activityId, userId, bookId) {
  const adminRes = await db.collection('members').where({
    activityId, userId, roleInActivity: 'admin'
  }).get()
  if (adminRes.data.length > 0) return true

  const memberRes = await db.collection('members').where({
    activityId, userId, bookId
  }).get()
  return memberRes.data.length > 0 && memberRes.data[0].roleInActivity === 'editor'
}

function calculateUnsettledCash(records) {
  let income = 0, expense = 0
  records.forEach(r => {
    if (r.type === 'income') income += r.amount || 0
    if (r.type === 'expense') expense += r.amount || 0
  })
  return income - expense
}
