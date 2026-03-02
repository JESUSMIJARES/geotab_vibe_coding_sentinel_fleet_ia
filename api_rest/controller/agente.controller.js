const AgenteService = require('../services/agente.service');

class AgentController {
    async sendInput(req, res) {
        try {
            const response = await AgenteService.sendInput(req.body);
            return res.status(200).json(response);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new AgentController();
