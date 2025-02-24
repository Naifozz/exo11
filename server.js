import http from "http";
import { handleArticleRequest } from "./routes/articles.js";
import { handleUsersRequest } from "./routes/users.js";
import { logRequest, logResponse, logError } from "./utils/logger.js";

// Fonction parseRequestBody centralisée
function parseRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";

        req.on("data", (chunk) => {
            body += chunk.toString();
        });

        req.on("end", () => {
            try {
                if (body.trim() === "") {
                    resolve({});
                    return;
                }
                const parsedBody = JSON.parse(body);
                resolve(parsedBody);
            } catch (error) {
                resolve({ _rawBody: body, _parseError: error.message });
            }
        });

        req.on("error", (error) => {
            reject(error);
        });
    });
}

const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Préflight CORS
    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }

    let requestBody = null;

    try {
        // Récupérer le corps de la requête en premier si applicable
        if (["POST", "PUT", "PATCH"].includes(req.method)) {
            req.body = await parseRequestBody(req);
        }

        // Logger la requête entrante
        await logRequest(req, req.method, req.url);

        if (req.url.startsWith("/articles")) {
            await handleArticleRequest(req, res);
        } else if (req.url.startsWith("/users")) {
            await handleUsersRequest(req, res);
        } else {
            res.writeHead(404);
            res.end(JSON.stringify({ error: "Route not found" }));
        }
    } catch (error) {
        await logError(error, req);
        res.writeHead(500);
        res.end(JSON.stringify({ error: "Internal Server Error" }));
    }
});

const PORT = 4000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
