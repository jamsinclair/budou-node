const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const pkgDir = require('pkg-dir')
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

const CACHE_SALT = '2018-08-11'
const DEFAULT_FILE_PATH = './budou-cache'

class BudouCache {
  get (source, language) {}
  set (source, language, value) {}

  /**
   * Returns a cache key for the given source and language
   * @param {String} source Text to parse
   * @param {String} [language=''] language of text
   */
  _getCacheKey (source, language = '') {
    const keySource = `${CACHE_SALT}:${source}:${language}`
    return crypto
      .createHash('md5')
      .update(keySource)
      .digest('hex')
  }
}

class LowCache extends BudouCache {
  constructor (filepath) {
    super()
    this.filepath = filepath || DEFAULT_FILE_PATH
  }

  get (source, language) {
    this._initDb()
    const cacheKey = this._getCacheKey(source, language)
    return this.db.get(cacheKey).value()
  }

  set (source, language, value) {
    this._initDb()
    const cacheKey = this._getCacheKey(source, language)
    return this.db.set(cacheKey, value).write()
  }

  _getCacheFilepath () {
    const cacheDir = path.resolve(pkgDir.sync(__dirname), this.filepath)
    const cacheFile = path.resolve(cacheDir, './cache.json')
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir)
    }
    return cacheFile
  }

  _initDb () {
    if (!this.db) {
      const jsonPath = this._getCacheFilepath()

      this.db = low(new FileSync(jsonPath))
      this.db.defaults({}).write()
    }
  }
}

module.exports = LowCache
