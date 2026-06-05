// 云函数：updateActivitySettings - 更新活动设置
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { activityId, key, value } = event

  try {
    let userRes = await db.collection('users').where({ openId: OPENID }).get()
    if (userRes.data.length === 0) {
      await db.collection('users').add({
        data: { openId: OPENID, nickName: '微信用户', avatarUrl: '', role: 'viewer', createTime: db.serverDate() }
      })
      userRes = await db.collection('users').where({ openId: OPENID }).get()
    }
    
    const adminRes = await db.collection('members').where({
      activityId, userId: userRes.data[0]._id, roleInActivity: 'admin'
    }).get()
    if (adminRes.data.length === 0) return { success: false }

    await db.collection('activities').doc(activityId).update({
      data: { [`settings.${key}`]: value }
    })
    return { success: true }
  } catch (err) {
    return { success: false }
  }
}
