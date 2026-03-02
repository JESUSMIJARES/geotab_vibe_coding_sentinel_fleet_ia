const express = require("express");
const cors = require("cors");
const port = 3000;
const host = '0.0.0.0';
const app = express();
const router = require('./route/agente.route');

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cors());

app.use('/api', router);

app.listen(port, host, () => {
    try {
        console.log(`Server started at http://${host}:${port}`);
    } catch (error) {
        console.log(error)
    }
});
