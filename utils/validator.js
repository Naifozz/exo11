// utils/validator.js
export function validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

export function validateArticle(article) {
    const errors = [];
    if (!article.title || article.title.length < 3) {
        errors.push("Title must be at least 3 characters");
    }
    if (!article.content || article.content.length < 10) {
        errors.push("Content must be at least 10 characters");
    }
    return errors;
}
