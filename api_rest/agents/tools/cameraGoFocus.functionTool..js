require('dotenv').config();
const { FunctionTool } = require("@google/adk");
const { z } = require("zod");
const axios = require("axios");
const _ = require("lodash");


const getCameraEvents = new FunctionTool({
    name: 'get_camera_events',
    description: 'Consults SmarterAI (GoFocus) camera events to detect visual behaviors like Tailgating, Distraction, or Smoking.',
    parameters: z.object({
        serialNumber: z.string().describe('The Geotab device serial number to filter camera events.'),
    }),
    execute: async ({ serialNumber }) => {
        try {

            console.log("Search cameras");
            const url = `https://my.geotab.com/apiv1`;

            const authResponseGeotab = await axios.post(url, {
                method: 'Authenticate',
                params: {
                    database: process.env.GEOTAB_DATABASE,
                    userName: process.env.GEOTAB_USERNAME,
                    password: process.env.GEOTAB_PASSWORD,
                },
            });
            const { credentials, path } = authResponseGeotab.data.result;

            const authResponse = await axios.post('https://api.smarterai.com/v5/auth/tenant-access-myg', {
                database: process.env.GEOTAB_DATABASE,
                myGUrl: process.env.GEOTAB_SERVER,
                sessionId: credentials.sessionId,
                username: process.env.GEOTAB_USERNAME
            });

            const accessToken = authResponse.data.accessToken;


            const mappingResponse = await axios.get(`https://media-services.geotab.com/api/DeviceMappings/serialNumber/${serialNumber}`, {
                headers: {
                    'x-mygeotab-database': process.env.GEOTAB_DATABASE,
                    'x-mygeotab-path': process.env.GEOTAB_SERVER,
                    'x-mygeotab-sessionid': credentials.sessionId,
                    'x-mygeotab-userid': process.env.GEOTAB_USER_ID,
                    'x-mygeotab-username': process.env.GEOTAB_USERNAME
                }
            });

            const smarterDeviceId = [mappingResponse.data.partnerMetaData.EndpointId] || [];

            const toTimestamp = Date.now();
            const fromTimestamp = toTimestamp - (48 * 60 * 60 * 1000);

            const searchBody = {
                filters: {
                    endpointIdList: smarterDeviceId,
                    fromTimestamp,
                    toTimestamp,
                    eventClassificationTypeList: ["TRUE_POSITIVE", "NOT_REVIEWED"],
                    tenantId: process.env.SMARTERIA_TENANT_ID
                },
                size: 20,
                page: 0,
                sortBy: { timestampOrder: "DESC" }
            };

            console.log("Search cameras");

            const eventsResponse = await axios.post('https://api.smarterai.com/v5/events/search', searchBody, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });


            const rawEvents = eventsResponse.data.data || [];

            const filteredEvents = rawEvents.map(ev => ({
                evento_visual: ev.triggerName,
                dispositivo_id: ev.mygDeviceId,
                severidad: ev.magnitudeRank,
                fecha: new Date(ev.eventTimestamp).toISOString(),
                snapUrls: ev.snapshots.map(eve => eve.downloadUrl)
            }));


            return {
                status: 'success',
                camera_events_found: filteredEvents.length,
                events: filteredEvents
            };

        } catch (error) {
            console.error("Error in SmarterAI Tool:", error.response?.data || error.message);
            return { status: 'error', message: "Could not retrieve camera events." };
        }
    },
});

module.exports = { getCameraEvents };
