# 数据库初始化

## 集合创建

在微信开发者工具「云开发」控制台中，依次创建以下集合：

### 1. users - 用户表
```json
{
  "_id": "自动生成",
  "openId": "用户微信openId",
  "nickName": "昵称",
  "avatarUrl": "头像URL",
  "role": "viewer",
  "createTime": "创建时间"
}
```
**权限设置**：所有用户可读，仅创建者可写

### 2. activities - 活动表
```json
{
  "_id": "自动生成",
  "name": "活动名称",
  "startDate": "2026-04-04",
  "endDate": "2026-04-06",
  "location": "地点",
  "creatorId": "创建者user._id",
  "status": "active",
  "settings": {},
  "createTime": "创建时间"
}
```
**权限设置**：仅创建者可读写

### 3. books - 账本表
```json
{
  "_id": "自动生成",
  "activityId": "活动ID",
  "name": "账本名称",
  "type": "main",
  "ownerId": "负责人user._id",
  "createTime": "创建时间"
}
```
**权限设置**：仅创建者可读写

### 4. records - 流水记录表
```json
{
  "_id": "自动生成",
  "bookId": "账本ID",
  "type": "income",
  "category": "分类",
  "amount": 0,
  "person": "人员",
  "paymentMethod": "现金",
  "items": [],
  "remark": "备注",
  "createdBy": "创建者user._id",
  "createdAt": "创建时间",
  "attachments": []
}
```
**权限设置**：仅创建者可读写

### 5. transfers - 结账记录表
```json
{
  "_id": "自动生成",
  "fromBookId": "来源账本ID",
  "toBookId": "目标账本ID",
  "cashAmount": 0,
  "items": [],
  "transferTime": "转交时间",
  "operatorId": "操作人ID"
}
```
**权限设置**：仅创建者可读写

### 6. items - 物品字典表
```json
{
  "_id": "自动生成",
  "activityId": "活动ID",
  "name": "物品名称",
  "unit": "单位",
  "aliases": ["别名数组"]
}
```
**权限设置**：所有用户可读，仅创建者可写

### 7. members - 活动成员表
```json
{
  "_id": "自动生成",
  "activityId": "活动ID",
  "userId": "用户ID",
  "bookId": null,
  "roleInActivity": "admin",
  "joinTime": "加入时间"
}
```
**权限设置**：仅创建者可读写

---

## 索引建议

在云开发控制台为以下字段添加索引以提升查询性能：

| 集合 | 索引字段 | 说明 |
|------|----------|------|
| users | openId (唯一) | 按openId查询用户 |
| activities | creatorId, status | 查询用户创建的活动 |
| books | activityId, type | 查询活动下的账本 |
| records | bookId, type, createdAt | 分页查询流水 |
| records | bookId, createdAt (降序) | 按时间排序查询 |
| members | activityId, userId (复合) | 检查成员权限 |
| items | activityId, name (复合) | 物品智能提示 |
| transfers | fromBookId | 查询结账记录 |

---

## 云环境初始化步骤

1. 打开微信开发者工具 → 云开发控制台
2. 创建环境（如未创建）
3. 在「数据库」中创建上述7个集合
4. 设置各集合的权限
5. 复制环境ID，替换 `app.js` 中的 `YOUR_ENV_ID`
6. 右键 `cloudfunctions` 目录，选择「上传并部署：所有云函数」
