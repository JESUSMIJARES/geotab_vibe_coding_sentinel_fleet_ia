require('dotenv').config();
const { FunctionTool } = require("@google/adk");
const { z } = require("zod");
const axios = require("axios");
const _ = require("lodash");

const getLocationContext = new FunctionTool({
    name: 'get_location_context',
    description: 'Provides semantic context for a coordinate, identifying if it is near schools, hospitals, or dangerous intersections.',
    parameters: z.object({
        lat: z.number().describe('Latitude of the event'),
        lon: z.number().describe('Longitude of the event'),
    }),
    execute: async ({ lat, lon }) => {
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&radius=200&key=${process.env.GOOGLE_GENAI_API_KEY}`;

        try {
            const response = await axios.get(url);
            const places = response.data.results;

            const highRiskZones = places.filter((p) =>
                p.types.some((t) => ['school', 'hospital', 'park', 'church', 'bus_station'].includes(t))
            );

            return {
                address: places[0]?.formatted_address || "Dirección desconocida",
                is_sensitive_area: highRiskZones.length > 0,
                nearby_sensitive_places: highRiskZones.map((p) => ({
                    name: p.name,
                    type: p.types[0]
                })),
                raw_types: places[0]?.types || []
            };
        } catch (error) {
            return { error: "No se pudo obtener el contexto del mapa" };
        }
    }
});

module.exports = { getLocationContext };
