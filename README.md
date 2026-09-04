# 艾瑞塔園區訂餐系統 v2

Python FastAPI + Google Firestore 的可收單版本。

## 已完成

- 客人選擇餐點、取餐地點並送出訂單
- 訂單編號與完成頁
- Firestore 永久保存訂單、餐點、地點及設定
- 管理員帳密登入
- 後台查看訂單與更新狀態
- 客人可用下單手機號碼查詢訂單內容與處理狀態
- 訂單查詢與後台顯示台灣下單時間（到分鐘）
- 結帳可選實體發票或手機載具條碼
- 後台提供卡片／條列表格切換、日期時間篩選、排序及餐點數量統計
- LINE 官方帳號加入群組後，新訂單自動推送群組通知
- 後台更新訂單狀態時，自動推送狀態通知至 LINE 群組
- 新增、修改、上下架餐點
- 新增多個取餐日期
- 每個日期分別設定地點、時間點及開放／停用
- 新增及啟停取餐地點
- 圖片網址；設定 Cloudinary 後可直接上傳圖片

## 網址

- 客戶訂餐：`/`
- 客戶訂單查詢：`/order-lookup`
- 管理後台：`/admin/login`
- 健康檢查：`/health`

## Heroku Config Vars（必要）

| Key | Value |
| --- | --- |
| `FIREBASE_CREDENTIALS_BASE64` | Firebase 服務帳戶 JSON 的 Base64 |
| `ADMIN_USERNAME` | 建議 `airita-admin` |
| `ADMIN_PASSWORD` | 自行設定的強密碼，不要寫入 GitHub |
| `SESSION_SECRET` | 自行產生的長隨機字串 |
| `LINE_CHANNEL_SECRET` | LINE Messaging API 的 Channel secret |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging API 的長效 Channel access token |

選用：`CLOUDINARY_URL`，設定後後台可直接上傳餐點圖片。

## 更新 GitHub

解壓縮後，把所有檔案上傳到原本 Repository，取代同名檔案，並確認舊的 `runtime.txt` 已刪除、根目錄有 `.python-version`。

Heroku 與 GitHub 自動部署連接後，推送到 `main` 即可重新部署。

## LINE 群組通知啟用方式

1. 部署新版後，在 LINE Developers 將 Webhook URL 設為 `https://你的網域/line/webhook` 並開啟 Use webhook。
2. 驗證 Webhook 成功後，開啟允許官方帳號加入群組。
3. 登入 `/admin/settings` 查看一次性群組連接指令。
4. 將官方帳號邀請進通知群組，在群組貼上該指令；收到連接成功訊息後即可測試下單。

## 目前尚未加入

- LINE Login（下一階段需要 LINE Developers Channel ID 與 Secret）
- 線上付款
