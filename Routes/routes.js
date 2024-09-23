const express = require('express');
const router = express.Router();
const healthzController = require('../Controllers/healthzController');

router.all('/healthz',healthzController.healthz);

//All endpoints other than above mentioned are rejected
router.all('*', (req,res) => {
    res.status(404).send();
})

module.exports = router;