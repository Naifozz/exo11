import { openDb } from "../utils/db.js";
import { logError } from "../utils/logger.js";

const sampleArticles = [
    {
        id: 1,
        title: "Premier article",
        content: "Contenu du premier article",
        user_id: 1,
        created_at: "2021-09-01 12:00:00",
    },
    {
        id: 2,
        title: "Deuxième article",
        content: "Contenu du deuxième article",
        user_id: 2,
        created_at: "2021-09-01 12:00:00",
    },
    {
        id: 3,
        title: "Troisième article",
        content: "Contenu du troisième article",
        user_id: 1,
        created_at: "2021-09-01 12:00:00",
    },
];
const sampleUsers = [
    { id: 1, name: "Alice", email: "alice@gmail.com", created_at: "2021-09-01 12:00:00" },
    { id: 2, name: "Bob", email: "bob@gmail.com", created_at: "2021-09-01 12:00:00" },
    { id: 3, name: "Charlie", email: "charlie@gmail.com", created_at: "2021-09-01 12:00:00" },
];

async function seedDatabase() {
    try {
        const db = await openDb();

        // Supprime les données existantes
        await db.run("DELETE FROM articles");

        // Insère les données de test
        for (const article of sampleArticles) {
            await db.run(
                "INSERT INTO articles (title, content, user_id, created_at) VALUES (?, ?, ?, ?)",
                [article.title, article.content, article.user_id, article.created_at]
            );
        }
        await db.run("DELETE FROM users");
        for (const user of sampleUsers) {
            await db.run("INSERT INTO users (id, name, email, created_at) VALUES (?, ?, ?, ?)", [
                user.id,
                user.name,
                user.email,
                user.created_at,
            ]);
        }

        console.log("Database seeded successfully");
        process.exit(0);
    } catch (error) {
        await logError(error);
        console.error("Error seeding database:", error.message);
        process.exit(1);
    }
}

seedDatabase();
