const express = require('express');
const router = express.Router();
const lightModeController = require('../controllers/lightModeController');
const { optionalAuth } = require('../middleware/auth');

router.post('/ancestor', optionalAuth, lightModeController.recognizeAncestor);
router.get('/daily', optionalAuth, lightModeController.getDailyRevival);
router.get('/authenticity', optionalAuth, lightModeController.getAuthenticityRound);
router.post('/share-card', optionalAuth, lightModeController.createShareCard);

module.exports = router;
