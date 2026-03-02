import 'dotenv/config';
import { FunctionTool, LlmAgent } from '@google/adk';
import { z } from 'zod';
import axios from 'axios';
import _ from 'lodash';

interface BloqueConduccion {
    trips: any[]; // Aquí puedes poner la interfaz de Geotab si la tienes
    duracionTotalMs: number;
    inicio: string;
    fin: string | null;
}

const geotabRequest = new FunctionTool({
    name: 'geotab_request',
    description: 'Makes a request to the Geotab API to get Exception Events for a specific device identifying potential risks.',
    parameters: z.object({
        deviceId: z.string().describe('The ID of the device (vehicle) to check for exception events.'),
    }),
    execute: async ({ deviceId }) => {
        const url = `https://${process.env.GEOTAB_SERVER}/apiv1`;

        const RULE_MAP: Record<string, string> = {
            "a1dGGXbPzPkWvaKscT1TVQQ": "Aceleración brusca",
            "aadpQZ4v8K0Om6cja-yHizQ": "Frenado brusco",
            "amU3Gk5HYJEOpQsBwdzrbTA": "Giro brusco (vuelta agresiva)",
            "a5PRFJHfRpkSY5BSSwvbuIQ": "Exceso de velocidad",
        };

        // Calculate start of today in UTC
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const fromDate = today.toISOString();

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

            console.log('Get Events now')

            // Now fetch ExceptionEvents for the specified deviceId since the start of today
            const requestBody = {
                method: 'Get',
                params: {
                    typeName: 'ExceptionEvent',
                    search: {
                        deviceSearch: { id: deviceId.toString() },
                        fromDate: '2026-02-27 06:00:00',
                        toDate: '2026-02-28 05:59:59',
                    },
                    credentials,
                },
            };



            const response = await axios.post(`https://my.geotab.com/apiv1`, requestBody);

            if (response.data.error) {
                return { status: 'error', message: response.data.error.message };
            }

            const rawEvents = response.data.result;

            const processedEvents = rawEvents.map((event: any) => ({
                tipo_de_evento: RULE_MAP[event.rule.id] || undefined,
                fecha_evento: event.activeFrom,
            }));
            const eventsValid = processedEvents.filter((event: any) => event.tipo_de_evento !== undefined);


            console.log('Get Positions')

            const logsRes = await axios.post(`https://my.geotab.com/apiv1`, {
                method: 'Get',
                params: {
                    typeName: 'LogRecord',
                    search: {
                        deviceSearch: { id: deviceId },
                        fromDate: '2026-02-27T06:00:00.000Z',
                        toDate: '2026-02-28T06:00:00.000Z',
                    },
                    credentials,
                },
            });

            const logs = logsRes.data.result;

            const preparedLogs = logs.map((log: any) => ({
                ...log,
                timestamp: new Date(log.dateTime).getTime()
            }));
            console.log('Resume events')

            const finalEvents = eventsValid.map((event: any) => {
                const eventStart = new Date(event.fecha_evento).getTime();

                // BUSQUEDA INTELIGENTE CON LODASH:
                // Encontramos el log que tenga la diferencia absoluta mínima con el inicio del evento
                const closestLog = _.minBy(preparedLogs, (log: any) =>
                    Math.abs(log.timestamp - eventStart)
                );

                // Mapeo amigable de la regla (puedes usar el RULE_MAP que definimos antes)

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
            console.log(finalEvents);
            return {
                status: 'success',
                deviceId,
                fromDate,
                events: finalEvents
            };
        } catch (error: any) {
            return { status: 'error', message: error.message };
        }
    },
});


const getDrivingHours = new FunctionTool({
    name: 'get_driving_hours',
    description: 'Analiza los viajes (Trips) de las últimas 24 horas para detectar fatiga o incumplimiento de horas de conducción continua.',
    parameters: z.object({
        deviceId: z.string().describe('ID del dispositivo/vehículo'),
    }),
    execute: async ({ deviceId }) => {
        const url = `https://${process.env.GEOTAB_SERVER}/apiv1`;

        // 1. Auth (Igual que tus otras herramientas)
        const authResponse = await axios.post(url, {
            method: 'Authenticate',
            params: {
                database: process.env.GEOTAB_DATABASE,
                userName: process.env.GEOTAB_USERNAME,
                password: process.env.GEOTAB_PASSWORD,
            },
        });
        const { credentials, path } = authResponse.data.result;

        // Definir rango de últimas 24 horas
        const toDate = new Date().toISOString();
        const fromDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        try {
            const response = await axios.post(`https://my.geotab.com/apiv1`, {
                method: 'Get',
                params: {
                    typeName: 'Trip',
                    search: {
                        deviceSearch: { id: deviceId },
                        fromDate,
                        toDate
                    },
                    credentials,
                },
            });

            const trips = response.data.result;
            if (_.isEmpty(trips)) return { status: 'success', message: 'Sin viajes en las últimas 24h.' };

            // --- LÓGICA DE FATIGA ---
            let bloquesConduccion = [];
            let bloqueActual: BloqueConduccion = {
                trips: [],
                duracionTotalMs: 0,
                inicio: trips[0].start,
                fin: null
            };

            for (let i = 0; i < trips.length; i++) {
                const trip = trips[i];
                const proximoTrip = trips[i + 1];

                bloqueActual.trips.push(trip);
                // Convertir duración de Geotab (TimeSpan string) a milisegundos o usar la diferencia de fechas
                const tripDuration = new Date(trip.stop).getTime() - new Date(trip.start).getTime();
                bloqueActual.duracionTotalMs += tripDuration;

                if (proximoTrip) {
                    const tiempoDescanso = new Date(proximoTrip.start).getTime() - new Date(trip.stop).getTime();
                    const dosHorasMs = 2 * 60 * 60 * 1000;

                    // Si el descanso es mayor a 2 horas, cerramos este bloque de conducción
                    if (tiempoDescanso > dosHorasMs) {
                        bloqueActual.fin = trip.stop;
                        bloquesConduccion.push(bloqueActual);
                        // Iniciamos un nuevo bloque
                        bloqueActual = {
                            trips: [],
                            duracionTotalMs: 0,
                            inicio: proximoTrip.start,
                            fin: null
                        };
                    }
                } else {
                    bloqueActual.fin = trip.stop;
                    bloquesConduccion.push(bloqueActual);
                }
            }

            // Mapeo final para el Agente
            const alertasFatiga = bloquesConduccion.map(b => {
                const horas = b.duracionTotalMs / (1000 * 60 * 60);
                return {
                    inicio: b.inicio,
                    fin: b.fin,
                    horas_conducidas: _.round(horas, 2),
                    excede_limite: horas > 6,
                    cantidad_trips: b.trips.length,
                    mensaje: horas > 6 ? "ALERTA: Más de 6h continuas sin descanso de 2h." : "Normal"
                };
            });

            return {
                status: 'success',
                resumen: alertasFatiga
            };

        } catch (error: any) {
            return { status: 'error', message: error.message };
        }
    }
});

const getLocationContext = new FunctionTool({
    name: 'get_location_context',
    description: 'Provides semantic context for a coordinate, identifying if it is near schools, hospitals, or dangerous intersections.',
    parameters: z.object({
        lat: z.number().describe('Latitude of the event'),
        lon: z.number().describe('Longitude of the event'),
    }),
    execute: async ({ lat, lon }) => {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&radius=200&key=${process.env.GOOGLE_GENAI_API_KEY}`;

        try {
            const response = await axios.get(url);
            const places = response.data.results;

            // Filtramos lugares que implican alto riesgo si hay conducción agresiva
            const highRiskZones = places.filter((p: any) =>
                p.types.some((t: string) => ['school', 'hospital', 'park', 'church', 'bus_station'].includes(t))
            );

            return {
                address: places[0]?.formatted_address || "Dirección desconocida",
                is_sensitive_area: highRiskZones.length > 0,
                nearby_sensitive_places: highRiskZones.map((p: any) => ({
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



export const rootAgent = new LlmAgent({
    name: 'agent',
    model: 'gemini-2.5-flash',
    description: 'Agente experto en auditoría de flotas y análisis de riesgos en la conducción.',
    instruction: `
        Eres un supervisor de seguridad de transporte. Tienes 3 herramientas principales:
        
        1. **geotab_request**: Para ver infracciones (aceleraciones, frenados, velocidad).
        2. **get_location_context**: Para ver si esas infracciones ocurrieron en zonas peligrosas (escuelas, etc).
        3. **get_driving_hours**: Para auditar la fatiga del conductor y cumplimiento de horas de servicio.
        
        TU MISIÓN:
        Cuando te pregunten por un vehículo, **siempre** verifica primero las horas de conducción. Si un conductor lleva más de 6 horas acumuladas con descansos menores a 2 horas, márcalo como "RIESGO EXTREMO POR FATIGA". 
        
        Combina todo: "El conductor lleva 7 horas manejando (Fatiga) y acaba de tener un frenado brusco cerca de una escuela (Entorno)". Ese es el tipo de reporte que espero.
    `,
    tools: [geotabRequest, getLocationContext, getDrivingHours],
});



