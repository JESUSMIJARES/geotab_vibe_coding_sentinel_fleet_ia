require('dotenv').config();
const { FunctionTool } = require("@google/adk");
const { z } = require("zod");
const axios = require("axios");
const _ = require("lodash");

const getDrivingHours = new FunctionTool({
    name: 'get_driving_hours',
    description: 'Analice the trips of the last 24 hours for the deviceId provided to detect fatigue or non-compliance with continuous driving hours.',
    parameters: z.object({
        deviceId: z.string().describe('ID del dispositivo/vehículo'),
    }),
    execute: async ({ deviceId }) => {
        const url = `https://${process.env.GEOTAB_SERVER}/apiv1`;

        const authResponse = await axios.post(url, {
            method: 'Authenticate',
            params: {
                database: process.env.GEOTAB_DATABASE,
                userName: process.env.GEOTAB_USERNAME,
                password: process.env.GEOTAB_PASSWORD,
            },
        });
        const { credentials, path } = authResponse.data.result;

        const toDate = new Date().toISOString();
        const fromDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

        try {
            const response = await axios.post(`https://my.geotab.com/apiv1`, {
                method: 'Get',
                params: {
                    typeName: 'Trip',
                    search: {
                        deviceSearch: { id: deviceId },
                        fromDate: fromDate,
                        toDate: toDate,
                    },
                    credentials,
                },
            });

            const trips = response.data.result;
            if (_.isEmpty(trips)) return { status: 'success', message: 'No information available for the last 24 hours.' };

            let bloquesConduccion = [];
            let bloqueActual = {
                trips: [],
                duracionTotalMs: 0,
                inicio: trips[0].start,
                fin: null
            };

            for (let i = 0; i < trips.length; i++) {
                const trip = trips[i];
                const proximoTrip = trips[i + 1];

                bloqueActual.trips.push(trip);
                const tripDuration = new Date(trip.stop).getTime() - new Date(trip.start).getTime();
                bloqueActual.duracionTotalMs += tripDuration;

                if (proximoTrip) {
                    const tiempoDescanso = new Date(proximoTrip.start).getTime() - new Date(trip.stop).getTime();
                    const dosHorasMs = 2 * 60 * 60 * 1000;

                    if (tiempoDescanso > dosHorasMs) {
                        bloqueActual.fin = trip.stop;
                        bloquesConduccion.push(bloqueActual);
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

            const alertasFatiga = bloquesConduccion.map(b => {
                const horas = b.duracionTotalMs / (1000 * 60 * 60);
                return {
                    inicio: b.inicio,
                    fin: b.fin,
                    horas_conducidas: _.round(horas, 2),
                    excede_limite: horas > 6,
                    cantidad_trips: b.trips.length,
                    mensaje: horas > 6 ? "Alert: More than 6 hours of continuous driving without a 2-hour break." : "Normal"
                };
            });

            return {
                status: 'success',
                resumen: alertasFatiga
            };

        } catch (error) {
            return { status: 'error', message: error.message };
        }
    }
});

module.exports = { getDrivingHours };