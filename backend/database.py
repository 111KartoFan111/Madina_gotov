import sqlite3
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import json

# Database setup
DATABASE_URL = "nutrition_tracker.db"

def get_db_connection():
    conn = sqlite3.connect(DATABASE_URL)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
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
            {
                "name": "Жұмыртқа",
                "calories": 78,
                "protein": 6.3,
                "carbs": 0.6,
                "fat": 5.3,
                "serving_size": 50,
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
            {
                "name": "Макарон (пісірілген)",
                "calories": 157,
                "protein": 5.8,
                "carbs": 30.9,
                "fat": 0.9,
                "serving_size": 100,
                "category": "carbs",
                "user_id": None
            },
            # Vegetables
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
                "name": "Қияр",
                "calories": 15,
                "protein": 0.6,
                "carbs": 3.6,
                "fat": 0.1,
                "serving_size": 100,
                "category": "vegetable",
                "user_id": None
            },
            # Fruits
            {
                "name": "Алма",
                "calories": 52,
                "protein": 0.3,
                "carbs": 13.8,
                "fat": 0.2,
                "serving_size": 100,
                "category": "fruit",
                "user_id": None
            },
            {
                "name": "Банан",
                "calories": 89,
                "protein": 1.1,
                "carbs": 22.8,
                "fat": 0.3,
                "serving_size": 100,
                "category": "fruit",
                "user_id": None
            },
            # Dairy
            {
                "name": "Сүт",
                "calories": 42,
                "protein": 3.4,
                "carbs": 4.8,
                "fat": 1,
                "serving_size": 100,
                "category": "dairy",
                "user_id": None
            },
            {
                "name": "Ірімшік",
                "calories": 402,
                "protein": 25,
                "carbs": 1.3,
                "fat": 33.1,
                "serving_size": 100,
                "category": "dairy",
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

# Initialize the database on module import
init_db()

# User functions
def create_user(user_data: dict) -> dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Convert dietary_preferences list to JSON string
    dietary_preferences = json.dumps(user_data.get("dietary_preferences", []))
    
    cursor.execute('''
    INSERT INTO users (email, password, full_name, gender, age, weight, height, activity_level, goal, dietary_preferences)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        user_data["email"],
        user_data["password"],
        user_data["full_name"],
        user_data.get("gender"),
        user_data.get("age"),
        user_data.get("weight"),
        user_data.get("height"),
        user_data.get("activity_level", "moderate"),
        user_data.get("goal", "maintain"),
        dietary_preferences
    ))
    
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    # Return the created user
    return get_user_by_id(user_id)

def get_user_by_email(email: str) -> Optional[dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    
    conn.close()
    
    if user:
        user_dict = dict(user)
        # Convert dietary_preferences from JSON string to list
        user_dict["dietary_preferences"] = json.loads(user_dict["dietary_preferences"]) if user_dict["dietary_preferences"] else []
        return user_dict
    
    return None

def get_user_by_id(user_id: int) -> Optional[dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    
    conn.close()
    
    if user:
        user_dict = dict(user)
        # Convert dietary_preferences from JSON string to list
        user_dict["dietary_preferences"] = json.loads(user_dict["dietary_preferences"]) if user_dict["dietary_preferences"] else []
        return user_dict
    
    return None

def update_user(user_id: int, user_data: dict) -> dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get existing user data
    existing_user = get_user_by_id(user_id)
    if not existing_user:
        raise ValueError("User not found")
    
    # Update only provided fields
    for key, value in user_data.items():
        if key in existing_user and key != "id" and key != "password" and value is not None:
            if key == "dietary_preferences":
                existing_user[key] = value
            else:
                existing_user[key] = value
    
    # Convert dietary_preferences list to JSON string
    dietary_preferences = json.dumps(existing_user["dietary_preferences"])
    
    cursor.execute('''
    UPDATE users
    SET email = ?, full_name = ?, gender = ?, age = ?, weight = ?, height = ?, 
        activity_level = ?, goal = ?, dietary_preferences = ?
    WHERE id = ?
    ''', (
        existing_user["email"],
        existing_user["full_name"],
        existing_user["gender"],
        existing_user["age"],
        existing_user["weight"],
        existing_user["height"],
        existing_user["activity_level"],
        existing_user["goal"],
        dietary_preferences,
        user_id
    ))
    
    conn.commit()
    conn.close()
    
    # Return the updated user
    return get_user_by_id(user_id)

# Food functions
def create_food(food_data: dict) -> dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
    INSERT INTO foods (name, calories, protein, carbs, fat, serving_size, category, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        food_data["name"],
        food_data["calories"],
        food_data["protein"],
        food_data["carbs"],
        food_data["fat"],
        food_data["serving_size"],
        food_data["category"],
        food_data["user_id"]
    ))
    
    food_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    # Return the created food
    return get_food_by_id(food_id)

def get_foods(user_id: int, search: Optional[str] = None, category: Optional[str] = None, 
              skip: int = 0, limit: int = 100) -> List[dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = """
    SELECT * FROM foods 
    WHERE (user_id = ? OR user_id IS NULL)
    """
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
    
    return [dict(food) for food in foods]

def get_food_by_id(food_id: int) -> Optional[dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM foods WHERE id = ?", (food_id,))
    food = cursor.fetchone()
    
    conn.close()
    
    return dict(food) if food else None

def update_food(food_id: int, food_data: dict) -> dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
    UPDATE foods
    SET name = ?, calories = ?, protein = ?, carbs = ?, fat = ?, 
        serving_size = ?, category = ?, user_id = ?
    WHERE id = ?
    ''', (
        food_data["name"],
        food_data["calories"],
        food_data["protein"],
        food_data["carbs"],
        food_data["fat"],
        food_data["serving_size"],
        food_data["category"],
        food_data["user_id"],
        food_id
    ))
    
    conn.commit()
    conn.close()
    
    # Return the updated food
    return get_food_by_id(food_id)

def delete_food(food_id: int) -> None:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("DELETE FROM foods WHERE id = ?", (food_id,))
    
    conn.commit()
    conn.close()

# Meal functions
def create_meal(meal_data: dict) -> dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Convert items list to JSON string
    items_json = json.dumps(meal_data["items"])
    
    cursor.execute('''
    INSERT INTO meals (name, meal_type, date, time, items, total_calories, total_protein, total_carbs, total_fat, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        meal_data["name"],
        meal_data["meal_type"],
        meal_data["date"],
        meal_data.get("time"),
        items_json,
        meal_data["total_calories"],
        meal_data["total_protein"],
        meal_data["total_carbs"],
        meal_data["total_fat"],
        meal_data["user_id"]
    ))
    
    meal_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    # Return the created meal
    return get_meal_by_id(meal_id)

def get_meals(user_id: int, date: Optional[str] = None, start_date: Optional[str] = None, 
              end_date: Optional[str] = None, meal_type: Optional[str] = None,
              skip: int = 0, limit: int = 100) -> List[dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = "SELECT * FROM meals WHERE user_id = ?"
    params = [user_id]
    
    if date:
        query += " AND date = ?"
        params.append(date)
    
    if start_date and end_date:
        query += " AND date BETWEEN ? AND ?"
        params.append(start_date)
        params.append(end_date)
    
    if meal_type:
        query += " AND meal_type = ?"
        params.append(meal_type)
    
    # Add order by date descending
    query += " ORDER BY date DESC, time DESC"
    
    query += f" LIMIT {limit} OFFSET {skip}"
    
    cursor.execute(query, params)
    meals = cursor.fetchall()
    
    conn.close()
    
    result = []
    for meal in meals:
        meal_dict = dict(meal)
        # Convert items from JSON string to list
        meal_dict["items"] = json.loads(meal_dict["items"]) if meal_dict["items"] else []
        result.append(meal_dict)
    
    return result

def get_meal_by_id(meal_id: int) -> Optional[dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM meals WHERE id = ?", (meal_id,))
    meal = cursor.fetchone()
    
    conn.close()
    
    if meal:
        meal_dict = dict(meal)
        # Convert items from JSON string to list
        meal_dict["items"] = json.loads(meal_dict["items"]) if meal_dict["items"] else []
        return meal_dict
    
    return None

def update_meal(meal_id: int, meal_data: dict) -> dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Convert items list to JSON string
    items_json = json.dumps(meal_data["items"])
    
    cursor.execute('''
    UPDATE meals
    SET name = ?, meal_type = ?, date = ?, time = ?, items = ?, 
        total_calories = ?, total_protein = ?, total_carbs = ?, total_fat = ?, user_id = ?
    WHERE id = ?
    ''', (
        meal_data["name"],
        meal_data["meal_type"],
        meal_data["date"],
        meal_data.get("time"),
        items_json,
        meal_data["total_calories"],
        meal_data["total_protein"],
        meal_data["total_carbs"],
        meal_data["total_fat"],
        meal_data["user_id"],
        meal_id
    ))
    
    conn.commit()
    conn.close()
    
    # Return the updated meal
    return get_meal_by_id(meal_id)

def delete_meal(meal_id: int) -> None:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("DELETE FROM meals WHERE id = ?", (meal_id,))
    
    conn.commit()
    conn.close()

def get_day_nutrition_stats(user_id: int, date: str) -> dict:
    """Get nutrition stats for a specific day."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
    SELECT SUM(total_calories) as calories, 
           SUM(total_protein) as protein, 
           SUM(total_carbs) as carbs, 
           SUM(total_fat) as fat
    FROM meals
    WHERE user_id = ? AND date = ?
    ''', (user_id, date))
    
    stats = cursor.fetchone()
    conn.close()
    
    if stats:
        stats_dict = dict(stats)
        # Replace None values with 0
        for key in stats_dict:
            if stats_dict[key] is None:
                stats_dict[key] = 0
        return stats_dict
    
    return {"calories": 0, "protein": 0, "carbs": 0, "fat": 0}

def get_weekly_progress(user_id: int, start_date: str, end_date: str) -> List[dict]:
    """Get daily progress for a date range."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create a list of dates in the range
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")
    date_range = [(start + timedelta(days=i)).strftime("%Y-%m-%d") for i in range((end - start).days + 1)]
    
    # Get user's goal calories (can be calculated based on user data too)
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    
    # Default goal calories if not set
    goal_calories = 2000
    
    if user:
        user_dict = dict(user)
        # Calculate goal calories based on user data
        gender = user_dict.get("gender")
        age = user_dict.get("age")
        weight = user_dict.get("weight")
        height = user_dict.get("height")
        activity_level = user_dict.get("activity_level", "moderate")
        goal = user_dict.get("goal", "maintain")
        
        if gender and age and weight and height:
            # Harris-Benedict formula
            if gender == "male":
                bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)
            else:
                bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age)
            
            # Activity level multiplier
            activity_multipliers = {
                "sedentary": 1.2,
                "light": 1.375,
                "moderate": 1.55,
                "active": 1.725,
                "very_active": 1.9
            }
            
            multiplier = activity_multipliers.get(activity_level, 1.55)
            tdee = bmr * multiplier
            
            # Adjust for goal
            if goal == "lose":
                goal_calories = tdee - 500
            elif goal == "gain":
                goal_calories = tdee + 500
            else:  # maintain
                goal_calories = tdee
            
            goal_calories = round(goal_calories)
    
    # Get calories for each day in the range
    results = []
    
    for date in date_range:
        cursor.execute('''
        SELECT SUM(total_calories) as calories
        FROM meals
        WHERE user_id = ? AND date = ?
        ''', (user_id, date))
        
        day_calories = cursor.fetchone()[0] or 0
        day_name = datetime.strptime(date, "%Y-%m-%d").strftime("%a")  # Short day name
        
        percentage = min(day_calories / goal_calories, 1.0) if goal_calories > 0 else 0
        
        results.append({
            "day": day_name,
            "date": date,
            "calories": day_calories,
            "goal_calories": goal_calories,
            "percentage": percentage
        })
    
    conn.close()
    return results

def get_recent_meals(user_id: int, limit: int = 5) -> List[dict]:
    """Get recent meals for a user."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
    SELECT * FROM meals
    WHERE user_id = ?
    ORDER BY date DESC, time DESC
    LIMIT ?
    ''', (user_id, limit))
    
    meals = cursor.fetchall()
    
    conn.close()
    
    result = []
    for meal in meals:
        meal_dict = dict(meal)
        # Extract only needed fields for display
        simplified_meal = {
            "id": meal_dict["id"],
            "name": meal_dict["name"],
            "meal_type": meal_dict["meal_type"],
            "date": meal_dict["date"],
            "time": meal_dict["time"],
            "calories": meal_dict["total_calories"],
            "protein": meal_dict["total_protein"]
        }
        result.append(simplified_meal)
    
    return result