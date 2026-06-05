// 云函数：checkPermission
// 检查当前用户对账本的权限
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { activityId, bookId } = event

  try {
    const userRes = await db.collection('users').where({ openId: OPENID }).get()
    if (userRes.data.length === 0) return { canWrite: false, canDelete: false }
    const userId = userRes.data[0]._id

    const adminRes = await db.collection('members').where({
      activityId, userId, roleInActivity: 'admin'
    }).get()
    if (adminRes.data.length > 0) {
      return { canWrite: true, canDelete: true }
    }

    const memberRes = await db.collection('members').where({ activityId, userId }).get()
    if (memberRes.data.length === 0) return { canWrite: false, canDelete: false }
    const member = memberRes.data[0]

    if (member.roleInActivity === 'viewer') {
      return { canWrite: false, canDelete: false }
    }

    if (member.roleInActivity === 'editor') {
      const hasBookAccess = !member.bookId || member.bookId === bookId
      return { canWrite: hasBookAccess, canDelete: hasBookAccess }
    }

    return { canWrite: false, canDelete: false }
  } catch (err) {
    console.error('checkPermission error:', err)
    return { canWrite: false, canDelete: false }
  }
}
