SENTINEL AI AGENTS ECOSYSTEM 🚀
SENTINEL AI AGENTS ECOSYSTEM is a cutting-edge artificial intelligence solution that transforms massive telemetry data into critical real-time decisions. Through an ecosystem of intelligent agents, the system performs a 360° audit of safety, fatigue, and urban environment context for vehicle fleets.

🛑 The Problem: "Noise" in Control Towers
In fleets of thousands of vehicles, a Geotab database generates millions of data points daily. For a control tower dispatcher, it is humanly impossible to identify which vehicle represents a real and imminent risk amidst thousands of generic alerts.

SENTINEL AI acts as a Critical Intelligence Filter, allowing safety teams to focus exclusively on the 1% of cases that truly represent a danger (extreme fatigue, aggressive driving in sensitive zones, visual negligence, etc.).

--------------------------------------------
✨ Key Features
** URBAN CONTEXTUALIZATION: Distinguishes between harsh braking on a highway versus in front of a school or hospital using Google Maps API.

** HUMAN FATIGUE DETECTION: Identifies continuous driving blocks (>6h) without adequate rest periods (aligned with international safety standards).

** VISUAL AI CONFIRMATION (NEW): Deep integration with Geotab GO FOCUS (SmarterAI). The agent "watches" the incident snapshots to confirm distracted driving, tailgating, or smoking.

** DECISION-SUPPORT INTERFACE: A custom-built dashboard that acts as a "Digital Co-pilot", providing clear summaries and actionable recommendations to speed up operational responses.

** RISK PRIORITIZATION: Classifies incidents into HIGH, MEDIUM, LOW, or EXTREME risk levels using multimodal AI reasoning.

----------------------------------------------------
🧠 Multi-Agent Orchestration & Interface
The heart of this project is the interaction between specialized agents and the user. We developed a dedicated Frontend to visualize how these agents collaborate:

The Reasoning Engine: Each agent (Fatigue, Context, Vision, Telemetry) works as an independent microservice.

The Digital Companion: Instead of showing raw logs, the interface presents the "Agent's Conclusion." This helps the user operate more agilely, acting as an expert companion that simplifies complex decision-making processes and facilitates faster intervention.
-----------------------------------------------
🛠️ Tech Stack & Architecture
The project utilizes a modern and scalable stack based on the Google Cloud ecosystem:

** AGENT FRAMEWORK (GEMINI ADK): Orchestration of specialized tools:

** GEOTAB_REQUEST: Audit of exception events and telemetry.

** GET_LOCATION_CONTEXT: Semantic environment analysis via Google Maps API.

** GET_DRIVING_HOURS: Trip reconstruction algorithm for fatigue detection.

** GOFOCUSEVENTS: Visual peritaje fetching snapshots from SmarterAI via Geotab Media Services mapping.

** FRONTEND (ANGULAR 21): A high-performance dashboard built with the latest Angular version, designed to visualize AI reasoning and visual evidence side-by-side.

** INFRASTRUCTURE: Node.js v24 Backend (Express) designed for Cloud Run auto-scaling.

** MODEL: Powered by Gemini 2.0 Flash for ultra-fast, multimodal (Text + Image) precise responses.

----------------------------------------------------
📂 Project Structure
/backend: Express server and Agent logic.

/tools: Independent modules for each agent capability.

agenteRoot.js: Central intelligence, personality, and multimodal instructions.

/frontend: Angular 21 Application (The Decision Dashboard).

.env.example: Template for required credentials.

----------------------------------------------------
🚀 Installation and Setup
Requirements
** Node.js: v24.11.1 or higher.

** NPM: v10 or higher.

** Angular CLI: For frontend development.

Configuration
Clone the repository.

Create a .env file in the backend folder using the .env.example as a guide:

Bash
GEOTAB_SERVER=my.geotab.com
GEOTAB_DATABASE=your_database
GEOTAB_USERNAME=your_username
GEOTAB_PASSWORD=your_password
GEOTAB_SESSION_ID=your_session_id
GOOGLE_GENAI_API_KEY=your_gemini_api_key
GOOGLE_MAPS_API_KEY=your_google_maps_key
Install dependencies in the root:

Bash
npm install

----------------------------------------------------
💻 Execution
Step 1: Backend (Sentinel AI Engine)
Navigate to the backend folder and start the REST API:

Bash
node api_rest/index.js
Endpoint: POST http://localhost:3000/api/send-input

Step 2: Frontend (Decision Dashboard)
Navigate to the frontend folder and run the development server:

Bash
npx ng serve
Access the dashboard at: http://localhost:4200