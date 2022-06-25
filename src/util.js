const text = require('./text');

function removeCodeAndComment(body) {
	return body
        .replace(/<!--[\w\W\s]*?-->/gmi, '')
        .replace(/`{3}(.|\n)*`{3}/gmi, '')
        .replace(/#.*\s?/g, '')
        .replace(/-{3}\s?/g, '');
}

function removeHTMLComment (body) {
    return body.replace(/<!--[\w\W\s]*?-->/gmi, '');
}

function replaceAll(str, search, replacement) {
	return str.replace(new RegExp(search, 'g'), replacement);
}

/**
 * @param {string} body
 */
function isMissingDocInfo(body) {
    if (!body) {
        return true;
    }
    const docOptions = [
        text.PR_DOC_UNCHANGED,
        text.PR_DOC_LATER,
        text.PR_DOC_READY
    ].map(opt => `[x] ${opt.toLowerCase()}`);
    body = body.toLowerCase();
    return !docOptions.some(opt => body.includes(opt));
}

/**
 * @param {string} content
 * @param {string} option
 */
function isOptionChecked(content, option) {
    return content && option && content.toLowerCase().includes('[x] ' + option.toLowerCase());
}

module.exports = {
	removeCodeAndComment,
    removeHTMLComment,
    replaceAll,
    isMissingDocInfo,
    isOptionChecked
};
