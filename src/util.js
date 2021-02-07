function removeCodeAndComment(body) {
	return body
		.replace(/<!--[\w\W\r\n]*?-->/gmi, '')
		.replace(/`{3}(.|\n)*`{3}/gmi, '');
}

function replaceAll(str, search, replacement) {
	return str.replace(new RegExp(search, 'g'), replacement);
}

module.exports = {
	removeCodeAndComment,
	replaceAll
}
