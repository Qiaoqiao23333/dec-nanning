# Supabase 共享布局

项目地址：https://dgpdyzhbtzhayprokrwu.supabase.co
前端使用用户提供的 publishable key；该 key 按设计可公开，不是管理密钥。

## 初始化

在该项目 SQL Editor 新建查询，将 setup.sql 全文粘贴并运行。脚本在事务中创建私有布局表、墙段表、最近十版历史和两个公开 RPC；可重复运行且不重置已有布局。匿名访客只能调用固定布局的读写函数，没有底层数据表权限。所有人可修改这一份布局，是用户明确选择的权限。

## 发布状态

2026-10-13：已初始化 Supabase。线上并发写入、过时写入冲突、重新读取持久化均通过；两个浏览器页面已验证家具新增同步。测试家具已清理。前端通过现有 GitHub Pages workflow 发布。

之前的 Sites/R2 后端因平台 403 未被前端继续使用，保留在 backend 中作为旧实现。

## 验证

`npm test` 验证几何、共享同步状态机及旧 Worker。

Supabase SQL 和 transport 的测试使用 PGlite（PostgreSQL WASM），可通过环境变量 PGLITE_MODULE 指定安装模块的绝对路径后执行：

`node tests/supabase.test.mjs`

已验证重复初始化、匿名 RPC、私有表权限、版本冲突、输入校验、不同实体的合并、同一实体的冲突与十版历史上限。线上 Supabase 读写和浏览器跨域连接已验证。
