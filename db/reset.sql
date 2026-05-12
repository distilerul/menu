-- Drop all tables in reverse dependency order before re-applying schema
DROP TABLE IF EXISTS shopping_list_items;
DROP TABLE IF EXISTS day_plans;
DROP TABLE IF EXISTS weekly_plans;
DROP TABLE IF EXISTS ingredients;
DROP TABLE IF EXISTS meal_sections;
DROP TABLE IF EXISTS meals;
DROP TABLE IF EXISTS menus;
