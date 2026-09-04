from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates


BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(title="艾瑞塔訂餐 Demo")
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
templates = Jinja2Templates(directory=BASE_DIR / "templates")


STORES = [
    {"id": "airita", "name": "艾瑞塔精選", "note": "簡餐・輕食・沙拉"},
    {"id": "daily", "name": "每日好食", "note": "園區午餐合作店"},
    {"id": "green", "name": "綠日餐盒", "note": "健康餐盒"},
]

LOCATIONS = [
    {"id": "zhubei", "name": "竹北昌益園區", "time": "11:30–13:00"},
    {"id": "hsinchu", "name": "新竹科學園區", "time": "11:40–12:50"},
    {"id": "zhunan", "name": "竹南產業園區", "time": "11:30–12:40"},
]

MEALS = [
    {
        "id": 1,
        "category": "簡餐",
        "store": "艾瑞塔精選",
        "name": "香烤雞腿風味餐",
        "description": "主餐、時蔬與米飯的午餐組合",
        "price": 135,
        "image": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Taiwanese_Bento_Box_%40_Bao%2C_London.jpg?width=1280",
    },
    {
        "id": 2,
        "category": "輕食",
        "store": "艾瑞塔精選",
        "name": "野菜輕食餐盒",
        "description": "蔬菜、穀物與季節配菜",
        "price": 125,
        "image": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Tasty_Buddha_Bowl_with_Falafel_-_Dyke_Road_Park_Cafe_2025-05-09.jpg?width=1280",
    },
    {
        "id": 3,
        "category": "沙拉",
        "store": "綠日餐盒",
        "name": "彩虹時蔬沙拉",
        "description": "新鮮蔬果搭配特製清爽醬汁",
        "price": 110,
        "image": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Food-salad-healthy-colorful_%2824242433051%29.jpg?width=1280",
    },
    {
        "id": 4,
        "category": "簡餐",
        "store": "每日好食",
        "name": "親子雞肉丼",
        "description": "滑蛋雞肉搭配白飯與小菜",
        "price": 120,
        "image": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Oyakodon_003.jpg?width=1280",
    },
    {
        "id": 5,
        "category": "麵食",
        "store": "每日好食",
        "name": "古早味陽春麵",
        "description": "清爽湯頭、青菜與肉片",
        "price": 95,
        "image": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Spring_Noodle_Soup_%28%E9%99%BD%E6%98%A5%E9%BA%B5%29_%282%29.jpg?width=1280",
    },
]


@app.get("/")
async def home(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={"stores": STORES, "locations": LOCATIONS, "meals": MEALS},
    )


@app.get("/health")
async def health():
    return {"status": "ok"}
