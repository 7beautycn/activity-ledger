// 云函数：archiveActivity
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { activityId } = event

  try {
    const userRes = await db.collection('users').where({ openId: OPENID }).get()
    if (userRes.data.length === 0) return { success: false }
    
    const adminRes = await db.collection('members').where({
      activityId, userId: userRes.data[0]._id, roleInActivity: 'admin'
    }).get()
    if (adminRes.data.length === 0) return { success: false }

    await db.collection('activities').doc(activityId).update({
      data: { status: 'archived' }
    })
    return { success: true }
  } catch (err) {
    return { success: false }
  }
}
