import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Créer le dossier logs s'il n'existe pas
function ensureLogDirectory() {
    const logDir = path.join(__dirname, "../logs");
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
}

// Génère un ID unique sans dépendance externe
function generateUniqueId() {
    return crypto.randomBytes(4).toString("hex");
}

// Génère un nom de fichier unique pour chaque requête
function generateRequestLogFilename() {
    const timestamp = new Date().toISOString().replace(/:/g, "-").replace(/\./g, "-");
    const uniqueId = generateUniqueId();
    return path.join(__dirname, `../logs/request-${timestamp}-${uniqueId}.log`);
}

// Enregistre les informations de la requête dans un nouveau fichier
export function logRequest(method, url, headers = {}, body = null) {
    ensureLogDirectory();
    const requestId = generateUniqueId();
    const timestamp = new Date().toISOString();
    const logFilename = generateRequestLogFilename();

    let logContent = `=== REQUEST LOG [${requestId}] ===\n`;
    logContent += `Timestamp: ${timestamp}\n`;
    logContent += `Method: ${method}\n`;
    logContent += `URL: ${url}\n\n`;

    // Ajouter les en-têtes
    logContent += `=== HEADERS ===\n`;
    for (const [key, value] of Object.entries(headers)) {
        logContent += `${key}: ${value}\n`;
    }

    // Ajouter le corps si présent
    if (body) {
        logContent += `\n=== BODY ===\n`;
        try {
            const bodyStr =
                typeof body === "object" ? JSON.stringify(body, null, 2) : body.toString();
            logContent += bodyStr + "\n";
        } catch (error) {
            logContent += `[Impossible de sérialiser le corps de la requête: ${error.message}]\n`;
        }
    }

    try {
        fs.writeFileSync(logFilename, logContent);
        console.log(`Log de requête créé: ${path.basename(logFilename)}`);
        return { requestId, logFilename };
    } catch (error) {
        console.error("Erreur lors de l'écriture du fichier de log:", error);
        return { requestId, error };
    }
}

// Ajoute une réponse au fichier de log existant
export function logResponse(logFilename, statusCode, responseBody = null, error = null) {
    if (!logFilename) return;

    const timestamp = new Date().toISOString();
    let logContent = `\n=== RESPONSE ===\n`;
    logContent += `Timestamp: ${timestamp}\n`;
    logContent += `Status Code: ${statusCode}\n`;

    if (responseBody) {
        logContent += `\n=== RESPONSE BODY ===\n`;
        try {
            const bodyStr =
                typeof responseBody === "object"
                    ? JSON.stringify(responseBody, null, 2)
                    : responseBody.toString();
            logContent += bodyStr + "\n";
        } catch (err) {
            logContent += `[Impossible de sérialiser le corps de la réponse: ${err.message}]\n`;
        }
    }

    if (error) {
        logContent += `\n=== ERROR ===\n`;
        logContent += `Message: ${error.message}\n`;
        logContent += `Stack: ${error.stack}\n`;
    }

    try {
        fs.appendFileSync(logFilename, logContent);
        console.log(`Log de réponse ajouté: ${path.basename(logFilename)}`);
    } catch (err) {
        console.error("Erreur lors de l'ajout de la réponse au fichier de log:", err);
    }
}

export function logError(error, requestInfo = null) {
    ensureLogDirectory();
    const timestamp = new Date().toISOString();
    const errorId = generateUniqueId();
    const filename = path.join(
        __dirname,
        `../logs/error-${timestamp.split("T")[0]}-${errorId}.log`
    );

    let logContent = `=== ERROR LOG [${errorId}] ===\n`;
    logContent += `Timestamp: ${timestamp}\n`;
    logContent += `Message: ${error.message}\n`;
    logContent += `Stack: ${error.stack}\n`;

    if (requestInfo) {
        logContent += `\n=== REQUEST INFO ===\n`;
        logContent += `Method: ${requestInfo.method || "N/A"}\n`;
        logContent += `URL: ${requestInfo.url || "N/A"}\n`;
        if (requestInfo.requestId) {
            logContent += `Request ID: ${requestInfo.requestId}\n`;
        }
    }

    try {
        fs.writeFileSync(filename, logContent);
        console.error(`Log d'erreur créé: ${path.basename(filename)}`);
    } catch (err) {
        console.error("Erreur lors de l'écriture du fichier de log d'erreur:", err);
    }
}
