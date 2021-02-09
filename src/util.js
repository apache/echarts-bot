function removeCodeAndComment(body) {
	return body
		.replace(/<!--[\w\W\s]*?-->/gmi, '')
        .replace(/`{3}(.|\n)*`{3}/gmi, '')
        .replace(/#.*\s?/g, '')
        .replace(/-{3}\s?/g, '');
}

function replaceAll(str, search, replacement) {
	return str.replace(new RegExp(search, 'g'), replacement);
}

module.exports = {
	removeCodeAndComment,
	replaceAll
}
