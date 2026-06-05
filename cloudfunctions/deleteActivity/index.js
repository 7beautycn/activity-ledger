// 云函数：deleteActivity
// 删除活动及其所有关联数据
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { activityId } = event

  if (!activityId) {
    return { success: false, error: '缺少活动ID' }
  }

  try {
    // 获取或创建用户
    let userRes = await db.collection('users').where({ openId: OPENID }).get()
    if (userRes.data.length === 0) {
      await db.collection('users').add({
        data: { openId: OPENID, nickName: '微信用户', avatarUrl: '', role: 'viewer', createTime: db.serverDate() }
      })
      userRes = await db.collection('users').where({ openId: OPENID }).get()
    }
    const userId = userRes.data[0]._id

    // 校验：只有活动创建者可以删除
    const activityRes = await db.collection('activities').doc(activityId).get()
    if (!activityRes.data) {
      return { success: false, error: '活动不存在' }
    }
    if (activityRes.data.creatorId !== userId) {
      return { success: false, error: '只有活动创建者可以删除' }
    }

    // 获取活动下所有账本
    const booksRes = await db.collection('books').where({ activityId }).get()
    const bookIds = booksRes.data.map(b => b._id)

    // 批量删除记录（records 表数据可能很多，分批删除）
    const deleteRecords = async (where) => {
      const MAX_LIMIT = 100
      const countRes = await db.collection('records').where(where).count()
      const total = countRes.total
      const batchTimes = Math.ceil(total / MAX_LIMIT)
      for (let i = 0; i < batchTimes; i++) {
        const res = await db.collection('records').where(where).limit(MAX_LIMIT).get()
        const ids = res.data.map(r => r._id)
        if (ids.length > 0) {
          await db.collection('records').where({ _id: _.in(ids) }).remove()
        }
      }
    }

    // 删除活动下的所有记录
    if (bookIds.length > 0) {
      await deleteRecords({ bookId: _.in(bookIds) })
    } else {
      await deleteRecords({ activityId })
    }

    // 删除结账记录
    const transfersRes = await db.collection('transfers').where({ 
      fromBookId: bookIds.length > 0 ? _.in(bookIds) : activityId 
    }).get()
    for (const t of transfersRes.data) {
      await db.collection('transfers').doc(t._id).remove()
    }

    // 删除物品字典
    const itemsRes = await db.collection('items').where({ activityId }).get()
    for (const item of itemsRes.data) {
      await db.collection('items').doc(item._id).remove()
    }

    // 删除账本
    for (const book of booksRes.data) {
      await db.collection('books').doc(book._id).remove()
    }

    // 删除成员
    const membersRes = await db.collection('members').where({ activityId }).get()
    for (const m of membersRes.data) {
      await db.collection('members').doc(m._id).remove()
    }

    // 删除活动本身
    await db.collection('activities').doc(activityId).remove()

    return { success: true }
  } catch (err) {
    console.error('deleteActivity error:', err)
    return { success: false, error: err.message }
  }
}
