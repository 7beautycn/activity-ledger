// 云函数：createActivity
// 创建活动、自动创建主事人总账本、将创建者加入members表
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { name, startDate, endDate, location } = event

  if (!name || !startDate) {
    return { success: false, error: '活动名称和开始日期不能为空' }
  }

  try {
    // 获取用户信息
    const userRes = await db.collection('users').where({ openId: OPENID }).get()
    if (userRes.data.length === 0) {
      return { success: false, error: '用户未登录' }
    }
    const user = userRes.data[0]

    // 创建活动
    const activityRes = await db.collection('activities').add({
      data: {
        name,
        startDate,
        endDate: endDate || '',
        location: location || '',
        creatorId: user._id,
        status: 'active',
        settings: {},
        createTime: db.serverDate()
      }
    })
    const activityId = activityRes._id

    // 创建主事人总账本
    const bookRes = await db.collection('books').add({
      data: {
        activityId,
        name: '主事人总账本',
        type: 'main',
        ownerId: user._id,
        createTime: db.serverDate()
      }
    })

    // 将创建者加入成员表
    await db.collection('members').add({
      data: {
        activityId,
        userId: user._id,
        bookId: null, // null表示全部账本
        roleInActivity: 'admin',
        joinTime: db.serverDate()
      }
    })

    return {
      success: true,
      activityId,
      bookId: bookRes._id
    }
  } catch (err) {
    console.error('createActivity error:', err)
    return { success: false, error: err.message }
  }
}
