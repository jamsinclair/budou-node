const { Chunk, ChunkList } = require('./chunks')

describe('Chunk.space', () => {
  test('Should create a Space chunk instance', () => {
    const chunk = Chunk.space()
    const expected = { word: ' ', pos: 'SPACE', label: null, dependency: null, hasCjk: false }
    expect(chunk.toJSON()).toEqual(expected)
  })
})

describe('Chunk.breakline', () => {
  test('Should create a line break chunk instance', () => {
    const chunk = Chunk.breakline()
    const expected = { word: '\n', pos: 'BREAK', label: null, dependency: null, hasCjk: false }
    expect(chunk.toJSON()).toEqual(expected)
  })
})

describe('Chunk.maybeAddDependency', () => {
  test('Dependency should not be added if the chunk does not belong to dependent labels', () => {
    const chunk = new Chunk('foo')
    chunk.maybeAddDependency(true)
    expect(chunk.dependency).toEqual(null)
  })

  test('Dependency should be added if the chunk belongs to dependent labels', () => {
    const chunk = new Chunk('foo', { label: 'P' })
    chunk.maybeAddDependency(true)
    expect(chunk.dependency).toEqual(true)
  })

  test('Dependency should not be added if the chunk has dependency already', () => {
    const chunk = new Chunk('foo', { label: 'P' })
    chunk.dependency = false
    chunk.maybeAddDependency(true)
    expect(chunk.dependency).toEqual(false)
  })
})

describe('Chunk.addDependencyIfPunct', () => {
  test('Punctuation marks should be assigned with proper dependencies', () => {
    const testCharacters = ['。', '、', '「', '」', '（', '）', '[', ']', '(', ')']
    const expectedDependency = [false, false, true, false, true, false, true, false, true, false]

    testCharacters.forEach((char, index) => {
      const chunk = new Chunk(char, { pos: 'PUNCT' })
      expect(chunk.dependency).toEqual(expectedDependency[index])
    })
  })
})

describe('Chunk.toJSON', () => {
  test('Should correctly serialize data when called with JSON.stringify', () => {
    const chunk = new Chunk('serialized')
    const expected =
      '{"word":"serialized","pos":null,"label":null,"dependency":null,"hasCjk":false}'
    expect(JSON.stringify(chunk)).toEqual(expected)
  })
})

const generateChunkList = () => {
  const chunks = new ChunkList()
  chunks.push(new Chunk('ab'))
  chunks.push(new Chunk('cde', { dependency: true }))
  chunks.push(new Chunk('fgh', { dependency: false }))

  return chunks
}

describe('ChunkList.getOverlaps', () => {
  test('should correctly return overlapping chunks', () => {
    const chunks = generateChunkList()
    const testExpectedOverlaps = (offset, length, expected) => {
      const overlaps = chunks.getOverlaps(offset, length)
      expect(overlaps.map(chunk => chunk.word)).toEqual(expected)
    }

    // chunks: ab cde fgh
    // range : __ _*_ ___
    testExpectedOverlaps(3, 1, ['cde'])

    // chunks: ab cde fgh
    // range : __ _*_ ___
    testExpectedOverlaps(2, 2, ['cde'])

    // chunks: ab cde fgh
    // range : _* **_ ___
    testExpectedOverlaps(1, 3, ['ab', 'cde'])

    // chunks: ab cde fgh
    // range : _* *** ___
    testExpectedOverlaps(1, 4, ['ab', 'cde'])

    // chunks: ab cde fgh
    // range : _* *** *__
    testExpectedOverlaps(1, 5, ['ab', 'cde', 'fgh'])
  })
})

describe('ChunkList.swap', () => {
  test('Old chunks should be replaced with the new chunk', () => {
    const chunks = generateChunkList()
    const oldChunks = chunks.slice(0, 2)
    const newChunk = new Chunk('ijk')
    chunks.swap(oldChunks, newChunk)

    expect(chunks.map(chunk => chunk.word)).toEqual(['ijk', 'fgh'])
  })
})
