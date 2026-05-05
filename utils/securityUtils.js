/**
 * Escapes special characters in a string for use in a regular expression.
 * Prevents ReDoS (Regular Expression Denial of Service) attacks by ensuring
 * that user input is treated as a literal string.
 * 
 * @param {string} string - The string to escape.
 * @returns {string} - The escaped string.
 */
const escapeRegExp = (string) => {
    if (!string || typeof string !== "string") return "";
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
};

module.exports = { escapeRegExp };
