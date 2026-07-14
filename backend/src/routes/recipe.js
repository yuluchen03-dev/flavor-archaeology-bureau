const express = require('express');
const router = express.Router();
const recipeController = require('../controllers/recipeController');

// 搜索菜品
router.get('/search', recipeController.searchRecipes);

// 获取菜品详情
router.get('/:id', recipeController.getRecipe);

module.exports = router;
