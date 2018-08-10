const language = require('@google-cloud/language').v1beta2
const { JSDOM } = require('jsdom')
const { Chunk, ChunkList } = require('./chunks')
const DEFAULT_CLASS = 'ww'

const cloneChunk = chunk => Object.assign(new Chunk(), chunk)
const cloneChunkList = chunks => chunks.map(cloneChunk)

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
      chunksResult = Promise.resolve(this._getChunksPerSpace(text, language))
    } else {
      chunksResult = this._getChunksWithApi(inputText, language, useEntity)
    }

    attributes = Object.assign({ class: DEFAULT_CLASS }, attributes)

    return chunksResult.then(({ chunks, tokens, language }) => {
      const html = this._htmlSerialize(chunks, attributes, maxLength)
      const result = { chunks, tokens, html, language }
      if (useCache) {
        // @todo set result in cache
      }

      return result
    })
  }

  /**
   * Returns a chunk list by separating words by spaces
   * @param {String} text String to parse
   * @param {String} language language code
   * @return {Object} ChunksResult. Contains chunks, language and tokens
   */
  _getChunksPerSpace (text, language) {
    const chunks = new ChunkList()
    const words = text.split(' ')

    words.forEach((word, index) => {
      chunks.push(new Chunk(word))

      // Add space chunk after, unless last word
      if (index < words.length - 1) {
        chunks.push(Chunk.space())
      }
    })

    return { chunks, language, tokens: null }
  }

  /**
   * Returns a chunk list by using Google Cloud Natural Language API
   * @param {String} text String to parse
   * @param {String} [language] language code
   * @param {Boolean} [useEntity] Whether to use entities in Natural Language API response
   * @return {Promise<Object>} ChunksResult. Contains chunks, language and tokens
   */
  _getChunksWithApi (text, language, useEntity) {
    return this._getSourceChunks(text, language)
      .then(({ chunks, tokens, language }) => {
        if (!useEntity) {
          return { chunks, tokens, language }
        }

        return this._getEntities(text, language).then(entities => {
          chunks = this._groupChunksByEntities(chunks, entities)
          return { chunks, tokens, language }
        })
      })
      .then(({ chunks, tokens, language }) => {
        chunks = this._resolveDependency(chunks)
        chunks = this._insertBreakline(chunks)

        return { chunks, tokens, language }
      })
  }

  /**
   * Removes unnecessary line breaks and white spaces
   *
   * @param {String} source HTML code to be processed
   * @return {String} The processed text content of HTML fragment
   */
  _preprocess (source) {
    const doc = JSDOM.fragment(Buffer.from(source, 'utf8'))
    // Strip line breaks, and extra whitespace
    return doc.textContent
      .trim()
      .replace(/\r?\n|\r/g, '')
      .replace(/ +(?= )/g, '')
  }

  /**
   * Returns a chunk list retrieved from Syntax Analysis results.
   * @param {String} text String to analyse
   * @param {String} [language] language code
   * @return {Promise<ChunkList>} Promise that resolves to a chunk list
   */
  _getSourceChunks (text, language) {
    const getChunksResult = ({ tokens, language }) => {
      let sentenceLength = 0
      const chunks = new ChunkList()
      tokens.forEach((token, i) => {
        const word = token.text.content
        const beginOffset = token.text.beginOffset
        const label = token.dependencyEdge.label
        const pos = token.partOfSpeech.tag

        if (beginOffset > sentenceLength) {
          chunks.push(Chunk.space())
          sentenceLength = beginOffset
        }

        const chunk = new Chunk(word, { pos, label })
        chunk.maybeAddDependency(i < token.dependencyEdge.headTokenIndex)
        chunks.push(chunk)
        sentenceLength += word.length
      })

      return { chunks, tokens, language }
    }

    return this._getAnnotations(text, language).then(getChunksResult)
  }

  /**
   * Groups chunks by entities retrieved from NL API Entity Analysis
   * @param {ChunkList} chunks
   * @param {Array} entities
   * @return {ChunkList}
   */
  _groupChunksByEntities (chunks, entities) {
    for (let entity of entities) {
      const chunksToConcat = chunks.getOverlaps(entity.beginOffset, entity.content.length)
      if (!chunksToConcat.length) {
        continue
      }
      const newChunkWord = chunksToConcat.map(chunk => chunk.word).join('')
      const newChunk = new Chunk(newChunkWord)
      chunks.swap(chunksToConcat, newChunk)
    }
    return chunks
  }

  /**
   * Returns concatenated HTML code with SPAN tag
   * @param {ChunkList} chunks The list of chunks to be processed
   * @param {Object} attributes Key/Value pairs of the span attributes
   * @param {Number} maxLength Maximum length of span enclosed chunk
   * @return {String} The organized HTML code
   */
  _htmlSerialize (chunks, attributes, maxLength) {
    const dom = new JSDOM('<span>')
    const { document } = dom.window
    const root = document.querySelector('span')

    chunks.forEach(chunk => {
      if (chunk.isSpace() && root.textContent.length) {
        // We want to preserve space in cases like "Hello 你好"
        // But the space in " 你好" can be discarded.
        root.innerHTML += ' '
      } else if (chunk.hasCjk() && !(maxLength && chunk.word.length > maxLength)) {
        const ele = document.createElement('span')
        ele.textContent += chunk.word
        for (let key of Object.keys(attributes)) {
          ele.setAttribute(key, attributes[key])
        }
        root.appendChild(ele)
      } else {
        // Otherwise add word without span tag for non-CJK text (e.g. English)
        // and CJK text that exceeds max length
        // Use createTextNode to escape any special chars
        root.appendChild(document.createTextNode(chunk.word))
      }
    })

    // @note Do we sanitize this HTML? What attributes should we allow/disallow?
    return root.outerHTML
  }

  /**
   * Resolves chunk dependency by concatenating them
   * @param {ChunkList} chunks Chunk list to resolve
   * @return {ChunkList} A chunk list
   */
  _resolveDependency (chunks) {
    chunks = this._concatenateInner(chunks, true)
    return this._concatenateInner(chunks, false)
  }

  /**
   * Concatenates chunks based on each chunk's dependency
   * @param {ChunkList} chunks Chunks to concatenate
   * @param {Boolean} direction Direction of concatenation process. True for forward
   * @return {ChunkList} A chunk list
   */
  _concatenateInner (chunks, direction) {
    let tmpBucket = []
    const reverseIfNoDirection = arr => (direction ? arr : arr.slice().reverse())
    const sourceChunks = reverseIfNoDirection(cloneChunkList(chunks))
    const targetChunks = new ChunkList()

    sourceChunks.forEach(chunk => {
      tmpBucket.push(chunk)

      // If Chunk has matched dependency, do concatenation
      // Or when direction equals false and chunk is SPACE, concatenate to the previous chunk
      if (chunk.dependency === direction || (direction === false && chunk.isSpace())) {
        return
      }

      const newWord = reverseIfNoDirection(tmpBucket)
        .map(tmpChunk => tmpChunk.word)
        .join('')
      chunk.word = newWord
      targetChunks.push(chunk)
      tmpBucket = []
    })

    targetChunks.concat(tmpBucket)
    return reverseIfNoDirection(targetChunks)
  }

  /**
   * Inserts a breakline instead of a trailing space if the chunk is in CJK
   * @param {ChunkList} chunks
   * @return {ChunkList} A chunk list
   */
  _insertBreakline (chunks) {
    const sourceChunks = cloneChunkList(chunks)
    const targetChunks = new ChunkList()

    sourceChunks.forEach(chunk => {
      if (chunk.word.slice(-1) === ' ' && chunk.hasCjk()) {
        chunk.word = chunk.word.slice(0, -1)
        targetChunks.push(chunk)
        targetChunks.push(Chunk.breakline())
      } else {
        targetChunks.push(chunk)
      }
    })

    return targetChunks
  }

  /**
   * Returns the list of annotations from the given text
   * @param {String} text String to analyse
   * @param {String} [language] language code
   * @param {String} [encodingType] Requested encodingType
   * @return {Promise<Object>} Promise that resolves to AnnotateTextResponse Object
   */
  _getAnnotations (text, language, encodingType = 'UTF32') {
    const request = {
      document: {
        content: text,
        type: 'PLAIN_TEXT'
      },
      features: {
        extractSyntax: true
      },
      encodingType
    }

    if (language) {
      request.document.language = language
    }

    return this.client.annotateText(request).then(data => data[0])
  }

  /**
   * Returns the list of entities from the given text
   * @param {String} text String to analyse
   * @param {String} [language] language code
   * @param {String} [encodingType] Requested encodingType
   * @return {Promise<Array>} Promise that resolves to an array of entities
   */
  _getEntities (text, language, encodingType = 'UTF32') {
    const request = {
      document: {
        content: text,
        type: 'PLAIN_TEXT'
      },
      encodingType
    }

    if (language) {
      request.document.language = language
    }

    return this.client.analyzeEntities(request).then(entities => {
      const result = []
      for (let entity of entities) {
        const { mentions } = entity

        if (!mentions) {
          continue
        }

        const entityText = mentions[0].text
        let offset = entityText.beginOffset

        for (let word of entityText.content.split(' ')) {
          result.push({ content: word, beginOffset: offset })
          offset += word.length
        }
      }
      return result
    })
  }
}

module.exports = Budou
