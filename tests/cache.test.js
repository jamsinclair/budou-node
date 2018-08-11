const fs = require('fs')
const path = require('path')
const Cache = require('../src/cache')
const cacheDir = path.resolve(__dirname, '../budou-cache')
const cacheFile = path.resolve(cacheDir, './cache.json')
const removeCache = () => {
  if (fs.existsSync(cacheDir)) {
    if (fs.existsSync(cacheFile)) {
      fs.unlinkSync(cacheFile)
    }
    fs.rmdirSync(cacheDir)
  }
}

describe('cache.get and cache.set', () => {
  const cache = new Cache()
  const source = 'apple'
  const language = 'a'
  const result = 'banana'

  cache.set(source, language, result)

  afterAll(() => {
    removeCache()
  })

  test('Cache file should be generated', () => {
    expect(fs.existsSync(cacheFile)).toBe(true)
  })

  test('The result should be cached', () => {
    expect(cache.get(source, language)).toEqual(result)
  })
})

describe('cache key', () => {
  const cache = new Cache()
  cache.set('a', 'en', 1)
  cache.set('a', 'ja', 2)
  cache.set('b', 'en', 3)

  afterAll(() => {
    removeCache()
  })

  test('The cached key should be unique per source text', () => {
    expect(cache.get('a', 'en')).not.toEqual(cache.get('b', 'en'))
  })

  test('The cached key should be unique per language', () => {
    expect(cache.get('a', 'en')).not.toEqual(cache.get('a', 'ja'))
  })
})
