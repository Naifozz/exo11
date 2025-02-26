import { openDb } from "../utils/db.js";
import { logError } from "../utils/logger.js";
import { validateArticle } from "../utils/validator.js";

export async function handleArticleRequest(req, res) {
    switch (req.method) {
        case "GET":
            if (req.url === "/articles") {
                await getAllArticles(req, res);
            } else {
                const id = req.url.split("/")[2];
                await getArticleById(req, res, id);
            }
            break;
        case "POST":
            if (req.url === "/articles") {
                await createArticle(req, res, req.body);
            } else {
                res.writeHead(405);
                res.end(JSON.stringify({ error: "Invalid URL for POST request" }));
            }
            break;
        case "PUT":
            if (req.url.startsWith("/articles/")) {
                const id = req.url.split("/")[2];
                await updateArticle(req, res, id, req.body);
            } else {
                res.writeHead(405);
                res.end(JSON.stringify({ error: "Invalid URL for PUT request" }));
            }
            break;
        case "DELETE":
            if (req.url.startsWith("/articles/")) {
                const id = req.url.split("/")[2];
                await deleteArticle(req, res, id);
            } else {
                res.writeHead(405);
                res.end(JSON.stringify({ error: "Invalid URL for DELETE request" }));
            }
            break;
        default:
            res.writeHead(405);
            res.end(JSON.stringify({ error: "Method Not Allowed" }));
    }
}

async function getAllArticles(req, res) {
    try {
        const db = await openDb();
        const articles = await db.all(
            "SELECT a.id as article_id, a.title, a.content, a.user_id, a.created_at, u.name, u.email FROM articles a JOIN users u ON a.user_id = u.id"
        );
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(articles));
    } catch (error) {
        await logError(error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal Server Error" }));
    }
}

async function getArticleById(req, res, id) {
    try {
        const db = await openDb();
        const article = await db.get(
            "SELECT a.id as article_id, a.title, a.content, a.user_id, a.created_at, u.name, u.email FROM articles a JOIN users u ON a.user_id = u.id WHERE a.id = ?",
            [id]
        );
        if (!article) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Article not found" }));
            return;
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(article));
    } catch (error) {
        await logError(error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal Server Error" }));
    }
}

async function createArticle(req, res, body) {
    try {
        const db = await openDb();

        // Vérifier si les champs obligatoires sont présents
        if (!body || !body.title || body.title.trim() === "") {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Title cannot be empty" }));
            return;
        }
        if (!body.content || body.content.trim() === "") {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Content cannot be empty" }));
            return;
        }
        const errors = validateArticle(body);

        if (errors) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: errors }));
            return;
        }

        if (!body.user_id) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "User ID is required" }));
            return;
        }
        if (isNaN(Number(body.user_id)) || !Number.isInteger(Number(body.user_id))) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "User ID must be a valid integer" }));
            return;
        }

        // Vérifier si l'utilisateur existe
        const user = await db.get("SELECT * FROM users WHERE id = ?", [body.user_id]);
        if (!user) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "User not found" }));
            return;
        }

        const result = await db.run(
            "INSERT INTO articles (title, content, user_id) VALUES (?, ?, ?)",
            [body.title, body.content, body.user_id]
        );
        const newId = result.lastID;

        const createdArticle = await db.get(
            "SELECT a.id as article_id, a.title, a.content, a.user_id, a.created_at, u.name, u.email FROM articles a JOIN users u ON a.user_id = u.id WHERE a.id = ?",
            [newId]
        );

        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify(createdArticle));
    } catch (error) {
        await logError(error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal Server Error" }));
    }
}

async function updateArticle(req, res, id, body) {
    try {
        const db = await openDb();

        // Validation
        if (!body || !body.title || body.title.trim() === "") {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Title cannot be empty" }));
            return;
        }
        if (!body.content || body.content.trim() === "") {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Content cannot be empty" }));
            return;
        }

        const errors = validateArticle(body);

        if (errors) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: errors }));
            return;
        }
        if (!body.user_id) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "User ID is required" }));
            return;
        }

        // Vérifier si l'utilisateur existe
        const user = await db.get("SELECT * FROM users WHERE id = ?", [body.user_id]);
        if (!user) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "User not found" }));
            return;
        }

        const result = await db.run(
            "UPDATE articles SET title = ?, content = ?, user_id = ? WHERE id = ?",
            [body.title, body.content, body.user_id, id]
        );

        if (result.changes === 0) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Article not found" }));
            return;
        }

        const updatedArticle = await db.get("SELECT * FROM articles WHERE id = ?", [id]);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(updatedArticle));
    } catch (error) {
        console.error("Erreur lors de la mise à jour de l'article :", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal Server Error" }));
    }
}

async function deleteArticle(req, res, id) {
    try {
        const db = await openDb();
        const result = await db.run("DELETE FROM articles WHERE id = ?", [id]);
        if (result.changes === 0) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Article not found" }));
            return;
        }
        res.writeHead(204);
        res.end();
    } catch (error) {
        await logError(error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal Server Error" }));
    }
}
// Exportez les fonctions
export { getAllArticles, getArticleById, createArticle, updateArticle, deleteArticle };
