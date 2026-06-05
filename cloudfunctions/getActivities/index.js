// 云函数：getActivities
// 获取当前用户参与的活动列表
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { status = 'active' } = event

  try {
    // 获取用户
    const userRes = await db.collection('users').where({ openId: OPENID }).get()
    if (userRes.data.length === 0) {
      return { activities: [] }
    }
    const userId = userRes.data[0]._id

    // 查询用户参与的所有成员记录
    const membersRes = await db.collection('members').where({ userId }).get()
    const activityIds = membersRes.data.map(m => m.activityId)
    
    if (activityIds.length === 0) {
      return { activities: [] }
    }

    // 查询活动
    const activityRes = await db.collection('activities')
      .where({
        _id: _.in(activityIds),
        status
      })
      .orderBy('createTime', 'desc')
      .get()

    // 为每个活动添加账本数量和成员数量
    const activities = await Promise.all(activityRes.data.map(async (activity) => {
      const [bookCount, memberCount] = await Promise.all([
        db.collection('books').where({ activityId: activity._id }).count(),
        db.collection('members').where({ activityId: activity._id }).count()
      ])
      return {
        ...activity,
        bookCount: bookCount.total,
        memberCount: memberCount.total
      }
    }))

    return { activities }
  } catch (err) {
    console.error('getActivities error:', err)
    return { activities: [], error: err.message }
  }
}
