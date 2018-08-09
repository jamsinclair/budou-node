const Budou = require('./budou')

describe('Budou._preprocess', () => {
  test('BR tags, line breaks, and unnecessary spaces should be removed', () => {
    const source = ' a\nb<br> c   d'
    const expected = 'ab c d'
    const result = new Budou()._preprocess(source)
    expect(result).toEqual(expected)
  })

  test('XML tags should be removed', () => {
    const source = 'a <script>alert(1)</script> b<div>c</div>'
    const expected = 'a alert(1) bc'
    const result = new Budou()._preprocess(source)
    expect(result).toEqual(expected)
  })
})

describe('Budou._getChunksPerSpace', () => {
  test('Input text should be parsed into chunks separated by spaces', () => {
    const source = 'a b'
    const expected = ['a', ' ', 'b']
    const chunksResult = new Budou()._getChunksPerSpace(source)
    const result = chunksResult.chunks.map(chunk => chunk.word)
    expect(result).toEqual(expected)
  })
})
