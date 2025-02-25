import { openDb } from "../utils/db.js";
import { logError } from "../utils/logger.js";
import { validateEmail } from "../utils/validator.js";
export async function handleUsersRequest(req, res) {
    switch (req.method) {
        case "GET":
            if (req.url === "/users") {
                await getAllUsers(req, res);
            } else if (req.url.match(/^\/users\/\d+\/articles$/)) {
                const id = req.url.split("/")[2];

                await getUserArticles(req, res, id);
            } else {
                const id = req.url.split("/")[2];
                await getUsersById(req, res, id);
            }
            break;
        case "POST":
            if (req.url === "/users") {
                await createUsers(req, res, req.body);
            } else {
                res.writeHead(405);
                res.end(JSON.stringify({ error: "Invalid URL for POST request" }));
            }
            break;
        case "PUT":
            if (req.url.startsWith("/users/")) {
                const id = req.url.split("/")[2];
                await updateUsers(req, res, id, req.body);
            } else {
                res.writeHead(405);
                res.end(JSON.stringify({ error: "Invalid URL for PUT request" }));
            }
            break;
        case "DELETE":
            if (req.url.startsWith("/users/")) {
                const id = req.url.split("/")[2];
                await deleteUsers(req, res, id);
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

async function getAllUsers(req, res) {
    try {
        const db = await openDb();
        const users = await db.all("SELECT * FROM users");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(users));
    } catch (error) {
        await logError(error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal Server Error" }));
    }
}

async function getUsersById(req, res, id) {
    try {
        const db = await openDb();
        const users = await db.get("SELECT * FROM users WHERE id = ?", [id]);
        if (!users) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Article not found" }));
            return;
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(users));
    } catch (error) {
        await logError(error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal Server Error" }));
    }
}
async function getUserArticles(req, res, id) {
    try {
        const db = await openDb();
        const user = await db.get("SELECT * FROM users WHERE id = ?", [id]);

        if (!user) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "User not found" }));
            return;
        }

        const userArticle = await db.all("SELECT * FROM articles WHERE user_id = ?", [id]);

        if (!userArticle) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Cet utilisateur n'a pas d'article" }));
            return;
        }
        const response = {
            user: user,
            articles: userArticle,
        };
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(response));
    } catch (error) {
        await logError(error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal Server Error" }));
    }
}

async function createUsers(req, res, body) {
    try {
        const db = await openDb();

        // Vérifier si les champs obligatoires sont présents
        if (!body || !body.name || body.name.trim() === "") {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Name cannot be empty" }));
            return;
        }
        if (!body.email || body.email.trim() === "") {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Email cannot be empty" }));
            return;
        }
        await validateEmail(body.email);

        // Vérifier si l'email existe déjà
        const existingUser = await db.get("SELECT * FROM users WHERE email = ?", [body.email]);
        if (existingUser) {
            res.writeHead(409, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Email already exists" }));
            return;
        }

        // Insérer le nouvel utilisateur
        const result = await db.run("INSERT INTO users (name, email) VALUES (?, ?)", [
            body.name,
            body.email,
        ]);
        const newId = result.lastID;

        const createdUser = await db.get("SELECT * FROM users WHERE id = ?", [newId]);

        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify(createdUser));
    } catch (error) {
        await logError(error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal Server Error" }));
    }
}

async function updateUsers(req, res, id, body) {
    try {
        const db = await openDb();

        // Validation
        if (!body || !body.name || body.name.trim() === "") {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Name cannot be empty" }));
            return;
        }
        if (!body.email || body.email.trim() === "") {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Email cannot be empty" }));
            return;
        }
        await validateEmail(body.email);

        // Vérifier si l'utilisateur existe
        const user = await db.get("SELECT * FROM users WHERE id = ?", [id]);
        if (!user) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "User not found" }));
            return;
        }

        const result = await db.run("UPDATE users SET name = ?, email = ? WHERE id = ?", [
            body.name,
            body.email,
            id,
        ]);

        if (result.changes === 0) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "User not found" }));
            return;
        }

        const updatedUser = await db.get("SELECT * FROM users WHERE id = ?", [id]);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(updatedUser));
    } catch (error) {
        console.error("Erreur lors de la mise à jour de l'utilisateur :", error);
        await logError(error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal Server Error" }));
    }
}

async function deleteUsers(req, res, id) {
    try {
        const db = await openDb();

        // Vérifier si l'utilisateur existe
        const user = await db.get("SELECT * FROM users WHERE id = ?", [id]);
        if (!user) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "User not found" }));
            return;
        }

        // Supprimer l'utilisateur
        const result = await db.run("DELETE FROM users WHERE id = ?", [id]);
        if (result.changes === 0) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "User not found" }));
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

export { getAllUsers, getUsersById, createUsers, updateUsers, deleteUsers, getUserArticles };
