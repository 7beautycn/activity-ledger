// 云函数：inviteMember
// 生成带参数的邀请二维码
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { activityId, role, bookId } = event

  try {
    // 校验权限
    const userRes = await db.collection('users').where({ openId: OPENID }).get()
    if (userRes.data.length === 0) return { success: false, error: '未登录' }
    
    const adminRes = await db.collection('members').where({
      activityId, userId: userRes.data[0]._id, roleInActivity: 'admin'
    }).get()
    if (adminRes.data.length === 0) return { success: false, error: '只有主事人可邀请' }

    // 生成邀请参数
    const inviteData = {
      activityId,
      role,
      bookId: bookId || null,
      inviterId: userRes.data[0]._id
    }

    // 获取活动名称用于小程序码scene参数
    const activityRes = await db.collection('activities').doc(activityId).get()
    
    // 使用 scene 参数存储邀请信息
    // 小程序码生成通过前端调用 wxacode.getUnlimited 实现
    return {
      success: true,
      inviteData,
      activityName: activityRes.data?.name || '',
      // 返回一个唯一的邀请ID，前端用这个来生成小程序码
      inviteId: `${activityId}_${Date.now()}`
    }
  } catch (err) {
    console.error('inviteMember error:', err)
    return { success: false, error: err.message }
  }
}
