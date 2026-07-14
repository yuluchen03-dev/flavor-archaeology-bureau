const express = require('express');
const fragmentController = require('../controllers/fragmentController');

const router = express.Router();

router.get('/', fragmentController.listFragments);
router.get('/:id', fragmentController.getFragment);

module.exports = router;
