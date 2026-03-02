const Controller = require('../controller/agente.controller');
const { Router } = require('express');

const router = Router();

router.post('/send-input', Controller.sendInput);

module.exports = router;