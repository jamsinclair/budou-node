const unicodePs = require('unicode/category/Ps')
const unicodePi = require('unicode/category/Pi')
const escapeHtml = require('escape-html')

/**
 * Checks if the char belongs to Ps or Pi unicode categories
 * Ps: Punctuation, open (e.g. opening bracket characters)
 * Pi: Punctuation, initial quote (e.g. opening quotation mark)
 * @param {String} char
 * @return {Boolean}
 */
const isOpenPunctuationChar = char => {
  const code = char.charCodeAt(0)
  return Boolean(unicodePs[code] || unicodePi[code])
}

/**
 * Checks if any chars are in range of Chinese, Japanese and Korean unicode characters
 * Using ranges from https://github.com/nltk/nltk/blob/develop/nltk/tokenize/util.py#L149
 * @param {String} chars
 * @return {Boolean}
 */
const hasCjk = chars =>
  chars.split('').some(char => {
    const CJK_RANGES = [
      [4352, 4607],
      [11904, 42191],
      [43072, 43135],
      [44032, 55215],
      [63744, 64255],
      [65072, 65103],
      [65381, 65500],
      [131072, 196607]
    ]
    const code = char.charCodeAt(0)
    return CJK_RANGES.some(range => range[0] <= code && range[1] >= code)
  })

/**
 * Creates an html string of element with specified attributes and innerHtml
 *
 * @param {String} tag The tag name of element
 * @param {String} [innerHtml=''] The html content of element
 * @param {Object} [attributes={}] key/value pairs of the html attributes
 * @return {String} The processed html element string
 */
const createElementString = (tag, innerHtml = '', attributes = {}) => {
  const attributesStr = Object.keys(attributes)
    .map(key => ` ${key}="${attributes[key]}"`)
    .join('')

  return `<${tag}${attributesStr}>${innerHtml}</${tag}>`
}

module.exports = {
  createElementString,
  hasCjk,
  isOpenPunctuationChar
}
