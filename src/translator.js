const googleTranslate = require('@vitalets/google-translate-api');
const franc = require('franc');

/**
 * To translate the raw sentence to English
 * @param  {string} rawContent sentence to be translated
 * @return {object} { translated: string, lang: string }
 */
async function translate(rawContent) {
    if (!rawContent || !(rawContent = rawContent.trim())) {
        return;
    }
    try {
        const res = await googleTranslate(
            rawContent,
            {
                to: 'en',
                // tld: 'cn'
            }
        );
        return {
          translated: res.text,
          lang: res.from.language.iso
        };
    }
    catch (e) {
        console.error('failed to translate', e);
    }
}

/**
 * To detect the languages of specified text
 * @param  {string} text
 * @param  {boolean} detectAll whether to return all detected languages
 * @return {string | Array<[string, number]>}
 */
function detectLanguage(text, detectAll) {
    if (!text || !(text = text.trim())) {
        return;
    }
    return detectAll ? franc.all(text) : franc(text);
}

function detectEnglish(text) {
    const lang = detectLanguage(text, true);
    return lang[0][0] === 'eng'
        && (!lang[1] || (lang[1][0] === 'sco' && lang[1][1] > 0.9) || lang[1][1] < 0.9);
}

module.exports = {
    translate,
    detectLanguage,
    detectEnglish
}
