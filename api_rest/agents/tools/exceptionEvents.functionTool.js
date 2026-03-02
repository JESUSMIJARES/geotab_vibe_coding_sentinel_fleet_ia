require('dotenv').config();
const { FunctionTool } = require("@google/adk");
const { z } = require("zod");
const axios = require("axios");
const _ = require("lodash");

const geotabRequest = new FunctionTool({
    name: 'geotab_request',
    description: 'Makes a request to the Geotab API to get Exception Events for a specific device identifying potential risks.',
    parameters: z.object({
        deviceId: z.string().describe('The ID of the device (vehicle) to check for exception events.'),
    }),
    execute: async ({ deviceId }) => {
        const url = `https://${process.env.GEOTAB_SERVER}/apiv1`;

        const RULE_MAP = {
            "RuleJackrabbitStartsId": "Aceleración brusca",
            "RuleHarshGpsBrakingId": "Frenado brusco",
            "RuleHarshGpsCorneringId": "Giro brusco (vuelta agresiva)",
            "RuleGpsSpeedingWindowId": "Exceso de velocidad",
        };

        const authBody = {
            method: 'Authenticate',
            params: {
                database: process.env.GEOTAB_DATABASE,
                userName: process.env.GEOTAB_USERNAME,
                password: process.env.GEOTAB_PASSWORD,
            },
        };

        try {
            // First, authenticate to get a session
            const authResponse = await axios.post(url, authBody);
            if (authResponse.data.error) {
                return { status: 'error', message: authResponse.data.error.message };
            }

            const credentials = authResponse.data.result.credentials;
            const toDate = new Date().toISOString();
            const fromDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

            const requestBody = {
                method: 'Get',
                params: {
                    typeName: 'ExceptionEvent',
                    search: {
                        deviceSearch: { id: deviceId.toString() },
                        fromDate: fromDate,
                        toDate: toDate,
                    },
                    credentials,
                },
            };

            const response = await axios.post(`https://my.geotab.com/apiv1`, requestBody);

            if (response.data.error) {
                return { status: 'error', message: response.data.error.message };
            }

            const rawEvents = response.data.result;

            const processedEvents = rawEvents.map((event) => ({
                tipo_de_evento: RULE_MAP[event.rule.id] || undefined,
                fecha_evento: event.activeFrom,
            }));
            const eventsValid = processedEvents.filter((event) => event.tipo_de_evento !== undefined);

            const logsRes = await axios.post(`https://my.geotab.com/apiv1`, {
                method: 'Get',
                params: {
                    typeName: 'LogRecord',
                    search: {
                        deviceSearch: { id: deviceId },
                        fromDate: fromDate,
                        toDate: toDate,
                    },
                    credentials,
                },
            });

            const logs = logsRes.data.result;

            const preparedLogs = logs.map((log) => ({
                ...log,
                timestamp: new Date(log.dateTime).getTime()
            }));

            const finalEvents = eventsValid.map((event) => {
                const eventStart = new Date(event.fecha_evento).getTime();
                const closestLog = _.minBy(preparedLogs, (log) =>
                    Math.abs(log.timestamp - eventStart)
                );

                return {
                    evento: event.tipo_de_evento,
                    fecha: event.fecha_evento,
                    ubicacion: closestLog ? {
                        lat: _.round(closestLog.latitude, 6),
                        lon: _.round(closestLog.longitude, 6),
                        velocidad: `${_.round(closestLog.speed, 1)} km/h`,
                    } : "Ubicación no disponible"
                };
            });

            console.log('Final events');
            return {
                status: 'success',
                deviceId,
                fromDate,
                events: finalEvents
            };
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    },
});

module.exports = { geotabRequest };