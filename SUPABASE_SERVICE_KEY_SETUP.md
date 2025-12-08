# Supabase Service Role Key 设置指南

## 问题说明

Webhook 处理时无法查询 profile 数据，因为：
- 前端使用用户的 session token（authenticated），可以访问自己的 profile
- Webhook 使用 anon key，受 Row Level Security (RLS) 限制，无法访问 profile

## 解决方案：添加 Service Role Key

### 步骤 1: 获取 Service Role Key

1. 打开 Supabase Dashboard: https://supabase.com/dashboard
2. 选择您的项目
3. 进入 **Settings** → **API**
4. 找到 **Project API keys** 部分
5. 复制 `service_role` key（⚠️ 这是一个 secret key，不要公开！）

### 步骤 2: 添加到 .env.local

在您的 `.env.local` 文件中添加：

```env
# Supabase Service Role Key (Server-side only, NEVER expose to frontend!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-actual-key-here...
```

### 步骤 3: 重启开发服务器

```bash
# 停止当前的 npm run dev (Ctrl+C)
# 重新启动
npm run dev
```

### 步骤 4: 重新测试支付

完成支付后，您应该在终端看到：

```
✅ Membership order marked as paid: xxx
✅ Profile membership updated: ...
```

## 安全注意事项

⚠️ **非常重要**：

1. **Service Role Key 可以绕过所有 RLS 策略**，拥有完全的数据库访问权限
2. **绝对不要**将这个 key 暴露在前端代码中
3. **绝对不要**将这个 key 提交到 Git 仓库
4. 只在服务器端（API routes、webhooks）使用这个 key
5. 确保 `.env.local` 已经在 `.gitignore` 中

## 检查 RLS 策略（可选）

如果您想保留 RLS 安全策略，可以在 Supabase SQL Editor 中运行：

```sql
-- Check current RLS policies on profiles table
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- If you want to allow service role to bypass RLS (it should by default)
-- No additional policy needed, service_role key automatically bypasses RLS
```

## 验证配置

运行以下命令检查环境变量是否正确加载：

```bash
# 在项目根目录
node -e "require('dotenv').config({ path: '.env.local' }); console.log('Service Role Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Configured' : '❌ Missing')"
```


