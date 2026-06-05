// 云函数：addRecord
// 添加记账记录，并更新物品字典
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { bookId, activityId, ...recordFields } = event

  try {
    // 获取用户（首次访问自动注册）
    let userRes = await db.collection('users').where({ openId: OPENID }).get()
    if (userRes.data.length === 0) {
      await db.collection('users').add({
        data: { openId: OPENID, nickName: '微信用户', avatarUrl: '', role: 'viewer', createTime: db.serverDate() }
      })
      userRes = await db.collection('users').where({ openId: OPENID }).get()
    }
    const userId = userRes.data[0]._id

    // 权限校验
    const hasPermission = await checkBookPermission(db, activityId, userId, bookId, 'write')
    if (!hasPermission) {
      return { success: false, error: '无权限操作此账本' }
    }

    // 构建记录数据
    const recordData = {
      bookId,
      type: recordFields.type || 'income',
      category: recordFields.category || '',
      amount: Number(recordFields.amount) || 0,
      person: recordFields.person || '',
      paymentMethod: recordFields.paymentMethod || '',
      remark: recordFields.remark || '',
      items: recordFields.items || [],
      attachments: recordFields.attachments || [],
      createdBy: userId,
      createdAt: recordFields.createdAt ? new Date(recordFields.createdAt) : db.serverDate()
    }

    // 仓库类型特殊字段
    if (recordFields.itemName) {
      recordData.itemName = recordFields.itemName
      recordData.quantity = Number(recordFields.quantity) || 0
      recordData.unit = recordFields.unit || '个'
    }
    if (recordFields.price !== undefined) recordData.price = Number(recordFields.price)
    if (recordFields.source) recordData.source = recordFields.source
    if (recordFields.purpose) recordData.purpose = recordFields.purpose
    if (recordFields.receiver) recordData.receiver = recordFields.receiver

    // 添加记录
    const recordRes = await db.collection('records').add({ data: recordData })

    // 更新物品字典
    await updateItemsDict(db, activityId, recordData)

    return { success: true, recordId: recordRes._id }
  } catch (err) {
    console.error('addRecord error:', err)
    return { success: false, error: err.message }
  }
}

// 权限检查
async function checkBookPermission(db, activityId, userId, bookId, action) {
  // 检查是否为活动主事人
  const adminRes = await db.collection('members').where({
    activityId, userId, roleInActivity: 'admin'
  }).get()
  if (adminRes.data.length > 0) return true

  // 检查是否有此账本的权限
  const memberRes = await db.collection('members').where({ activityId, userId }).get()
  if (memberRes.data.length === 0) return false

  const member = memberRes.data[0]
  if (member.roleInActivity === 'viewer' && action === 'write') return false
  
  // editor只能操作自己的账本
  if (member.roleInActivity === 'editor' && member.bookId !== bookId) return false

  return true
}

// 更新物品字典
async function updateItemsDict(db, activityId, recordData) {
  const items = []
  
  // 从items字段收集
  if (recordData.items && Array.isArray(recordData.items)) {
    recordData.items.forEach(item => items.push({ name: item.name, unit: item.unit || '个' }))
  }
  
  // 从itemName收集
  if (recordData.itemName) {
    items.push({ name: recordData.itemName, unit: recordData.unit || '个' })
  }

  for (const item of items) {
    if (!item.name) continue
    const exist = await db.collection('items').where({ activityId, name: item.name }).get()
    if (exist.data.length === 0) {
      await db.collection('items').add({
        data: { activityId, name: item.name, unit: item.unit, aliases: [] }
      })
    }
  }
}
