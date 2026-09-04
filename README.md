# 艾瑞塔多店家訂餐網站｜版型 Demo

這是第一階段的 Python（FastAPI）訂餐網站版型，先用示意資料確認外觀與操作流程。

## 目前功能

- 手機／桌面響應式版面
- 多個取餐地點切換
- 多店家篩選
- 五種示意餐點
- 餐點分類
- 收藏按鈕
- 前端購物車與金額計算

會員、LINE、正式資料庫、管理後台及付款功能尚未加入。

## 本機啟動

```bash
python -m venv .venv
```

Windows：

```bash
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload
```

瀏覽器開啟 `http://127.0.0.1:8000`。

## 上傳 GitHub

解壓縮後，將資料夾內的全部檔案上傳到新的 GitHub Repository 即可。

專案已附 Heroku 的 `Procfile` 與 Cloud Run 可用的 `Dockerfile`，確認版型後再選擇部署平台。

## 圖片來源

版型示意圖片來自 Wikimedia Commons；正式營運前請改為店家自行提供的餐點圖片。個別授權及來源整理在 `THIRD_PARTY_NOTICES.md`。
