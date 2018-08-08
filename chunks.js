const { hasCjk, isOpenPunctuationChar } = require('./utils')

const DEPENDENT_LABEL = ['P', 'SNUM', 'PRT', 'AUX', 'SUFF', 'AUXPASS', 'RDROP', 'NUMBER', 'NUM', 'PREF']
const POS = {
  NONE: null,
  SPACE: 'SPACE',
  BREAK: 'BREAK',
  PUNCT: 'PUNCT'
}

/**
 * Represents a unit for word segmentation.
 * @class Chunk
 */
class Chunk {
  /**
   * @param {String} word Surface word of the chunk 
   * @param {Object} options
   * @param {String} [options.pos=null] Part of speech
   * @param {String} [options.label=null] Label information
   * @param {Boolean} [options.dependency=null]  Dependency to neighbor words. 
   *        null for no dependency, true for dependency to the following word,
   *        and false for the dependency to the previous word.
   */
  constructor (word, { pos = POS.NONE, label = null, dependency = null } = {}) {
    this.word = word
    this.pos = pos
    this.label = label
    this.dependency = dependency
    this._addDependencyIfPunct()
  }

  /**
   * Creates space Chunk.
   * @static
   * @return {Chunk}
   */
  static space () {
    return new Chunk(' ', { pos: POS.SPACE })
  }

  /**
   * Creates breakline Chunk
   * @static
   * @return {Chunk}
   */
  static breakline () {
    return new Chunk('\n', { pos: POS.BREAK })
  }
  
  /**
   * Checks if this is space Chunk
   * @return {Boolean}
   */
  isSpace () {
    return this.pos === POS.SPACE
  }

  /**
   * Checks if the word of the chunk contains CJK characters
   * @return {Boolean}
   */
  hasCjk () {
    return hasCjk(this.word)
  }

  /**
   * Returns serialized chunk data as object literal
   * @return {Object}
   */
  serialize () {
    return {
      word: this.word,
      pos: this.pos,
      label: this.label,
      dependency: this.dependency,
      hasCjk: this.hasCjk()
    }
  }

  /**
   * Adds dependency if any dependency is not assigned yet.
   * @param {Boolean} defaultDependencyDirection 
   */
  maybeAddDependency (defaultDependencyDirection) {
    if (this.dependency === null && DEPENDENT_LABEL.indexOf(this.label) > -1) {
      this.dependency = defaultDependencyDirection
    }
  }

  /**
   * Adds dependency if the chunk is punctuation
   */
  _addDependencyIfPunct () {
    if (this.pos === POS.PUNCT) {
      // Concatenates open punct to following word
      // Otherwise concatenates to previous word
      this.dependency = isOpenPunctuationChar(this.word)
    }
  }
}

class ChunkList extends Array {
  /**
   * Returns chunks overlapped with the given range
   * @param {Number} offset Begin offset of the range
   * @param {Number} length Length of the range
   * 
   * @return {Array} Overlapped chunks. (list of Chunk)
   */
  getOverlaps (offset, length) {
    // In case entity's offset points to a space just before the entity.
    if (this.join('')[offset] === ' ') {
      offset += 1
    }

    let index = 0
    const result = []
    this.forEach(chunk => {
      if ((offset < index + chunk.word.length) && (index < offset + length)) {
        result.push(chunk)
      }
      index += chunk.word.length
    })

    return result
  }

  /**
   * Swaps old consecutive chunks with new chunk
   * @param {Array} oldChunks List of consecutive Chunks to be removed
   * @param {Chunk} newChunk A Chunk to be inserted
   */
  swap (oldChunks, newChunk) {
    const indexes = oldChunks.map(chunk => this.indexOf(chunk))
    this.splice(indexes[0], indexes.length, newChunk)
  }
}

module.exports = {
  Chunk,
  ChunkList,
  DEPENDENT_LABEL
}