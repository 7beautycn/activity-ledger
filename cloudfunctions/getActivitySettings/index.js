// 云函数：getActivitySettings - 获取活动收款码
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { activityId } = event
  try {
    const res = await db.collection('activities').doc(activityId).get()
    return res.data?.settings || {}
  } catch (err) {
    return {}
  }
}
