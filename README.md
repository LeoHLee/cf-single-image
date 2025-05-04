## 部署方法

1. 创建名为`image_storage`的D1 SQL数据库，复制其ID
2. fork本仓库，并在远程分支上，将`wrangler.toml`中的`database_id`改为刚创建的数据库ID
3. 用fork出的仓库创建worker
4. 在worker的设置-变量和机密中，添加一个密钥，名称为VIEWTOKEN，用于给图片访问鉴权
5. 在worker的设置-变量和机密中，添加一个密钥，名称为ADMINTOKEN，用于给后台鉴权