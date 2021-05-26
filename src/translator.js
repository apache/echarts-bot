const googleTranslate = require('@plainheart/google-translate-api');
const { translate: bingTranslate } = require('bing-translate-api');
const franc = require('franc-min');
const logger = require('./logger');

async function translateByGoogle(rawContent) {
    try {
        const res = await googleTranslate(
            rawContent,
            {
                to: 'en',
                // tld: 'cn',
                randomEndpoint: true
            }
        );
        return {
          translated: res.text,
          lang: res.from.language.iso,
          endpoint: res.endpoint,
          translator: 'google'
        };
    }
    catch (e) {
        logger.error('failed to translate by google');
        logger.error(e);
    }
}

async function translateByBing(rawContent) {
    try {
        const res = await bingTranslate(rawContent);
        return {
            translated: res.translation,
            lang: res.language.from,
            translator: 'bing'
        };
    }
    catch (e) {
        logger.error('failed to translate by bing');
        logger.error(e);
    }
}

/**
 * To translate the raw sentence to English
 * @param  {string} rawContent sentence to be translated
 * @return {object} { translated: string, lang: string, translator: string }
 */
async function translate(rawContent) {
    if (!rawContent || !(rawContent = rawContent.trim())) {
        return;
    }
    const translators = [translateByGoogle, translateByBing];
    const randomIdx = ~~(Math.random() * translators.length);
    let res = await translators[randomIdx](rawContent);
    if (!res) {
        for (let i = 0; i < translators.length; i++) {
            if (i === randomIdx) {
                continue;
            }
            res = await translators[i](rawContent);
            if (res) {
                return res;
            }
        }
    }
    return res;
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

/**
 * To detect English by franc
 *
 * FIXME: Not accurate enough
 */
function detectEnglish(text) {
    const lang = detectLanguage(text, true);
    return (lang[0][0] === 'eng' && lang[0][1] === 1)
        || (lang[0][0] === 'eng'
            && (!lang[1] || (lang[1][0] === 'sco' && lang[1][1] > 0.9) || lang[1][1] < 0.9));
}

/**
 * To detect English by Google Translate
 *
 * FIXME: Accurate enough but it requires network requests.
 */
async function detectEnglishByGoogle(text) {
    const res = await translate(text);
    return res && res.lang === 'en';
}

module.exports = {
    translate,
    detectLanguage,
    detectEnglish,
    detectEnglishByGoogle,
    translateByGoogle,
    translateByBing
}
