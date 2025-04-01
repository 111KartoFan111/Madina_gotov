from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import json
import hashlib
import time
import os
import datetime

app = Flask(__name__)
CORS(app, supports_credentials=True, resources={r"/*": {"origins": "*"}})

# Помощник для чтения данных из разных форматов
def get_request_data():
    if request.is_json:
        return request.json
    elif request.form:
        return request.form
    else:
        try:
            # Попытка обработать данные как form-urlencoded
            raw_data = request.get_data().decode('utf-8')
            form_data = {}
            for item in raw_data.split('&'):
                if '=' in item:
                    key, value = item.split('=', 1)
                    form_data[key] = value
            return form_data
        except:
            return {}

# Токены и пользователи
user_tokens = {}  # Маппинг токенов к ID пользователей

# Функция для получения ID пользователя из токена
def get_user_id_from_token():
    auth_header = request.headers.get('Authorization', '')
    
    # Извлечение токена из заголовка Authorization
    if auth_header.startswith('Bearer '):
        token = auth_header[7:]  # Удаление 'Bearer ' из начала
        return user_tokens.get(token)
    
    # Если нет заголовка Authorization, проверяем X-User-ID
    return request.headers.get("X-User-ID")

# Database setup
DATABASE_PATH = "nutrition_tracker.db"

def get_db_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with app.app_context():
        if not os.path.exists(DATABASE_PATH):
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Create users table
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                full_name TEXT NOT NULL,
                gender TEXT,
                age INTEGER,
                weight REAL,
                height REAL,
                activity_level TEXT DEFAULT 'moderate',
                goal TEXT DEFAULT 'maintain',
                dietary_preferences TEXT
            )
            ''')
            
            # Create foods table
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS foods (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                calories REAL NOT NULL,
                protein REAL NOT NULL,
                carbs REAL NOT NULL,
                fat REAL NOT NULL,
                serving_size REAL NOT NULL,
                category TEXT NOT NULL,
                user_id INTEGER,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
            ''')
            
            # Create meals table
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS meals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                meal_type TEXT NOT NULL,
                date TEXT NOT NULL,
                time TEXT,
                items TEXT NOT NULL,
                total_calories REAL NOT NULL,
                total_protein REAL NOT NULL,
                total_carbs REAL NOT NULL,
                total_fat REAL NOT NULL,
                user_id INTEGER NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
            ''')
            
            # Add some default foods if the table is empty
            cursor.execute("SELECT COUNT(*) FROM foods")
            count = cursor.fetchone()[0]
            
            if count == 0:
                default_foods = [
                    # Proteins
                    {
                        "name": "Тауық еті (қуырылған)",
                        "calories": 165,
                        "protein": 31,
                        "carbs": 0,
                        "fat": 3.6,
                        "serving_size": 100,
                        "category": "protein",
                        "user_id": None
                    },
                    {
                        "name": "Сиыр еті (қуырылған)",
                        "calories": 250,
                        "protein": 26,
                        "carbs": 0,
                        "fat": 17,
                        "serving_size": 100,
                        "category": "protein",
                        "user_id": None
                    },
                    # Carbs
                    {
                        "name": "Күріш (пісірілген)",
                        "calories": 130,
                        "protein": 2.7,
                        "carbs": 28.2,
                        "fat": 0.3,
                        "serving_size": 100,
                        "category": "carbs",
                        "user_id": None
                    },
                    {
                        "name": "Нан (ақ)",
                        "calories": 265,
                        "protein": 9.1,
                        "carbs": 49,
                        "fat": 3.2,
                        "serving_size": 100,
                        "category": "carbs",
                        "user_id": None
                    },
                    # Fruits & Vegetables
                    {
                        "name": "Қызанақ",
                        "calories": 18,
                        "protein": 0.9,
                        "carbs": 3.9,
                        "fat": 0.2,
                        "serving_size": 100,
                        "category": "vegetable",
                        "user_id": None
                    },
                    {
                        "name": "Алма",
                        "calories": 52,
                        "protein": 0.3,
                        "carbs": 13.8,
                        "fat": 0.2,
                        "serving_size": 100,
                        "category": "fruit",
                        "user_id": None
                    }
                ]
                
                for food in default_foods:
                    cursor.execute('''
                    INSERT INTO foods (name, calories, protein, carbs, fat, serving_size, category, user_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        food["name"],
                        food["calories"],
                        food["protein"],
                        food["carbs"],
                        food["fat"],
                        food["serving_size"],
                        food["category"],
                        food["user_id"]
                    ))
            
            conn.commit()
            conn.close()

# Initialize database
init_db()

# Authentication helpers
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password, hashed_password):
    return hash_password(plain_password) == hashed_password

def get_user_by_email(email):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    conn.close()
    
    if user:
        user_dict = dict(user)
        # Convert dietary_preferences from JSON string to list
        try:
            user_dict["dietary_preferences"] = json.loads(user_dict["dietary_preferences"] or "[]")
        except:
            user_dict["dietary_preferences"] = []
        return user_dict
    
    return None

# Auth routes
@app.route("/auth/login", methods=["POST"])
def login():
    data = get_request_data()
    email = data.get("email", data.get("username", ""))
    password = data.get("password", "")
    
    user = get_user_by_email(email)
    if not user or not verify_password(password, user["password"]):
        return jsonify({"detail": "Электрондық пошта немесе құпия сөз қате"}), 401
    
    # Create a simple token (in a real app, use proper JWT)
    token = hash_password(f"{email}:{time.time()}")
    
    # Сохраняем токен в маппинге
    user_tokens[token] = str(user["id"])
    
    # Remove password from response
    user.pop("password", None)
    
    return jsonify({
        "access_token": token, 
        "token_type": "bearer", 
        "user": user
    })

@app.route("/auth/register", methods=["POST"])
def register():
    data = get_request_data()
    email = data.get("email")
    password = data.get("password")
    full_name = data.get("full_name")
    
    # Check if user exists
    if get_user_by_email(email):
        return jsonify({"detail": "Бұл электрондық поштамен тіркелген пайдаланушы бұрыннан бар"}), 400
    
    # Hash password
    hashed_password = hash_password(password)
    
    # Convert dietary_preferences list to JSON string
    dietary_preferences = json.dumps(data.get("dietary_preferences", []))
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
    INSERT INTO users (email, password, full_name, gender, age, weight, height, activity_level, goal, dietary_preferences)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        email,
        hashed_password,
        full_name,
        data.get("gender"),
        data.get("age"),
        data.get("weight"),
        data.get("height"),
        data.get("activity_level", "moderate"),
        data.get("goal", "maintain"),
        dietary_preferences
    ))
    
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    # Get the created user
    user = get_user_by_email(email)
    
    # Create token
    token = hash_password(f"{email}:{time.time()}")
    
    # Сохраняем токен в маппинге
    user_tokens[token] = str(user["id"])
    
    # Remove password from response
    user.pop("password", None)
    
    return jsonify({
        "access_token": token, 
        "token_type": "bearer", 
        "user": user
    })

@app.route("/auth/logout", methods=["POST"])
def logout():
    # Since we're using a simple token approach, no server-side logout is needed
    return jsonify({"message": "Жүйеден сәтті шықтыңыз"})

# User routes
@app.route("/users/me", methods=["GET"])
def get_current_user():
    user_id = get_user_id_from_token()
    if not user_id:
        return jsonify({"detail": "Аутентификация талап етіледі"}), 401
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()
    
    if not user:
        return jsonify({"detail": "Пайдаланушы табылмады"}), 404
    
    user_dict = dict(user)
    # Remove password from response
    user_dict.pop("password", None)
    
    # Convert dietary_preferences from JSON string to list
    try:
        user_dict["dietary_preferences"] = json.loads(user_dict["dietary_preferences"] or "[]")
    except:
        user_dict["dietary_preferences"] = []
    
    return jsonify(user_dict)

@app.route("/users/me", methods=["PUT"])
def update_current_user():
    user_id = get_user_id_from_token()
    if not user_id:
        return jsonify({"detail": "Аутентификация талап етіледі"}), 401
    
    data = get_request_data()
    
    # Convert dietary_preferences list to JSON string if provided
    if "dietary_preferences" in data:
        data["dietary_preferences"] = json.dumps(data["dietary_preferences"])
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Build the update query dynamically based on provided fields
    fields = []
    values = []
    
    for key, value in data.items():
        if key not in ["id", "password", "email"]:  # Exclude certain fields
            fields.append(f"{key} = ?")
            values.append(value)
    
    if fields:
        query = f"UPDATE users SET {', '.join(fields)} WHERE id = ?"
        values.append(user_id)
        
        cursor.execute(query, values)
        conn.commit()
    
    conn.close()
    
    # Return updated user
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()
    
    user_dict = dict(user)
    # Remove password from response
    user_dict.pop("password", None)
    
    # Convert dietary_preferences from JSON string to list
    try:
        user_dict["dietary_preferences"] = json.loads(user_dict["dietary_preferences"] or "[]")
    except:
        user_dict["dietary_preferences"] = []
    
    return jsonify(user_dict)

# Food routes
@app.route("/foods", methods=["GET"])
def get_foods():
    user_id = get_user_id_from_token()
    if not user_id:
        return jsonify({"detail": "Аутентификация талап етіледі"}), 401
    
    search = request.args.get("search", "")
    category = request.args.get("category", "")
    skip = request.args.get("skip", 0, type=int)
    limit = request.args.get("limit", 100, type=int)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = "SELECT * FROM foods WHERE (user_id = ? OR user_id IS NULL)"
    params = [user_id]
    
    if search:
        query += " AND name LIKE ?"
        params.append(f"%{search}%")
    
    if category and category != "all":
        query += " AND category = ?"
        params.append(category)
    
    query += f" LIMIT {limit} OFFSET {skip}"
    
    cursor.execute(query, params)
    foods = cursor.fetchall()
    conn.close()
    
    return jsonify([dict(food) for food in foods])

@app.route("/foods", methods=["POST"])
def create_food():
    user_id = get_user_id_from_token()
    if not user_id:
        return jsonify({"detail": "Аутентификация талап етіледі"}), 401
    
    data = get_request_data()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
    INSERT INTO foods (name, calories, protein, carbs, fat, serving_size, category, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data["name"],
        data["calories"],
        data["protein"],
        data["carbs"],
        data["fat"],
        data["serving_size"],
        data["category"],
        user_id
    ))
    
    food_id = cursor.lastrowid
    conn.commit()
    
    # Get the created food
    cursor.execute("SELECT * FROM foods WHERE id = ?", (food_id,))
    food = cursor.fetchone()
    
    conn.close()
    
    return jsonify(dict(food))

@app.route("/foods/<int:food_id>", methods=["GET"])
def get_food(food_id):
    user_id = get_user_id_from_token()
    if not user_id:
        return jsonify({"detail": "Аутентификация талап етіледі"}), 401
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM foods WHERE id = ?", (food_id,))
    food = cursor.fetchone()
    conn.close()
    
    if not food:
        return jsonify({"detail": "Тағам табылмады"}), 404
    
    food_dict = dict(food)
    
    # Check if the food belongs to the user or is a public food
    if food_dict["user_id"] is not None and str(food_dict["user_id"]) != user_id:
        return jsonify({"detail": "Бұл тағамға қол жеткізу рұқсаты жоқ"}), 403
    
    return jsonify(food_dict)

@app.route("/foods/<int:food_id>", methods=["DELETE"])
def delete_food(food_id):
    user_id = get_user_id_from_token()
    if not user_id:
        return jsonify({"detail": "Аутентификация талап етіледі"}), 401
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Сначала проверим, существует ли продукт
    cursor.execute("SELECT * FROM foods WHERE id = ?", (food_id,))
    food = cursor.fetchone()
    
    if not food:
        conn.close()
        return jsonify({"detail": "Тағам табылмады"}), 404
    
    food_dict = dict(food)
    
    # Позволим пользователям удалять только свои собственные продукты
    # Либо проверим, является ли пользователь администратором (если такая роль существует)
    if food_dict["user_id"] is not None and str(food_dict["user_id"]) != user_id:
        conn.close()
        return jsonify({"detail": "Бұл тағамды жоюға рұқсатыңыз жоқ"}), 403
    
    # Для демонстрационных целей, просто создаем копию продукта
    if food_dict["user_id"] is None:
        # Создаем копию продукта для текущего пользователя вместо удаления общего
        cursor.execute('''
        INSERT INTO foods (name, calories, protein, carbs, fat, serving_size, category, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            food_dict["name"] + " (копия)",
            food_dict["calories"],
            food_dict["protein"],
            food_dict["carbs"],
            food_dict["fat"],
            food_dict["serving_size"],
            food_dict["category"],
            user_id
        ))
        conn.commit()
        conn.close()
        return jsonify({"message": "Стандартный тағам көшірмесі жасалды"}), 200
    
    # Если продукт принадлежит пользователю, удаляем его
    cursor.execute("DELETE FROM foods WHERE id = ?", (food_id,))
    conn.commit()
    conn.close()
    
    return jsonify({"message": "Тағам сәтті жойылды"})

# Meal routes
@app.route("/meal-plans", methods=["GET"])
def get_meal_plans():
    user_id = get_user_id_from_token()
    if not user_id:
        return jsonify({"detail": "Аутентификация талап етіледі"}), 401
    
    date = request.args.get("date", "")
    meal_type = request.args.get("meal_type", "")
    skip = request.args.get("skip", 0, type=int)
    limit = request.args.get("limit", 100, type=int)
    
    print(f"Получение планов питания для пользователя {user_id}, дата: {date}, тип: {meal_type}")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = "SELECT * FROM meals WHERE user_id = ?"
    params = [user_id]
    
    if date:
        query += " AND date = ?"
        params.append(date)
    
    if meal_type:
        query += " AND meal_type = ?"
        params.append(meal_type)
    
    query += " ORDER BY date DESC, time DESC"
    query += f" LIMIT {limit} OFFSET {skip}"
    
    print(f"SQL запрос: {query}, параметры: {params}")
    
    cursor.execute(query, params)
    meals = cursor.fetchall()
    
    print(f"Найдено приемов пищи: {len(meals)}")
    
    conn.close()
    
    result = []
    for meal in meals:
        meal_dict = dict(meal)
        # Convert items from JSON string to list
        try:
            items_str = meal_dict["items"]
            meal_dict["items"] = json.loads(items_str) if items_str else []
            print(f"Преобразовано элементов блюд для приема пищи {meal_dict['id']}: {len(meal_dict['items'])}")
        except Exception as e:
            print(f"Ошибка при преобразовании items для приема пищи {meal_dict['id']}: {str(e)}")
            meal_dict["items"] = []
        result.append(meal_dict)
    
    return jsonify(result)

@app.route("/meal-plans", methods=["POST"])
def create_meal_plan():
    user_id = get_user_id_from_token()
    if not user_id:
        return jsonify({"detail": "Аутентификация талап етіледі"}), 401
    
    # Получаем данные запроса
    data = get_request_data()
    
    # Добавляем логирование для отладки
    print("Получены данные для создания плана приема пищи:", data)
    
    # Проверяем на наличие необходимых полей
    required_fields = ["name", "meal_type", "date", "items"]
    missing_fields = [field for field in required_fields if field not in data]
    
    if missing_fields:
        return jsonify({"detail": f"Отсутствуют обязательные поля: {', '.join(missing_fields)}"}), 400
    
    # Преобразуем items в список, если он пришел как строка (например, в JSON)
    items = data.get("items", [])
    if isinstance(items, str):
        try:
            items = json.loads(items)
        except:
            return jsonify({"detail": "Неправильный формат списка items"}), 400
    
    # Проверяем, что есть элементы для сохранения
    if not items:
        return jsonify({"detail": "Список items не может быть пустым"}), 400
    
    # Конвертируем items в JSON-строку для хранения
    items_json = json.dumps(items)
    
    # Проверяем и конвертируем числовые поля
    try:
        total_calories = float(data.get("total_calories", 0))
        total_protein = float(data.get("total_protein", 0))
        total_carbs = float(data.get("total_carbs", 0))
        total_fat = float(data.get("total_fat", 0))
    except ValueError:
        return jsonify({"detail": "Неверный формат числовых данных для питательных веществ"}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
        INSERT INTO meals (name, meal_type, date, time, items, total_calories, total_protein, total_carbs, total_fat, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data["name"],
            data["meal_type"],
            data["date"],
            data.get("time"),
            items_json,
            total_calories,
            total_protein,
            total_carbs,
            total_fat,
            user_id
        ))
        
        meal_id = cursor.lastrowid
        conn.commit()
        
        # Получаем созданную запись приема пищи
        cursor.execute("SELECT * FROM meals WHERE id = ?", (meal_id,))
        meal = cursor.fetchone()
        conn.close()
        
        if not meal:
            return jsonify({"detail": "Ошибка при создании записи о приеме пищи"}), 500
        
        meal_dict = dict(meal)
        # Преобразуем items из JSON-строки в список
        try:
            meal_dict["items"] = json.loads(meal_dict["items"] or "[]")
        except:
            meal_dict["items"] = []
        
        return jsonify(meal_dict)
    except Exception as e:
        conn.rollback()
        conn.close()
        print("Ошибка при создании плана приема пищи:", str(e))
        return jsonify({"detail": f"Ошибка сервера: {str(e)}"}), 500

@app.route("/meal-plans/<int:meal_id>", methods=["DELETE"])
def delete_meal_plan(meal_id):
    user_id = get_user_id_from_token()
    if not user_id:
        return jsonify({"detail": "Аутентификация талап етіледі"}), 401
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if meal exists and belongs to user
    cursor.execute("SELECT * FROM meals WHERE id = ?", (meal_id,))
    meal = cursor.fetchone()
    
    if not meal:
        conn.close()
        return jsonify({"detail": "Тамақтану жоспары табылмады"}), 404
    
    meal_dict = dict(meal)
    if str(meal_dict["user_id"]) != user_id:
        conn.close()
        return jsonify({"detail": "Бұл тамақтану жоспарын жоюға рұқсатыңыз жоқ"}), 403
    
    cursor.execute("DELETE FROM meals WHERE id = ?", (meal_id,))
    conn.commit()
    conn.close()
    
    return jsonify({"message": "Тамақтану жоспары сәтті жойылды"})

@app.route("/dashboard", methods=["GET"])
def get_dashboard_data():
    user_id = get_user_id_from_token()
    if not user_id:
        return jsonify({"detail": "Аутентификация талап етіледі"}), 401
    
    # Get today's date
    today = datetime.datetime.now().strftime("%Y-%m-%d")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get today's stats
    cursor.execute('''
    SELECT SUM(total_calories) as calories,
           SUM(total_protein) as protein,
           SUM(total_carbs) as carbs,
           SUM(total_fat) as fat
    FROM meals
    WHERE user_id = ? AND date = ?
    ''', (user_id, today))
    
    stats = cursor.fetchone()
    today_stats = {
        "calories": stats["calories"] or 0 if stats else 0,
        "protein": stats["protein"] or 0 if stats else 0,
        "carbs": stats["carbs"] or 0 if stats else 0,
        "fat": stats["fat"] or 0 if stats else 0
    }
    
    # Get weekly progress
    # Calculate dates for last 7 days
    end_date = datetime.datetime.now()
    start_date = end_date - datetime.timedelta(days=6)
    
    weekly_progress = []
    
    for i in range(7):
        date = (start_date + datetime.timedelta(days=i)).strftime("%Y-%m-%d")
        day_name = (start_date + datetime.timedelta(days=i)).strftime("%a")
        
        cursor.execute('''
        SELECT SUM(total_calories) as calories
        FROM meals
        WHERE user_id = ? AND date = ?
        ''', (user_id, date))
        
        result = cursor.fetchone()
        day_calories = result["calories"] or 0 if result else 0
        
        # Get user's goal calories (simplified)
        goal_calories = 2000
        
        weekly_progress.append({
            "day": day_name,
            "date": date,
            "calories": day_calories,
            "goal_calories": goal_calories,
            "percentage": min(day_calories / goal_calories, 1.0) if goal_calories > 0 else 0
        })
    
    # Get recent meals
    cursor.execute('''
    SELECT id, name, meal_type, date, time, total_calories as calories, total_protein as protein
    FROM meals
    WHERE user_id = ?
    ORDER BY date DESC, time DESC
    LIMIT 5
    ''', (user_id,))
    
    recent_meals = [dict(meal) for meal in cursor.fetchall()]
    
    conn.close()
    
    return jsonify({
        "todayStats": today_stats,
        "weeklyProgress": weekly_progress,
        "recentMeals": recent_meals
    })

if __name__ == "__main__":
    app.run(debug=True, port=8000)