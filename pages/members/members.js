// pages/members/members.js
const util = require('../../utils/util')

Page({
  data: {
    activityId: '',
    members: [],
    books: [],
    isAdmin: false,
    loading: true,
    showInvite: false,
    generating: false,
    inviteQR: '',
    roleOptions: ['只读 (viewer)', '记账员 (editor)'],
    inviteRoleIndex: 0,
    bookOptions: [],
    inviteBookIndex: 0
  },

  onLoad(options) {
    this.setData({ activityId: options.id })
    this.loadMembers()
  },

  onShow() {
    if (this.data.activityId) {
      this.loadMembers()
    }
  },

  async loadMembers() {
    util.showLoading()
    try {
      const res = await wx.cloud.callFunction({
        name: 'getMembers',
        data: { activityId: this.data.activityId }
      })
      this.setData({
        members: res.result.members || [],
        books: res.result.books || [],
        isAdmin: res.result.isAdmin || false,
        loading: false
      })
    } catch (err) {
      console.error('加载成员失败', err)
      this.setData({ loading: false })
      util.showToast('加载失败')
    }
    util.hideLoading()
  },

  // 邀请
  inviteMember() {
    const bookNames = this.data.books.map(b => b.name || '未命名')
    bookNames.unshift('全部账本')
    this.setData({
      showInvite: true,
      bookOptions: bookNames,
      inviteBookIndex: 0,
      inviteQR: ''
    })
  },

  hideInviteDialog() {
    this.setData({ showInvite: false, inviteQR: '' })
  },

  stopPropagation() {},

  onInviteRoleChange(e) {
    this.setData({ inviteRoleIndex: parseInt(e.detail.value) })
  },

  onInviteBookChange(e) {
    this.setData({ inviteBookIndex: parseInt(e.detail.value) })
  },

  // 生成邀请二维码
  async generateInviteQR() {
    this.setData({ generating: true })
    try {
      const role = this.data.inviteRoleIndex === 0 ? 'viewer' : 'editor'
      const bookIndex = this.data.inviteBookIndex
      const bookId = bookIndex === 0 ? null : (this.data.books[bookIndex - 1]?._id || null)

      const res = await wx.cloud.callFunction({
        name: 'inviteMember',
        data: {
          activityId: this.data.activityId,
          role,
          bookId
        }
      })

      this.setData({
        inviteQR: res.result.qrCodeUrl || res.result.qrCodeBase64,
        generating: false
      })
    } catch (err) {
      console.error('生成失败', err)
      this.setData({ generating: false })
      util.showToast('生成失败')
    }
  },

  // 修改角色
  async changeRole(e) {
    const { id, role } = e.currentTarget.dataset
    const newRole = role === 'editor' ? 'viewer' : 'editor'
    const confirmed = await util.showConfirm(`确定将此成员角色改为 ${newRole === 'editor' ? '记账员' : '只读'} 吗？`)
    if (!confirmed) return

    try {
      await wx.cloud.callFunction({
        name: 'updateMemberRole',
        data: {
          activityId: this.data.activityId,
          userId: id,
          role: newRole
        }
      })
      util.showToast('修改成功', 'success')
      this.loadMembers()
    } catch (err) {
      util.showToast('操作失败')
    }
  },

  // 移除成员
  async removeMember(e) {
    const id = e.currentTarget.dataset.id
    const confirmed = await util.showConfirm('确定要移除该成员吗？')
    if (!confirmed) return

    try {
      await wx.cloud.callFunction({
        name: 'removeMember',
        data: {
          activityId: this.data.activityId,
          userId: id
        }
      })
      util.showToast('已移除', 'success')
      this.loadMembers()
    } catch (err) {
      util.showToast('操作失败')
    }
  }
})
