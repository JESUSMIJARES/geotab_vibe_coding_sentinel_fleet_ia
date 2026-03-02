const _ = require("lodash");
const { geotabAgentRunner } = require('../agents/geotab.agents.js');

class AgentService {
    async sendInput(input) {

        const response = await geotabAgentRunner.runAgent(input, 'mmABC');
        const cleanedJsonString = response.replace(/```json\s*|\s*```/g, '').trim();
        return JSON.parse(cleanedJsonString);
    }
}

module.exports = new AgentService();