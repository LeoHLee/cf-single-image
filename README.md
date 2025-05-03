## 部署方法

1. 用本仓库创建worker
2. 创建名为`image_storage`的D1 SQL数据库，复制其id
3. 在worker的设置-变量和机密中，添加一个密钥，名称为DB_ID，值为上面的id
4. 再添加一个密钥，名称为VIEWTOKEN，用于给图片访问鉴权
5. 再添加一个密钥，名称为ADMINTOKEN，用于给后台鉴权