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
    // 启动时静默登录
    this.loginPromise = this.doLogin()
  },

  // 执行登录，返回 Promise
  doLogin() {
    const that = this
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'login',
        success: res => {
          const result = res.result
          that.globalData.openId = result.openId
          that.globalData.userInfo = result.userInfo
          that.globalData.isAdmin = result.isAdmin
          that.globalData.isLoggedIn = true
          resolve(result)
        },
        fail: err => {
          console.error('登录失败', err)
          reject(err)
        }
      })
    })
  },

  // 等待登录完成
  async ensureLogin() {
    if (this.globalData.isLoggedIn) return this.globalData.userInfo
    const res = await this.loginPromise
    return res.userInfo
  },

  globalData: {
    openId: null,
    userInfo: null,
    isAdmin: false,
    isLoggedIn: false
  }
})
