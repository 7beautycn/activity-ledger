// 云函数：deleteRecord
// 删除记账记录
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { recordId, bookId } = event

  try {
    const userRes = await db.collection('users').where({ openId: OPENID }).get()
    if (userRes.data.length === 0) return { success: false, error: '未登录' }
    const userId = userRes.data[0]._id

    // 获取账本
    const bookRes = await db.collection('books').doc(bookId).get()
    const book = bookRes.data

    // 只有主事人可以删除
    const adminRes = await db.collection('members').where({
      activityId: book.activityId, userId, roleInActivity: 'admin'
    }).get()
    if (adminRes.data.length === 0) return { success: false, error: '只有主事人可删除' }

    await db.collection('records').doc(recordId).remove()
    return { success: true }
  } catch (err) {
    console.error('deleteRecord error:', err)
    return { success: false, error: err.message }
  }
}
