// 云函数：getMembers
// 获取活动成员列表
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { activityId } = event

  try {
    const userRes = await db.collection('users').where({ openId: OPENID }).get()
    if (userRes.data.length === 0) return { members: [], isAdmin: false }
    const userId = userRes.data[0]._id

    // 权限校验
    const adminRes = await db.collection('members').where({
      activityId, userId, roleInActivity: 'admin'
    }).get()
    const isAdmin = adminRes.data.length > 0
    if (!isAdmin) return { members: [], isAdmin: false, error: '只有主事人可查看成员' }

    // 获取成员列表
    const membersRes = await db.collection('members').where({ activityId }).get()
    const members = await Promise.all(membersRes.data.map(async (m) => {
      let nickName = '未知用户', avatarUrl = '', bookName = '全部账本'
      try {
        const uRes = await db.collection('users').doc(m.userId).get()
        nickName = uRes.data?.nickName || '未知用户'
        avatarUrl = uRes.data?.avatarUrl || ''
      } catch (e) {}
      if (m.bookId) {
        try {
          const bRes = await db.collection('books').doc(m.bookId).get()
          bookName = bRes.data?.name || '未知账本'
        } catch (e) {}
      }
      return { ...m, nickName, avatarUrl, bookName }
    }))

    // 获取账本列表
    const booksRes = await db.collection('books').where({ activityId }).get()

    return { members, books: booksRes.data, isAdmin }
  } catch (err) {
    console.error('getMembers error:', err)
    return { members: [], isAdmin: false, error: err.message }
  }
}
