// 云函数：createSubBook
// 创建子账本（gift/warehouse）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { activityId, type, name, ownerId } = event

  if (!activityId || !type || !ownerId) {
    return { success: false, error: '参数不完整' }
  }

  if (!['gift', 'warehouse'].includes(type)) {
    return { success: false, error: '无效的账本类型' }
  }

  try {
    // 校验权限：只有活动主事人可创建
    const userRes = await db.collection('users').where({ openId: OPENID }).get()
    if (userRes.data.length === 0) return { success: false, error: '用户未登录' }
    const userId = userRes.data[0]._id

    const memberRes = await db.collection('members').where({ activityId, userId, roleInActivity: 'admin' }).get()
    if (memberRes.data.length === 0) {
      return { success: false, error: '只有主事人可以创建子账本' }
    }

    // 创建子账本
    const bookRes = await db.collection('books').add({
      data: {
        activityId,
        name: name || (type === 'gift' ? '收礼账本' : '仓库账本'),
        type,
        ownerId,
        createTime: db.serverDate()
      }
    })

    // 如果负责人还不是活动成员，添加
    const existMember = await db.collection('members').where({ activityId, userId: ownerId }).get()
    if (existMember.data.length === 0) {
      await db.collection('members').add({
        data: {
          activityId,
          userId: ownerId,
          bookId: bookRes._id,
          roleInActivity: 'editor',
          joinTime: db.serverDate()
        }
      })
    } else {
      // 更新成员的账本权限
      await db.collection('members').where({ activityId, userId: ownerId }).update({
        data: { bookId: bookRes._id, roleInActivity: 'editor' }
      })
    }

    return { success: true, bookId: bookRes._id }
  } catch (err) {
    console.error('createSubBook error:', err)
    return { success: false, error: err.message }
  }
}
