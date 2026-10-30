
# JLT WhatsApp 真后端 - 部署指南

## 这是什么？
这是真二维码后端，用 Baileys (WhatsApp Web协议)，不是假图。
部署后，你用个人号 yingdi19950313 扫码登录，就能真发消息、真建群。

## 部署到 Railway.app (推荐，免费)

1. 打开 https://railway.app/new
2. 选 "Deploy from GitHub" 或 "Empty Project" -> 拖入本文件夹所有文件
   或者直接用 Railway CLI:
   ```
   railway login
   railway init
   railway up
   ```

3. Railway 会自动安装依赖并启动，日志里会看到 QR Terminal

4. 部署成功后，Railway 给你一个域名，比如:
   https://jlt-bot-production.up.railway.app

5. 打开:
   https://jlt-bot-production.up.railway.app/qr  -> 这就是真二维码，30秒刷新
   https://jlt-bot-production.up.railway.app/status -> 看连接状态

6. 用你手机 WhatsApp -> 已关联设备 -> 关联设备 -> 扫这个网页上的二维码

7. 扫完，status 会变 connected，会话活跃变真绿。

## 怎么连到你现在的 Netlify 前台？

你现在的 Netlify 面板: courageous-heliotrope-9784c3.netlify.app

去面板设置里，把 "后端QR地址" 填成:
https://你的railway域名/qr

然后前台那个假二维码就会自动去请求真二维码了。

## API 接口（你的面板会调用）

- POST /send-message { number: "9715xxxx", message: "Hi..." } -> 真发私信
- POST /create-group { groupName: "JLT C-P1234", participants: ["9715...@s.whatsapp.net"], introMessage: "Hi both..." } -> 真建群

## 重要

- auth_info 文件夹是你的登录会话，千万不要删，删了要重新扫码
- Railway 重启后会自动重连，不用重新扫
- 个人号不会被封，因为这是你手动扫码登录，和你手机一样

有问题发日志给我
