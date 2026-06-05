// 云函数：login
// 获取用户openId，创建或更新用户记录
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  
  try {
    // 查询用户是否已存在
    const userRes = await db.collection('users').where({ openId: OPENID }).get()
    
    if (userRes.data.length === 0) {
      // 新建用户
      await db.collection('users').add({
        data: {
          openId: OPENID,
          nickName: event.nickName || '微信用户',
          avatarUrl: event.avatarUrl || '',
          role: 'viewer', // 默认角色
          createTime: db.serverDate()
        }
      })
    } else {
      // 更新用户信息
      if (event.nickName || event.avatarUrl) {
        const updateData = {}
        if (event.nickName) updateData.nickName = event.nickName
        if (event.avatarUrl) updateData.avatarUrl = event.avatarUrl
        await db.collection('users').doc(userRes.data[0]._id).update({ data: updateData })
      }
    }

    // 返回用户信息
    const finalUser = await db.collection('users').where({ openId: OPENID }).get()
    const user = finalUser.data[0]
    
    return {
      openId: OPENID,
      userInfo: {
        _id: user._id,
        nickName: user.nickName,
        avatarUrl: user.avatarUrl,
        role: user.role
      },
      isAdmin: user.role === 'admin'
    }
  } catch (err) {
    console.error('login error:', err)
    return { openId: OPENID, error: err.message }
  }
}
