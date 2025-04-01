from fastapi import APIRouter, Depends, HTTPException, status, Security
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import List, Optional
from datetime import datetime, timedelta
import jwt
from jwt.exceptions import PyJWTError
from pydantic import EmailStr

from database import (
    get_db, verify_password, get_password_hash,
    User, Food, Meal, MealItem, MealPlan,
    UserCreate, UserLogin, UserOut, UserUpdate, UserProfile, Token,
    FoodCreate, FoodUpdate, FoodOut,
    MealCreate, MealUpdate, MealOut, MealItemCreate, MealItemOut,
    MealPlanCreate, MealPlanUpdate, MealPlanOut,
    DashboardData
)

# JWT Configuration
SECRET_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2NhwIjoxNzQzNDE5NDQyfQ.vwFq-vnlp48JIDXIFWf-peA3bL1j8kx_BBB_DboOtdg"  # In production, use a secure random key stored in environment variables
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# Router instances
router = APIRouter()
auth_router = APIRouter(prefix="/auth", tags=["Authentication"])
users_router = APIRouter(prefix="/users", tags=["Users"])
foods_router = APIRouter(prefix="/foods", tags=["Foods"])
meals_router = APIRouter(prefix="/meals", tags=["Meals"])
meal_plans_router = APIRouter(prefix="/meal-plans", tags=["Meal Plans"])
dashboard_router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

# JWT Token Functions
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Dependency to get current user
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        token_type: str = payload.get("type")
        if user_id is None or token_type != "access":
            raise credentials_exception
    except PyJWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user

# Authentication Routes
@auth_router.post("/register", response_model=Token)
def register(user: UserCreate, db: Session = Depends(get_db)):
    # Check if user with the same email exists
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create tokens
    access_token = create_access_token(data={"sub": db_user.id})
    refresh_token = create_refresh_token(data={"sub": db_user.id})
    
    # Convert User model to UserOut Pydantic model
    user_out = UserOut.from_orm(db_user)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user_out
    }

@auth_router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Find user by email
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Create tokens
    access_token = create_access_token(data={"sub": user.id})
    refresh_token = create_refresh_token(data={"sub": user.id})

    # Convert User model to UserOut Pydantic model
    user_out = UserOut.from_orm(user)

    # Parse dietary preferences from string to list
    if user.dietary_preferences:
        user_out.dietary_preferences = user.dietary_preferences.split(",")
    else:
        user_out.dietary_preferences = []

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user_out
    }

@auth_router.post("/refresh-token", response_model=Token)
def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        token_type: str = payload.get("type")
        if user_id is None or token_type != "refresh":
            raise credentials_exception
    except PyJWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    
    # Create new access token
    access_token = create_access_token(data={"sub": user.id})
    
    # Convert User model to UserOut Pydantic model
    user_out = UserOut.from_orm(user)
    
    # Parse dietary preferences from string to list
    if user.dietary_preferences:
        user_out.dietary_preferences = user.dietary_preferences.split(",")
    else:
        user_out.dietary_preferences = []
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user_out
    }

@auth_router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    # In a stateless JWT system, actual logout happens on the client side
    # by removing the stored tokens. This endpoint is for compatibility.
    return {"detail": "Successfully logged out"}

# User Routes
@users_router.get("/me", response_model=UserOut)
def get_user_profile(current_user: User = Depends(get_current_user)):
    user_out = UserOut.from_orm(current_user)
    
    # Parse dietary preferences from string to list
    if current_user.dietary_preferences:
        user_out.dietary_preferences = current_user.dietary_preferences.split(",")
    else:
        user_out.dietary_preferences = []
    
    return user_out

@users_router.put("/me", response_model=UserOut)
def update_user_profile(user_update: UserUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Update user information
    for key, value in user_update.dict(exclude_unset=True).items():
        if key == "dietary_preferences" and value is not None:
            # Convert list to comma-separated string
            setattr(current_user, key, ",".join(value))
        else:
            setattr(current_user, key, value)
    
    db.commit()
    db.refresh(current_user)
    
    # Convert User model to UserOut Pydantic model
    user_out = UserOut.from_orm(current_user)
    
    # Parse dietary preferences from string to list
    if current_user.dietary_preferences:
        user_out.dietary_preferences = current_user.dietary_preferences.split(",")
    else:
        user_out.dietary_preferences = []
    
    return user_out

# Food Routes
@foods_router.post("", response_model=FoodOut)
def create_food(food: FoodCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_food = Food(**food.dict(), user_id=current_user.id)
    db.add(db_food)
    db.commit()
    db.refresh(db_food)
    return db_food

@foods_router.get("", response_model=List[FoodOut])
def get_foods(
    skip: int = 0, 
    limit: int = 100,
    search: Optional[str] = None,
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Food).filter(Food.user_id == current_user.id)
    
    # Apply search filter if provided
    if search:
        query = query.filter(Food.name.ilike(f"%{search}%"))
    
    # Apply category filter if provided
    if category and category != "all":
        query = query.filter(Food.category == category)
    
    # Get total count before pagination
    total = query.count()
    
    # Apply pagination
    foods = query.offset(skip).limit(limit).all()
    
    # Add header with total count
    return foods

@foods_router.get("/{food_id}", response_model=FoodOut)
def get_food(food_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    food = db.query(Food).filter(
        Food.id == food_id,
        Food.user_id == current_user.id
    ).first()
    
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")
    
    return food

@foods_router.put("/{food_id}", response_model=FoodOut)
def update_food(
    food_id: int,
    food_update: FoodUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    food = db.query(Food).filter(
        Food.id == food_id,
        Food.user_id == current_user.id
    ).first()
    
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")
    
    # Update food attributes
    for key, value in food_update.dict().items():
        setattr(food, key, value)
    
    db.commit()
    db.refresh(food)
    return food

@foods_router.delete("/{food_id}", response_model=dict)
def delete_food(food_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    food = db.query(Food).filter(
        Food.id == food_id,
        Food.user_id == current_user.id
    ).first()
    
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")
    
    db.delete(food)
    db.commit()
    
    return {"detail": "Food deleted successfully"}

# Meal Routes
@meals_router.post("", response_model=MealOut)
def create_meal(meal_create: MealCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Validate date format (YYYY-MM-DD)
    try:
        datetime.strptime(meal_create.date, '%Y-%m-%d')
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Create new meal
    new_meal = Meal(
        name=meal_create.name,
        meal_type=meal_create.meal_type,
        date=meal_create.date,
        time=meal_create.time,
        user_id=current_user.id,
        total_calories=0.0,
        total_protein=0.0,
        total_carbs=0.0,
        total_fat=0.0
    )
    
    db.add(new_meal)
    db.flush()  # Get ID without committing transaction
    
    # Calculate nutrition totals
    total_calories = 0.0
    total_protein = 0.0
    total_carbs = 0.0
    total_fat = 0.0
    
    # Process meal items
    meal_items = []
    for item in meal_create.items:
        # Get food information
        food = db.query(Food).filter(Food.id == item.food_id).first()
        if not food:
            db.rollback()
            raise HTTPException(status_code=404, detail=f"Food with id {item.food_id} not found")
        
        # Calculate nutrition for this item based on quantity
        calories = food.calories * item.quantity / 100
        protein = food.protein * item.quantity / 100
        carbs = food.carbs * item.quantity / 100
        fat = food.fat * item.quantity / 100
        
        # Add to totals
        total_calories += calories
        total_protein += protein
        total_carbs += carbs
        total_fat += fat
        
        # Create meal item
        meal_item = MealItem(
            meal_id=new_meal.id,
            food_id=food.id,
            quantity=item.quantity,
            calories=calories,
            protein=protein,
            carbs=carbs,
            fat=fat
        )
        
        db.add(meal_item)
        meal_items.append(meal_item)
    
    # Update meal with calculated totals
    new_meal.total_calories = total_calories
    new_meal.total_protein = total_protein
    new_meal.total_carbs = total_carbs
    new_meal.total_fat = total_fat
    
    db.commit()
    db.refresh(new_meal)
    
    # Prepare response
    response = MealOut(
        id=new_meal.id,
        name=new_meal.name,
        meal_type=new_meal.meal_type,
        date=new_meal.date,
        time=new_meal.time,
        user_id=new_meal.user_id,
        total_calories=new_meal.total_calories,
        total_protein=new_meal.total_protein,
        total_carbs=new_meal.total_carbs,
        total_fat=new_meal.total_fat,
        items=[],
        created_at=new_meal.created_at
    )
    
    # Add meal items to response
    for item in meal_items:
        db.refresh(item)  # Ensure we have the latest data
        food = db.query(Food).filter(Food.id == item.food_id).first()
        response.items.append(
            MealItemOut(
                id=item.id,
                food_id=item.food_id,
                food_name=food.name,
                quantity=item.quantity,
                calories=item.calories,
                protein=item.protein,
                carbs=item.carbs,
                fat=item.fat
            )
        )
    
    return response

@meals_router.get("", response_model=List[MealOut])
def get_meals(
    date: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    meal_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Meal).filter(Meal.user_id == current_user.id)
    
    # Apply date filter
    if date:
        query = query.filter(Meal.date == date)
    elif start_date and end_date:
        query = query.filter(Meal.date >= start_date, Meal.date <= end_date)
    
    # Apply meal type filter
    if meal_type:
        query = query.filter(Meal.meal_type == meal_type)
    
    # Apply sorting
    query = query.order_by(Meal.date.desc(), Meal.time)
    
    # Apply pagination
    meals = query.offset(skip).limit(limit).all()
    
    # Prepare response
    result = []
    for meal in meals:
        # Get meal items
        meal_items = db.query(MealItem).filter(MealItem.meal_id == meal.id).all()
        
        # Create MealItemOut objects
        items = []
        for item in meal_items:
            food = db.query(Food).filter(Food.id == item.food_id).first()
            if food:
                items.append(
                    MealItemOut(
                        id=item.id,
                        food_id=item.food_id,
                        food_name=food.name,
                        quantity=item.quantity,
                        calories=item.calories,
                        protein=item.protein,
                        carbs=item.carbs,
                        fat=item.fat
                    )
                )
        
        # Create MealOut object
        meal_out = MealOut(
            id=meal.id,
            name=meal.name,
            meal_type=meal.meal_type,
            date=meal.date,
            time=meal.time,
            user_id=meal.user_id,
            total_calories=meal.total_calories,
            total_protein=meal.total_protein,
            total_carbs=meal.total_carbs,
            total_fat=meal.total_fat,
            items=items,
            created_at=meal.created_at
        )
        
        result.append(meal_out)
    
    return result

@meals_router.get("/{meal_id}", response_model=MealOut)
def get_meal(meal_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    meal = db.query(Meal).filter(
        Meal.id == meal_id,
        Meal.user_id == current_user.id
    ).first()
    
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")
    
    # Get meal items
    meal_items = db.query(MealItem).filter(MealItem.meal_id == meal.id).all()
    
    # Create MealItemOut objects
    items = []
    for item in meal_items:
        food = db.query(Food).filter(Food.id == item.food_id).first()
        if food:
            items.append(
                MealItemOut(
                    id=item.id,
                    food_id=item.food_id,
                    food_name=food.name,
                    quantity=item.quantity,
                    calories=item.calories,
                    protein=item.protein,
                    carbs=item.carbs,
                    fat=item.fat
                )
            )
            
    # Create MealOut object
    meal_out = MealOut(
        id=meal.id,
        name=meal.name,
        meal_type=meal.meal_type,
        date=meal.date,
        time=meal.time,
        user_id=meal.user_id,
        total_calories=meal.total_calories,
        total_protein=meal.total_protein,
        total_carbs=meal.total_carbs,
        total_fat=meal.total_fat,
        items=items,
        created_at=meal.created_at
    )
    
    return meal_out

@meals_router.put("/{meal_id}", response_model=MealOut)
def update_meal(
    meal_id: int,
    meal_update: MealUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if meal exists and belongs to current user
    meal = db.query(Meal).filter(
        Meal.id == meal_id,
        Meal.user_id == current_user.id
    ).first()
    
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")
    
    # Validate date format (YYYY-MM-DD)
    try:
        datetime.strptime(meal_update.date, '%Y-%m-%d')
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Update meal basic info
    meal.name = meal_update.name
    meal.meal_type = meal_update.meal_type
    meal.date = meal_update.date
    meal.time = meal_update.time
    
    # Delete existing meal items
    db.query(MealItem).filter(MealItem.meal_id == meal.id).delete()
    
    # Calculate nutrition totals
    total_calories = 0.0
    total_protein = 0.0
    total_carbs = 0.0
    total_fat = 0.0
    
    # Process new meal items
    meal_items = []
    for item in meal_update.items:
        # Get food information
        food = db.query(Food).filter(Food.id == item.food_id).first()
        if not food:
            db.rollback()
            raise HTTPException(status_code=404, detail=f"Food with id {item.food_id} not found")
        
        # Calculate nutrition for this item based on quantity
        calories = food.calories * item.quantity / 100
        protein = food.protein * item.quantity / 100
        carbs = food.carbs * item.quantity / 100
        fat = food.fat * item.quantity / 100
        
        # Add to totals
        total_calories += calories
        total_protein += protein
        total_carbs += carbs
        total_fat += fat
        
        # Create meal item
        meal_item = MealItem(
            meal_id=meal.id,
            food_id=food.id,
            quantity=item.quantity,
            calories=calories,
            protein=protein,
            carbs=carbs,
            fat=fat
        )
        
        db.add(meal_item)
        meal_items.append(meal_item)
    
    # Update meal with calculated totals
    meal.total_calories = total_calories
    meal.total_protein = total_protein
    meal.total_carbs = total_carbs
    meal.total_fat = total_fat
    
    db.commit()
    db.refresh(meal)
    
    # Prepare response
    response = MealOut(
        id=meal.id,
        name=meal.name,
        meal_type=meal.meal_type,
        date=meal.date,
        time=meal.time,
        user_id=meal.user_id,
        total_calories=meal.total_calories,
        total_protein=meal.total_protein,
        total_carbs=meal.total_carbs,
        total_fat=meal.total_fat,
        items=[],
        created_at=meal.created_at
    )
    
    # Add meal items to response
    for item in meal_items:
        db.refresh(item)  # Ensure we have the latest data
        food = db.query(Food).filter(Food.id == item.food_id).first()
        response.items.append(
            MealItemOut(
                id=item.id,
                food_id=item.food_id,
                food_name=food.name,
                quantity=item.quantity,
                calories=item.calories,
                protein=item.protein,
                carbs=item.carbs,
                fat=item.fat
            )
        )
    
    return response

@meals_router.delete("/{meal_id}", response_model=dict)
def delete_meal(meal_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Check if meal exists and belongs to current user
    meal = db.query(Meal).filter(
        Meal.id == meal_id,
        Meal.user_id == current_user.id
    ).first()
    
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")
    
    # Delete meal (cascade will delete meal items)
    db.delete(meal)
    db.commit()
    
    return {"detail": "Meal deleted successfully"}

# Meal Plan Routes
@meal_plans_router.post("", response_model=MealPlanOut)
def create_meal_plan(
    meal_plan: MealPlanCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Validate date formats (YYYY-MM-DD)
    try:
        start_date = datetime.strptime(meal_plan.start_date, '%Y-%m-%d')
        end_date = datetime.strptime(meal_plan.end_date, '%Y-%m-%d')
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Check if end date is after start date
    if end_date < start_date:
        raise HTTPException(status_code=400, detail="End date must be after start date")
    
    # Create new meal plan
    db_meal_plan = MealPlan(
        name=meal_plan.name,
        start_date=meal_plan.start_date,
        end_date=meal_plan.end_date,
        user_id=current_user.id
    )
    
    db.add(db_meal_plan)
    db.commit()
    db.refresh(db_meal_plan)
    
    return db_meal_plan

@meal_plans_router.get("", response_model=List[MealPlanOut])
def get_meal_plans(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    meal_plans = db.query(MealPlan).filter(
        MealPlan.user_id == current_user.id
    ).order_by(MealPlan.start_date.desc()).offset(skip).limit(limit).all()
    
    return meal_plans

@meal_plans_router.get("/{meal_plan_id}", response_model=MealPlanOut)
def get_meal_plan(
    meal_plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    meal_plan = db.query(MealPlan).filter(
        MealPlan.id == meal_plan_id,
        MealPlan.user_id == current_user.id
    ).first()
    
    if not meal_plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")
    
    return meal_plan

@meal_plans_router.put("/{meal_plan_id}", response_model=MealPlanOut)
def update_meal_plan(
    meal_plan_id: int,
    meal_plan_update: MealPlanUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if meal plan exists and belongs to current user
    meal_plan = db.query(MealPlan).filter(
        MealPlan.id == meal_plan_id,
        MealPlan.user_id == current_user.id
    ).first()
    
    if not meal_plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")
    
    # Validate date formats (YYYY-MM-DD)
    try:
        start_date = datetime.strptime(meal_plan_update.start_date, '%Y-%m-%d')
        end_date = datetime.strptime(meal_plan_update.end_date, '%Y-%m-%d')
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Check if end date is after start date
    if end_date < start_date:
        raise HTTPException(status_code=400, detail="End date must be after start date")
    
    # Update meal plan
    meal_plan.name = meal_plan_update.name
    meal_plan.start_date = meal_plan_update.start_date
    meal_plan.end_date = meal_plan_update.end_date
    
    db.commit()
    db.refresh(meal_plan)
    
    return meal_plan

@meal_plans_router.delete("/{meal_plan_id}", response_model=dict)
def delete_meal_plan(
    meal_plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if meal plan exists and belongs to current user
    meal_plan = db.query(MealPlan).filter(
        MealPlan.id == meal_plan_id,
        MealPlan.user_id == current_user.id
    ).first()
    
    if not meal_plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")
    
    # Delete meal plan
    db.delete(meal_plan)
    db.commit()
    
    return {"detail": "Meal plan deleted successfully"}

# Dashboard Routes
@dashboard_router.get("", response_model=DashboardData)
def get_dashboard_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get today's date in YYYY-MM-DD format
    today = datetime.now().strftime('%Y-%m-%d')
    
    # Calculate date range for weekly progress (last 7 days)
    week_ago = (datetime.now() - timedelta(days=6)).strftime('%Y-%m-%d')
    
    # Get today's meals
    today_meals = db.query(Meal).filter(
        Meal.user_id == current_user.id,
        Meal.date == today
    ).all()
    
    # Calculate today's nutrition stats
    today_stats = {
        "calories": sum(meal.total_calories for meal in today_meals),
        "protein": sum(meal.total_protein for meal in today_meals),
        "carbs": sum(meal.total_carbs for meal in today_meals),
        "fat": sum(meal.total_fat for meal in today_meals)
    }
    
    # Calculate daily calories for date range
    weekly_data = []
    for i in range(7):
        date = (datetime.now() - timedelta(days=6-i)).strftime('%Y-%m-%d')
        day_name = (datetime.now() - timedelta(days=6-i)).strftime('%a')
        
        # Get meals for this day
        day_meals = db.query(Meal).filter(
            Meal.user_id == current_user.id,
            Meal.date == date
        ).all()
        
        # Calculate total calories for this day
        day_calories = sum(meal.total_calories for meal in day_meals)
        
        # Calculate target calories based on user profile (simplified)
        target_calories = 2000  # Default
        if current_user.gender and current_user.weight and current_user.height and current_user.age:
            # Basic BMR calculation using Harris-Benedict formula
            if current_user.gender.lower() == 'male':
                bmr = 88.362 + (13.397 * current_user.weight) + (4.799 * current_user.height) - (5.677 * current_user.age)
            else:
                bmr = 447.593 + (9.247 * current_user.weight) + (3.098 * current_user.height) - (4.330 * current_user.age)
            
            # Activity level multiplier
            activity_multipliers = {
                'sedentary': 1.2,
                'light': 1.375,
                'moderate': 1.55,
                'active': 1.725,
                'very_active': 1.9
            }
            multiplier = activity_multipliers.get(current_user.activity_level, 1.2)
            
            # Target daily calories
            target_calories = bmr * multiplier
            
            # Adjust for goal
            if current_user.goal == 'lose':
                target_calories -= 500
            elif current_user.goal == 'gain':
                target_calories += 500
        
        # Calculate percentage of target
        percentage = day_calories / target_calories if target_calories > 0 else 0
        percentage = min(percentage, 1.0)  # Cap at 100%
        
        weekly_data.append({
            "date": date,
            "day": day_name,
            "calories": day_calories,
            "target": target_calories,
            "percentage": percentage
        })
    
    # Get recent meals (last 5)
    recent_meals = db.query(Meal).filter(
        Meal.user_id == current_user.id
    ).order_by(Meal.date.desc(), Meal.time.desc()).limit(5).all()
    
    # Format recent meals
    recent_meals_data = []
    for meal in recent_meals:
        recent_meals_data.append({
            "id": meal.id,
            "name": meal.name,
            "meal_type": meal.meal_type,
            "date": meal.date,
            "time": meal.time,
            "calories": meal.total_calories,
            "protein": meal.total_protein
        })
    
    # Return dashboard data
    return {
        "today_stats": today_stats,
        "weekly_progress": weekly_data,
        "recent_meals": recent_meals_data
    }