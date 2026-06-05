// 云函数：getSubBooks - 获取活动的子账本列表
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { activityId } = event
  try {
    const booksRes = await db.collection('books').where({
      activityId,
      type: db.command.neq('main')
    }).get()
    return {
      names: booksRes.data.map(b => b.name),
      books: booksRes.data
    }
  } catch (err) {
    return { names: [], books: [] }
  }
}
