const text = require('./src/text');

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

function isMissingDocInfo(body) {
    const docOptions = [
        `[x] ${text.PR_DOC_UNCHANGED}`,
        `[x] ${text.PR_DOC_LATER}`,
        `[x] ${text.PR_DOC_RREADY}`
    ];
    for (let i = 0; i < docOptions.length; ++i) {
        if (body.indexOf(docOptions[i]) > -1) {
            return false;
        }
    }
    return true;
}

module.exports = {
	removeCodeAndComment,
    removeHTMLComment,
    replaceAll,
    isMissingDocInfo
};
