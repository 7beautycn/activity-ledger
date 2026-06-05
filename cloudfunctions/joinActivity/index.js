// 云函数：joinActivity
// 扫码后加入活动
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { activityId, role = 'viewer', bookId = null } = event

  try {
    const userRes = await db.collection('users').where({ openId: OPENID }).get()
    if (userRes.data.length === 0) return { success: false, error: '用户未登录' }
    const userId = userRes.data[0]._id

    // 检查是否已经是成员
    const existRes = await db.collection('members').where({ activityId, userId }).get()
    if (existRes.data.length > 0) {
      return { success: false, error: '您已经是该活动的成员' }
    }

    // 加入活动
    await db.collection('members').add({
      data: {
        activityId,
        userId,
        bookId,
        roleInActivity: role,
        joinTime: db.serverDate()
      }
    })

    // 获取活动名称
    const activityRes = await db.collection('activities').doc(activityId).get()

    return {
      success: true,
      activityName: activityRes.data?.name || '',
      role
    }
  } catch (err) {
    console.error('joinActivity error:', err)
    return { success: false, error: err.message }
  }
}
