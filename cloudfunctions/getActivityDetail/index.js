// 云函数：getActivityDetail
// 获取活动详情、账本列表、权限信息
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { activityId } = event

  try {
    const userRes = await db.collection('users').where({ openId: OPENID }).get()
    if (userRes.data.length === 0) {
      return { success: false, error: '用户未登录' }
    }
    const userId = userRes.data[0]._id

    // 检查用户是否为活动成员
    const memberRes = await db.collection('members').where({ activityId, userId }).get()
    if (memberRes.data.length === 0) {
      return { success: false, error: '无权访问此活动' }
    }
    const member = memberRes.data[0]
    const isAdmin = member.roleInActivity === 'admin'

    // 获取活动信息
    const activityRes = await db.collection('activities').doc(activityId).get()
    
    // 获取账本列表
    let booksQuery = db.collection('books').where({ activityId })
    if (!isAdmin && member.bookId) {
      // 非管理员且有限定账本，只返回指定账本
      booksQuery = booksQuery.where({ _id: member.bookId })
    }
    const booksRes = await booksQuery.get()

    // 获取每个账本的负责人名称
    const books = await Promise.all(booksRes.data.map(async (book) => {
      let ownerName = '未知'
      if (book.ownerId) {
        try {
          const ownerRes = await db.collection('users').doc(book.ownerId).get()
          ownerName = ownerRes.data?.nickName || '未知'
        } catch (e) {}
      }
      return { ...book, ownerName }
    }))

    // 获取成员列表
    const membersRes = await db.collection('members').where({ activityId }).get()
    const members = await Promise.all(membersRes.data.map(async (m) => {
      let nickName = '未知用户', avatarUrl = ''
      try {
        const uRes = await db.collection('users').doc(m.userId).get()
        nickName = uRes.data?.nickName || '未知用户'
        avatarUrl = uRes.data?.avatarUrl || ''
      } catch (e) {}
      return { ...m, nickName, avatarUrl }
    }))

    return {
      success: true,
      activity: activityRes.data,
      books,
      members,
      isAdmin,
      memberCount: members.length
    }
  } catch (err) {
    console.error('getActivityDetail error:', err)
    return { success: false, error: err.message }
  }
}
