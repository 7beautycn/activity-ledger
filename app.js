// app.js
App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud1-d5gn56vdg35ac6279',
        traceUser: true
      })
    }
    this.getOpenId()
  },

  // 获取用户openId
  getOpenId() {
    const that = this
    wx.cloud.callFunction({
      name: 'login',
      success: res => {
        that.globalData.openId = res.result.openId
        that.globalData.userInfo = res.result.userInfo
        that.globalData.isAdmin = res.result.isAdmin
      },
      fail: err => {
        console.error('登录失败', err)
      }
    })
  },

  globalData: {
    openId: null,
    userInfo: null,
    isAdmin: false
  }
})
