const cheerio = require('cheerio')
const language = require('@google-cloud/language').v1beta2
const DEFAULT_CLASS = 'ww'

class Budou {
  /**
   * @param {Object} client Instance of @google-cloud/language client
   */
  constructor (client) {
    this.client = client
  }

  /**
   * Creates a Budou instance with authenticated @google-cloud/language client
   * @static
   * @param {Object} options Configuration options for the language client.
   *        See documentation for available options:
   *        https://cloud.google.com/nodejs/docs/reference/language/1.2.x/v1beta2.LanguageServiceClient
   * @return {Budou}
   */
  static authenticate (options) {
    const client = new language.LanguageServiceClient(options)
    return new Budou(client)
  }

  /**
   * Parses input HTML code into word chunks and organized code.
   * @param {String} source Text to be processed
   * @param {Object} [options]
   * @param {Object} [options.attributes={}] A key-value mapping for attributes of output elements
   * @param {String} [options.language] A language used to parse text
   * @param {Number} [options.maxLength] Maximum character length of span enclosed chunk
   * @param {Boolean} [options.useCache=true] Whether to use caching. Helps reduce API calls
   * @param {Boolean} [options.useEntity=false] Whether to use entities Entity Analysis results. Note that it
   *        makes additional request to API, which may incur additional cost.
   *
   * @return {Object} Returns an object with the word chunks and organized html
   */
  parse (source, { attributes = {}, language, maxLength, useCache = true, useEntity = false } = {}) {
    if (useCache) {
      // @todo get data from cache
    }
    const inputText = this._preprocess(source)

    let chunksResult
    if (language === 'ko') {
      // Korean has spaces between words, so this simply parses words by space
      // and wrap them as chunks.
      chunksResult = this._getChunksPerSpace(language)
    } else {
      chunksResult = this._getChunksWithApi(inputText, language, useEntity)
    }

    attributes = Object.assign({ class: DEFAULT_CLASS }, attributes)
    const { chunks, tokens } = chunksResult
    const html = this._htmlSerialize(chunks, attributes, maxLength)
    const result = { chunks, tokens, html, language: chunksResult.language }
    if (useCache) {
      // @todo set data in cache
    }

    return result
  }

  /**
   * Removes unnecessary line breaks and white spaces
   *
   * @param {String} source HTML code to be processed
   * @return {String} The processed text content of HTML fragment
   */
  _preprocess (source) {
    const doc = cheerio.load(Buffer.from(source, 'utf8'))
    // Strip line breaks, and extra whitespace
    return doc
      .text()
      .trim()
      .replace(/\r?\n|\r/g, '')
      .replace(/ +(?= )/g, '')
  }

  _getChunksPerSpace () {}
  _getChunksWithApi () {}
  _htmlSerialize () {}
}

module.exports = Budou
