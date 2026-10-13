# 旧 Sites/R2 实现（当前未使用）

当前线上后端已迁移到 Supabase，见 ../supabase/README.md。以下保留初次实现与诊断记录。

# 共享布局后端

GitHub Pages 前端连接独立 Worker，所有访问者读写同一份家具与墙饰布局。接口按用户要求公开，无账号或客户端密钥；实景照片不上传到此接口。

## 当前发布状态（2026-10-13）

Sites 已成功发布，访问权限为 public：
https://nanning-layout-sync.agileslug8.chatgpt.site

但当前网络中的 curl 和浏览器访问均被托管平台 Cloudflare 返回 403 拦截，尚未完成线上读写及跨浏览器同步验证。因此本次前端改动尚未推送到 GitHub Pages，避免将无法连接的共享模式发布给现有用户。需解决平台访问问题，或迁移到可访问的后端后再发布。

## 数据与同步

- GET /api/layout 获取全局布局及版本。
- POST /api/layout 提交按实体 ID 的 before/after 补丁。不同家具的并发修改自动合并，同一实体的过时修改返回 409。
- R2 条件写入保证并发不会覆盖整个布局，重复提交幂等。
- GET /api/history 返回最近十个旧版本索引；GET /api/history/:revision 读取历史布局。
- 输入限制：最多 300 件家具、150 件墙饰；墙饰尺寸限制在实际墙段与 236 cm 墙高范围内。
- 前端三秒轮询，修改后短暂延迟提交；离线草稿和冲突草稿暂存浏览器。
- 旧 qiju-v2 本机布局不会自动上传或覆盖，有独立导出按钮。
- 独立 HTML 离线文件仍只保存到本机。

## 构建与验证

从 home-studio 运行 npm test：构建 Worker，验证墙体几何与同步协议。同步测试使用内存 R2 替身，覆盖条件写入竞争、冲突、幂等、非法输入、历史、双客户端收敛、离线恢复和请求期间的新编辑；不等于线上 R2 验证。

node backend/scripts/build.mjs 将 shared 依赖和墙段定义编入 dist/server/index.js。修改户型、协议时同时更新 backend/shared 中的副本后重建。部署包包含 dist/server/index.js 和 dist/.openai/hosting.json；使用 Sites source helper 从同一已推送提交打包，不能单独修改包。

部署前应完成：浏览器读取接口、两个客户端分别修改家具后收敛、同一家具冲突、刷新后持久化、GitHub Pages 跨域 OPTIONS/POST。确认通过后再推送主仓库 main，触发现有 Pages workflow。
