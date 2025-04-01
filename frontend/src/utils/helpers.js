export const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

export const calculateTotalNutrition = (items) => {
  return items.reduce(
    (acc, item) => {
      acc.calories += item.calories;
      acc.protein += item.protein;
      acc.carbs += item.carbs;
      acc.fat += item.fat;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
};

export const calculateDailyCalories = (user) => {
  if (!user || !user.weight || !user.height || !user.age || !user.gender) {
    return 2000; // Әдепкі мән
  }

  // Harris-Benedict формуласын қолданып негізгі BMR есептеу
  let bmr;
  if (user.gender === 'male') {
    bmr = 88.362 + (13.397 * user.weight) + (4.799 * user.height) - (5.677 * user.age);
  } else {
    bmr = 447.593 + (9.247 * user.weight) + (3.098 * user.height) - (4.330 * user.age);
  }

  // Белсенділік деңгейі коэффициенті
  const activityLevels = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9
  };

  const activityMultiplier = activityLevels[user.activity_level] || 1.2;

  // TDEE (Күнделікті жалпы энергия шығыны) есептеу
  let tdee = bmr * activityMultiplier;

  // Мақсатқа байланысты түзету
  if (user.goal === 'lose') {
    tdee -= 500; // Салмақ жоғалту үшін дефицит
  } else if (user.goal === 'gain') {
    tdee += 500; // Салмақ қосу үшін профицит
  }
  // Егер мақсат 'maintain' болса, түзету қажет емес

  return Math.round(tdee);
};