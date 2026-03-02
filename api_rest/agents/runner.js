const {
    Runner,
    InMemoryMemoryService,
    InMemorySessionService,
    isFinalResponse,
} = require("@google/adk");

class AgentRunner {
    #runner;
    #appName;
    #userId = "system_user";

    constructor(agent, appName = "zones_clasifier_app") {
        this.#appName = appName;
        this.#runner = new Runner({
            agent,
            appName: this.#appName,
            sessionService: new InMemorySessionService(),
            memoryService: new InMemoryMemoryService(),
        });
        this.#createSession();
    }

    #createSession = async () => {
        try {
            await this.#runner.sessionService.createSession({
                appName: this.#appName,
                sessionId: 'mmABC',
                userId: this.#userId,
            });
            console.log(`[${this.#appName}] Session created`);
            return true;
        } catch (err) {
            console.error("Error initializing runner:", err);
        }
    };

    runAgent = async (input, sessionId) => {
        try {
            const txt = JSON.stringify(input);
            let response = "";
            for await (Event of this.#runner.runAsync({
                userId: this.#userId,
                sessionId: sessionId,
                newMessage: { role: "user", parts: [{ text: txt }] },
            })) {
                if (isFinalResponse(Event)) {
                    response = Event.content.parts[0].text;
                }
            }
            return response;
        } catch (err) {
            console.error("Error running agent:", err);
        }
    };
}

module.exports = AgentRunner;