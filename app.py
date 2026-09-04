import base64, json, os, secrets
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import firebase_admin
from fastapi import FastAPI, Form, Request, UploadFile
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from firebase_admin import credentials, firestore
from starlette.middleware.sessions import SessionMiddleware

BASE_DIR = Path(__file__).resolve().parent
app = FastAPI(title="艾瑞塔園區訂餐")
app.add_middleware(SessionMiddleware, secret_key=os.getenv("SESSION_SECRET", secrets.token_urlsafe(48)), https_only=bool(os.getenv("DYNO")), same_site="lax")
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
templates = Jinja2Templates(directory=BASE_DIR / "templates")

DEFAULT_MEALS = [
 {"id":"meal-1","category":"簡餐","store":"艾瑞塔精選","name":"香烤雞腿風味餐","description":"主餐、時蔬與米飯的午餐組合","price":135,"image_url":"https://commons.wikimedia.org/wiki/Special:Redirect/file/Taiwanese_Bento_Box_%40_Bao%2C_London.jpg?width=1280","active":True,"sort":1},
 {"id":"meal-2","category":"輕食","store":"艾瑞塔精選","name":"野菜輕食餐盒","description":"蔬菜、穀物與季節配菜","price":125,"image_url":"https://commons.wikimedia.org/wiki/Special:Redirect/file/Tasty_Buddha_Bowl_with_Falafel_-_Dyke_Road_Park_Cafe_2025-05-09.jpg?width=1280","active":True,"sort":2},
 {"id":"meal-3","category":"沙拉","store":"綠日餐盒","name":"彩虹時蔬沙拉","description":"新鮮蔬果搭配特製清爽醬汁","price":110,"image_url":"https://commons.wikimedia.org/wiki/Special:Redirect/file/Food-salad-healthy-colorful_%2824242433051%29.jpg?width=1280","active":True,"sort":3},
 {"id":"meal-4","category":"簡餐","store":"每日好食","name":"親子雞肉丼","description":"滑蛋雞肉搭配白飯與小菜","price":120,"image_url":"https://commons.wikimedia.org/wiki/Special:Redirect/file/Oyakodon_003.jpg?width=1280","active":True,"sort":4},
 {"id":"meal-5","category":"麵食","store":"每日好食","name":"古早味陽春麵","description":"清爽湯頭、青菜與肉片","price":95,"image_url":"https://commons.wikimedia.org/wiki/Special:Redirect/file/Spring_Noodle_Soup_%28%E9%99%BD%E6%98%A5%E9%BA%B5%29_%282%29.jpg?width=1280","active":True,"sort":5},
]
DEFAULT_LOCATIONS = [
 {"id":"zhubei","name":"竹北昌益園區","pickup_time":"11:30–13:00","pickup_slots":["11:30","12:00","12:30","13:00"],"active":True,"sort":1},
 {"id":"hsinchu","name":"新竹科學園區","pickup_time":"11:40–12:50","pickup_slots":["11:40","12:10","12:40"],"active":True,"sort":2},
 {"id":"zhunan","name":"竹南產業園區","pickup_time":"11:30–12:40","pickup_slots":["11:30","12:00","12:30"],"active":True,"sort":3},
]
DEFAULT_PICKUP_SLOTS=["11:30","12:00","12:30"]

class MemoryStore:
 def __init__(self):
  self.meals={x["id"]:x.copy() for x in DEFAULT_MEALS}; self.locations={x["id"]:x.copy() for x in DEFAULT_LOCATIONS}; self.orders={}
  self.settings={"order_date":datetime.now().strftime("%Y-%m-%d"),"headline":"今日午餐","ordering_open":True}
  self.schedules={f"schedule-{i+1}":{"id":f"schedule-{i+1}","date":self.settings["order_date"],"location_id":x["id"],"location_name":x["name"],"pickup_slots":x["pickup_slots"],"active":True,"sort":x["sort"]} for i,x in enumerate(DEFAULT_LOCATIONS)}
memory=MemoryStore()

def init_firestore():
 encoded=os.getenv("FIREBASE_CREDENTIALS_BASE64")
 if not encoded:return None
 try:
  info=json.loads(base64.b64decode(encoded).decode())
  if not firebase_admin._apps:firebase_admin.initialize_app(credentials.Certificate(info))
  return firestore.client()
 except Exception as exc:
  print(f"Firestore initialization failed: {exc}"); return None
db=init_firestore()

def list_collection(name, active_only=False):
 if db:
  rows=[]
  for doc in db.collection(name).stream():
   item=doc.to_dict() or {}; item["id"]=doc.id
   if not active_only or item.get("active",True):rows.append(item)
 else:
  source=memory.meals if name=="meals" else memory.locations
  rows=[x.copy() for x in source.values() if not active_only or x.get("active",True)]
 return sorted(rows,key=lambda x:(x.get("sort",999),x.get("name","")))

def get_item(name,item_id):
 if db:
  doc=db.collection(name).document(item_id).get()
  return ({"id":doc.id,**(doc.to_dict() or {})} if doc.exists else None)
 return (memory.meals if name=="meals" else memory.locations).get(item_id)

def save_item(name,item_id,data):
 if db:db.collection(name).document(item_id).set(data,merge=True)
 else:(memory.meals if name=="meals" else memory.locations)[item_id]={"id":item_id,**data}

def get_settings():
 if db:
  doc=db.collection("settings").document("ordering").get()
  if doc.exists:return doc.to_dict()
 return memory.settings.copy()

def save_settings(data):
 if db:db.collection("settings").document("ordering").set(data,merge=True)
 else:memory.settings.update(data)

def list_schedules(active_only=False):
 if db:
  rows=[]
  for doc in db.collection("schedules").stream():
   item=doc.to_dict() or {}; item["id"]=doc.id
   if not active_only or item.get("active",True):rows.append(item)
 else:rows=[x.copy() for x in memory.schedules.values() if not active_only or x.get("active",True)]
 return sorted(rows,key=lambda x:(x.get("date",""),x.get("sort",999),x.get("location_name","")))

def get_schedule(date,location_id):
 return next((x for x in list_schedules(True) if x.get("date")==date and x.get("location_id")==location_id),None)

def save_schedule(schedule_id,data):
 if db:db.collection("schedules").document(schedule_id).set(data,merge=True)
 else:memory.schedules[schedule_id]={"id":schedule_id,**data}

def create_order(data):
 oid=datetime.now().strftime("%y%m%d")+"-"+secrets.token_hex(3).upper()
 if db:db.collection("orders").document(oid).set(data)
 else:memory.orders[oid]={"id":oid,**data}
 return oid

def get_order(oid):
 if db:
  doc=db.collection("orders").document(oid).get(); return ({"id":doc.id,**(doc.to_dict() or {})} if doc.exists else None)
 return memory.orders.get(oid)

def list_orders():
 rows=([{"id":d.id,**(d.to_dict() or {})} for d in db.collection("orders").stream()] if db else list(memory.orders.values()))
 return sorted(rows,key=lambda x:x.get("created_at",""),reverse=True)

def seed_database():
 if not db:return
 if not next(db.collection("meals").limit(1).stream(),None):
  for x in DEFAULT_MEALS:save_item("meals",x["id"],{k:v for k,v in x.items() if k!="id"})
 if not next(db.collection("locations").limit(1).stream(),None):
  for x in DEFAULT_LOCATIONS:save_item("locations",x["id"],{k:v for k,v in x.items() if k!="id"})
 if not db.collection("settings").document("ordering").get().exists:save_settings(memory.settings)
 if not next(db.collection("schedules").limit(1).stream(),None):
  settings=get_settings(); default_date=settings.get("order_date") or datetime.now().strftime("%Y-%m-%d")
  for i,location in enumerate(list_collection("locations",True)):
   save_schedule(f"schedule-{i+1}",{"date":default_date,"location_id":location["id"],"location_name":location["name"],"pickup_slots":pickup_slots_for(location),"active":True,"sort":location.get("sort",i+1)})

def is_admin(request):return request.session.get("admin") is True
def render(request,name,**context):return templates.TemplateResponse(request=request,name=name,context=context)
def pickup_slots_for(location):
 slots=location.get("pickup_slots") if location else None
 return slots if isinstance(slots,list) and slots else DEFAULT_PICKUP_SLOTS

@app.on_event("startup")
async def startup():seed_database()

@app.get("/",response_class=HTMLResponse)
async def home(request:Request):
 return render(request,"index.html",meals=list_collection("meals",True),schedules=list_schedules(True),settings=get_settings())

@app.post("/orders")
async def submit_order(request:Request,customer_name:str=Form(...),phone:str=Form(...),location_id:str=Form(...),pickup_date:str=Form(...),pickup_time:str=Form(...),note:str=Form(""),items_json:str=Form(...)):
 if not get_settings().get("ordering_open",True):return render(request,"message.html",title="目前已截止訂餐",message="請等待下一次菜單開放。")
 try:requested=json.loads(items_json)
 except json.JSONDecodeError:requested=[]
 items=[]; total=0
 for row in requested:
  meal=get_item("meals",str(row.get("id",""))); qty=max(0,min(int(row.get("qty",0)),20))
  if not meal or not meal.get("active",True) or not qty:continue
  price=int(meal.get("price",0)); items.append({"meal_id":meal["id"],"name":meal["name"],"price":price,"qty":qty,"subtotal":price*qty}); total+=price*qty
 schedule=get_schedule(pickup_date,location_id)
 if not items or not schedule:return render(request,"message.html",title="訂單沒有送出",message="請重新選擇開放中的日期與取餐地點。")
 if pickup_time not in schedule.get("pickup_slots",[]):return render(request,"message.html",title="取餐時間無效",message="請重新選擇取餐時間。")
 now=datetime.now(timezone.utc).isoformat(); oid=create_order({"customer_name":customer_name.strip(),"phone":phone.strip(),"location_id":location_id,"location_name":schedule["location_name"],"pickup_time":pickup_time,"pickup_date":pickup_date,"note":note.strip(),"items":items,"total":total,"status":"new","created_at":now,"updated_at":now})
 return RedirectResponse(f"/orders/{oid}/success",status_code=303)

@app.get("/orders/{oid}/success",response_class=HTMLResponse)
async def order_success(request:Request,oid:str):
 order=get_order(oid)
 return render(request,"order_success.html",order=order) if order else HTMLResponse("找不到訂單",status_code=404)

@app.get("/admin/login",response_class=HTMLResponse)
async def admin_login_page(request:Request):return render(request,"admin_login.html",error=None)

@app.post("/admin/login")
async def admin_login(request:Request,username:str=Form(...),password:str=Form(...)):
 expected_user=os.getenv("ADMIN_USERNAME","airita-admin"); expected_password=os.getenv("ADMIN_PASSWORD")
 if expected_password and secrets.compare_digest(username,expected_user) and secrets.compare_digest(password,expected_password):
  request.session.clear(); request.session["admin"]=True; return RedirectResponse("/admin",status_code=303)
 return render(request,"admin_login.html",error="帳號或密碼錯誤；若尚未設定 ADMIN_PASSWORD，請先到 Heroku Config Vars 設定。")

@app.post("/admin/logout")
async def admin_logout(request:Request):request.session.clear(); return RedirectResponse("/admin/login",status_code=303)

@app.get("/admin",response_class=HTMLResponse)
async def admin_dashboard(request:Request):
 if not is_admin(request):return RedirectResponse("/admin/login",status_code=303)
 orders=list_orders(); return render(request,"admin_dashboard.html",orders=orders,new_count=sum(x.get("status")=="new" for x in orders),database_connected=db is not None)

@app.post("/admin/orders/{oid}/status")
async def order_status(request:Request,oid:str,status:str=Form(...)):
 if not is_admin(request):return RedirectResponse("/admin/login",status_code=303)
 if status not in {"new","confirmed","completed","cancelled"}:status="new"
 if db:db.collection("orders").document(oid).set({"status":status,"updated_at":datetime.now(timezone.utc).isoformat()},merge=True)
 elif oid in memory.orders:memory.orders[oid]["status"]=status
 return RedirectResponse("/admin",status_code=303)

@app.get("/admin/menu",response_class=HTMLResponse)
async def admin_menu(request:Request,edit:str|None=None):
 if not is_admin(request):return RedirectResponse("/admin/login",status_code=303)
 return render(request,"admin_menu.html",meals=list_collection("meals"),editing=get_item("meals",edit) if edit else None)

async def upload_image(file):
 if not file or not file.filename or not os.getenv("CLOUDINARY_URL"):return None
 import cloudinary,cloudinary.uploader
 cloudinary.config(cloudinary_url=os.getenv("CLOUDINARY_URL"),secure=True)
 result=cloudinary.uploader.upload(await file.read(),folder="airita-menu",resource_type="image"); return result.get("secure_url")

@app.post("/admin/menu/save")
async def menu_save(request:Request,meal_id:str=Form(""),name:str=Form(...),store:str=Form(...),category:str=Form(...),description:str=Form(""),price:int=Form(...),image_url:str=Form(""),image_file:UploadFile|None=None,active:str|None=Form(None),sort:int=Form(99)):
 if not is_admin(request):return RedirectResponse("/admin/login",status_code=303)
 meal_id=meal_id or f"meal-{secrets.token_hex(4)}"; existing=get_item("meals",meal_id) or {}; uploaded=await upload_image(image_file)
 save_item("meals",meal_id,{"name":name.strip(),"store":store.strip(),"category":category.strip(),"description":description.strip(),"price":max(price,0),"image_url":uploaded or image_url.strip() or existing.get("image_url",""),"active":active=="on","sort":sort})
 return RedirectResponse("/admin/menu",status_code=303)

@app.post("/admin/menu/{meal_id}/toggle")
async def menu_toggle(request:Request,meal_id:str):
 if not is_admin(request):return RedirectResponse("/admin/login",status_code=303)
 meal=get_item("meals",meal_id)
 if meal:save_item("meals",meal_id,{"active":not meal.get("active",True)})
 return RedirectResponse("/admin/menu",status_code=303)

@app.get("/admin/settings",response_class=HTMLResponse)
async def admin_settings(request:Request):
 if not is_admin(request):return RedirectResponse("/admin/login",status_code=303)
 return render(request,"admin_settings.html",settings=get_settings(),locations=list_collection("locations"),schedules=list_schedules())

@app.post("/admin/settings")
async def settings_save(request:Request,headline:str=Form(...),ordering_open:str|None=Form(None)):
 if not is_admin(request):return RedirectResponse("/admin/login",status_code=303)
 save_settings({"headline":headline.strip(),"ordering_open":ordering_open=="on"}); return RedirectResponse("/admin/settings",status_code=303)

@app.post("/admin/schedules/save")
async def schedule_save(request:Request,schedule_id:str=Form(""),date:str=Form(...),location_id:str=Form(...),pickup_slots:str=Form(...),active:str|None=Form(None),sort:int=Form(99)):
 if not is_admin(request):return RedirectResponse("/admin/login",status_code=303)
 location=get_item("locations",location_id)
 if not location:return RedirectResponse("/admin/settings",status_code=303)
 slots=[slot.strip() for slot in pickup_slots.replace("，",",").split(",") if slot.strip()]
 if not slots:slots=DEFAULT_PICKUP_SLOTS
 existing=next((item for item in list_schedules() if item.get("date")==date and item.get("location_id")==location_id),None)
 schedule_id=schedule_id or (existing["id"] if existing else f"schedule-{secrets.token_hex(4)}")
 save_schedule(schedule_id,{"date":date,"location_id":location_id,"location_name":location["name"],"pickup_slots":slots,"active":active=="on","sort":sort})
 return RedirectResponse("/admin/settings",status_code=303)

@app.post("/admin/locations/save")
async def location_save(request:Request,location_id:str=Form(""),name:str=Form(...),pickup_slots:str=Form(...),active:str|None=Form(None),sort:int=Form(99)):
 if not is_admin(request):return RedirectResponse("/admin/login",status_code=303)
 slots=[slot.strip() for slot in pickup_slots.replace("，",",").split(",") if slot.strip()]
 if not slots:slots=DEFAULT_PICKUP_SLOTS
 location_id=location_id or f"loc-{secrets.token_hex(4)}"; save_item("locations",location_id,{"name":name.strip(),"pickup_time":"、".join(slots),"pickup_slots":slots,"active":active=="on","sort":sort}); return RedirectResponse("/admin/settings",status_code=303)

@app.post("/admin/locations/{location_id}/toggle")
async def location_toggle(request:Request,location_id:str):
 if not is_admin(request):return RedirectResponse("/admin/login",status_code=303)
 loc=get_item("locations",location_id)
 if loc:save_item("locations",location_id,{"active":not loc.get("active",True)})
 return RedirectResponse("/admin/settings",status_code=303)

@app.get("/health")
async def health():return {"status":"ok","database":"firestore" if db else "memory"}
