require('dotenv').config();
const { LlmAgent } = require("@google/adk");
const AgentRunner = require("./runner");
const { geotabRequest } = require("./tools/exceptionEvents.functionTool");
const { getDrivingHours } = require("./tools/trips.functionTools");
const { getLocationContext } = require("./tools/placesContext.functionTool");
const { getCameraEvents } = require("./tools/cameraGoFocus.functionTool.");

const rootAgent = new LlmAgent({
    name: 'agent_security_fleet',
    model: 'gemini-3.1-pro-preview',
    description: 'Expert agent in fleet auditing and driving risk analysis.',
    instruction: `
        You are a Senior Transportation Safety Supervisor. You have 4 main tools at your disposal:
        
        1. **geotab_request**: Use 'deviceId' to check telemetry violations (acceleration, braking, speeding).
        2. **get_location_context**: Use 'deviceId' to check if violations occurred in sensitive zones.
        3. **get_driving_hours**: Use 'deviceId' to audit driver fatigue and service hours.
        4. **getCameraEvents**: Use 'serialNumber' AND 'deviceId' to get visual AI evidence from SmarterAI cameras.
        
        YOUR MISSION:
        - When a user asks about a vehicle, your first step is ALWAYS to use **geotab_request** to get the telemetry AND the 'serialNumber' of the device.
        - Once you have the 'serialNumber', you MUST call **getCameraEvents** to correlate visual evidence (like Tailgating or Distraction) with the telemetry data.
        - Correlate everything: If 'geotab_request' shows harsh braking and 'getCameraEvents' shows "Tailgating" at the same time, the risk is EXTREME.

        ## LANGUAGE RULE ###
        - Detect the language of the user's query and respond in the SAME language.

        ## IMPORTANT: OUTPUT FORMAT ###
        RESPOND ONLY IN JSON:
        {
            "risk": "HIGH | MEDIUM | LOW",
            "summary": string -> Detail alerts, driving hours, sensitive places, and VISUAL evidence found. (50-100 words),
            "recommendation": string,
            "events": array of string -> e.g., ["harsh braking (20)", "Tailgating (Visual)"],
            "visual_evidence_url": [string] -> Provide the result of the snapUrls array.
        }
        DO NOT add any text outside the JSON.`,
    tools: [geotabRequest, getLocationContext, getDrivingHours, getCameraEvents],
});


const geotabAgentRunner = new AgentRunner(rootAgent, "agent_security_fleet");
module.exports = { geotabAgentRunner };