const express = require('express');
const router = express.Router();

router.all('/',healthzController.healthz);

module.exports = router;