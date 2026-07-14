const express = require('express');
const router = express.Router();
const starMapController = require('../controllers/starMapController');

// 获取味觉星图数据
router.get('/', starMapController.getStarMap);

// 获取菜品在星图上的位置
router.get('/dish/:id', starMapController.getDishPosition);

module.exports = router;
