// 云函数：exportExcel
// 导出总账本流水为CSV文件
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { bookId } = event

  try {
    // 权限校验
    const userRes = await db.collection('users').where({ openId: OPENID }).get()
    if (userRes.data.length === 0) return { success: false, error: '未登录' }
    const userId = userRes.data[0]._id

    const bookRes = await db.collection('books').doc(bookId).get()
    const book = bookRes.data

    const adminRes = await db.collection('members').where({
      activityId: book.activityId, userId, roleInActivity: 'admin'
    }).get()
    if (adminRes.data.length === 0) return { success: false, error: '只有主事人可导出' }

    // 获取所有记录
    const recordsRes = await db.collection('records').where({ bookId }).orderBy('createdAt', 'asc').get()
    const records = recordsRes.data

    // 生成CSV内容
    const headers = ['类型', '分类', '金额', '人员', '物品明细', '备注', '时间']
    let csvContent = '\uFEFF' + headers.join(',') + '\n' // BOM for Excel Chinese

    records.forEach(r => {
      const row = [
        r.type === 'income' ? '收入' : '支出',
        r.category || '',
        (r.amount || 0).toString(),
        r.person || '',
        (r.items || []).map(i => `${i.name}x${i.quantity}`).join(';'),
        r.remark || '',
        r.createdAt ? new Date(r.createdAt).toLocaleString() : ''
      ]
      csvContent += row.map(v => `"${v}"`).join(',') + '\n'
    })

    // 上传到云存储
    const cloudPath = `exports/${bookId}_${Date.now()}.csv`
    const buffer = Buffer.from(csvContent, 'utf-8')
    
    const uploadRes = await cloud.uploadFile({
      cloudPath,
      fileContent: buffer
    })

    // 获取临时下载链接
    const downloadRes = await cloud.getTempFileURL({
      fileList: [uploadRes.fileID]
    })

    return {
      success: true,
      fileID: uploadRes.fileID,
      downloadUrl: downloadRes.fileList[0]?.tempFileURL || ''
    }
  } catch (err) {
    console.error('exportExcel error:', err)
    return { success: false, error: err.message }
  }
}
