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
