// 云函数：getRecords
// 查询账本流水，支持分页和筛选
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { bookId, type, page = 1, pageSize = 20 } = event

  try {
    // 获取用户
    const userRes = await db.collection('users').where({ openId: OPENID }).get()
    if (userRes.data.length === 0) return { records: [], summary: {} }
    const userId = userRes.data[0]._id

    // 获取账本信息
    const bookRes = await db.collection('books').doc(bookId).get()
    const book = bookRes.data
    if (!book) return { records: [], summary: {} }

    // 权限校验
    const adminRes = await db.collection('members').where({
      activityId: book.activityId, userId, roleInActivity: 'admin'
    }).get()
    const isAdmin = adminRes.data.length > 0
    
    if (!isAdmin) {
      const memberRes = await db.collection('members').where({
        activityId: book.activityId, userId
      }).get()
      if (memberRes.data.length === 0) return { records: [], summary: {} }
      const member = memberRes.data[0]
      if (member.bookId && member.bookId !== bookId) return { records: [], summary: {} }
    }

    // 构建查询条件
    const query = { bookId }
    if (type) query.type = type

    // 分页查询
    const countRes = await db.collection('records').where(query).count()
    const total = countRes.total

    const skip = (page - 1) * pageSize
    const recordsRes = await db.collection('records')
      .where(query)
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()

    // 计算汇总
    const allRecords = await db.collection('records').where({ bookId }).get()
    const summary = calculateSummary(allRecords.data)

    return {
      records: recordsRes.data,
      summary,
      bookName: book.name,
      total,
      page,
      pageSize,
      hasMore: skip + pageSize < total
    }
  } catch (err) {
    console.error('getRecords error:', err)
    return { records: [], summary: {}, error: err.message }
  }
}

function calculateSummary(records) {
  let totalIncome = 0, totalExpense = 0
  records.forEach(r => {
    if (r.type === 'income' || r.type === 'stockin') {
      totalIncome += r.amount || 0
    } else {
      totalExpense += r.amount || 0
    }
  })
  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense
  }
}
