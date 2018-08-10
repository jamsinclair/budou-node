const Budou = require('../src/budou')
const cases = require('./cases.json')
const { Chunk, ChunkList } = require('../src/chunks')

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

describe('Budou._getSourceChunks', () => {
  const parser = new Budou()
  const tokens = [
    {
      dependencyEdge: { headTokenIndex: 1, label: 'NN' },
      partOfSpeech: { tag: 'NOUN' },
      text: { beginOffset: 0, content: '六本木' }
    },
    {
      dependencyEdge: { headTokenIndex: 8, label: 'ADVPHMOD' },
      partOfSpeech: { tag: 'NOUN' },
      text: { beginOffset: 3, content: 'ヒルズ' }
    },
    {
      dependencyEdge: { headTokenIndex: 1, label: 'PRT' },
      partOfSpeech: { tag: 'PRT' },
      text: { beginOffset: 6, content: 'で' }
    },
    {
      dependencyEdge: { headTokenIndex: 8, label: 'P' },
      partOfSpeech: { tag: 'PUNCT' },
      text: { beginOffset: 7, content: '、' }
    },
    {
      dependencyEdge: { headTokenIndex: 5, label: 'P' },
      partOfSpeech: { tag: 'PUNCT' },
      text: { beginOffset: 8, content: '「' }
    },
    {
      dependencyEdge: { headTokenIndex: 8, label: 'DOBJ' },
      partOfSpeech: { tag: 'NOUN' },
      text: { beginOffset: 9, content: 'ご飯' }
    },
    {
      dependencyEdge: { headTokenIndex: 5, label: 'P' },
      partOfSpeech: { tag: 'PUNCT' },
      text: { beginOffset: 11, content: '」' }
    },
    {
      dependencyEdge: { headTokenIndex: 5, label: 'PRT' },
      partOfSpeech: { tag: 'PRT' },
      text: { beginOffset: 12, content: 'を' }
    },
    {
      dependencyEdge: { headTokenIndex: 8, label: 'ROOT' },
      partOfSpeech: { tag: 'VERB' },
      text: { beginOffset: 13, content: '食べ' }
    },
    {
      dependencyEdge: { headTokenIndex: 8, label: 'AUX' },
      partOfSpeech: { tag: 'VERB' },
      text: { beginOffset: 15, content: 'ます' }
    },
    {
      dependencyEdge: { headTokenIndex: 8, label: 'P' },
      partOfSpeech: { tag: 'PUNCT' },
      text: { beginOffset: 17, content: '。' }
    }
  ]
  const expected = [
    new Chunk('六本木', { label: 'NN', pos: 'NOUN', dependency: null }),
    new Chunk('ヒルズ', { label: 'ADVPHMOD', pos: 'NOUN', dependency: null }),
    new Chunk('で', { label: 'PRT', pos: 'PRT', dependency: false }),
    new Chunk('、', { label: 'P', pos: 'PUNCT', dependency: false }),
    new Chunk('「', { label: 'P', pos: 'PUNCT', dependency: true }),
    new Chunk('ご飯', { label: 'DOBJ', pos: 'NOUN', dependency: null }),
    new Chunk('」', { label: 'P', pos: 'PUNCT', dependency: false }),
    new Chunk('を', { label: 'PRT', pos: 'PRT', dependency: false }),
    new Chunk('食べ', { label: 'ROOT', pos: 'VERB', dependency: null }),
    new Chunk('ます', { label: 'AUX', pos: 'VERB', dependency: false }),
    new Chunk('。', { label: 'P', pos: 'PUNCT', dependency: false })
  ]

  beforeEach(() => {
    parser._getAnnotations = jest.fn().mockReturnValue(Promise.resolve({ tokens }))
  })

  test('Words should be match between input text and retrieved chunks', () => {
    expect.assertions(1)
    return parser._getSourceChunks('六本木ヒルズで、「ご飯」を食べます。').then(({ chunks }) => {
      expect(chunks.map(chunk => chunk.word)).toEqual(expected.map(chunk => chunk.word))
    })
  })

  test('Dependency should be match between input text and retrieved chunks', () => {
    expect.assertions(1)
    return parser._getSourceChunks('六本木ヒルズで、「ご飯」を食べます。').then(({ chunks }) => {
      expect(chunks.map(chunk => chunk.dependency)).toEqual(expected.map(chunk => chunk.dependency))
    })
  })
})

describe('Budou._concatenateInner', () => {
  const parser = new Budou()

  let chunks = new ChunkList()
  chunks.push(new Chunk('ab', { dependency: null }))
  chunks.push(new Chunk('cde', { dependency: true }))
  chunks.push(new Chunk('fgh', { dependency: false }))

  test('Chunks should be concatenated if they depend on the following word', () => {
    const processedChunks = parser._concatenateInner(chunks, true)
    expect(processedChunks.map(chunk => chunk.word)).toEqual(['ab', 'cdefgh'])
  })
  test("Dependency should persist even if it's concatenated by others", () => {
    const processedChunks = parser._concatenateInner(chunks, true)
    expect(processedChunks.map(chunk => chunk.dependency)).toEqual([null, false])
  })

  test('Chunks should be concatenated if they depend on the previous word', () => {
    let processedChunks = parser._concatenateInner(chunks, true)
    processedChunks = parser._concatenateInner(processedChunks, false)
    expect(processedChunks.map(chunk => chunk.word)).toEqual(['abcdefgh'])
  })
})

describe('Budou._insertBreakline', () => {
  const parser = new Budou()

  let chunks = new ChunkList()
  chunks.push(new Chunk('あああ '))
  chunks.push(new Chunk('abc '))

  test('CJK chunks /w trailing space should be trimmed and breakline inserted after', () => {
    const result = parser._insertBreakline(chunks)
    expect(result.map(chunk => chunk.word)).toEqual(['あああ', '\n', 'abc '])
  })
})

describe('Budou._htmlSerialize', () => {
  const parser = new Budou()

  test('The chunks should be compiled to HTML code', () => {
    const chunks = [
      new Chunk('Hello'),
      Chunk.space(),
      new Chunk('今天'),
      new Chunk('天气'),
      new Chunk('很好')
    ]
    const attributes = { class: 'foo' }
    const expected =
      '<span>Hello <span class="foo">今天</span><span class="foo">天气</span><span class="foo">很好</span></span>'
    const result = parser._htmlSerialize(chunks, attributes)
    expect(result).toEqual(expected)
  })

  test('HTML tags included in a chunk should be encoded', () => {
    const chunks = [new Chunk('Hey<'), new Chunk('<script>alert(1)</script>'), new Chunk('>folks')]
    const attributes = { class: 'foo' }
    const expected = '<span>Hey&lt;&lt;script&gt;alert(1)&lt;/script&gt;&gt;folks</span>'
    const result = parser._htmlSerialize(chunks, attributes)
    expect(result).toEqual(expected)
  })

  test('Chunks that exceed the max length should not be enclosed by a span', () => {
    const chunks = [new Chunk('去年'), new Chunk('インフルエンザに'), new Chunk('かかった。')]
    const attributes = { class: 'foo' }
    const expected =
      '<span><span class="foo">去年</span>インフルエンザに<span class="foo">かかった。</span></span>'
    const result = parser._htmlSerialize(chunks, attributes, 6)
    expect(result).toEqual(expected)
  })
})

describe('Budou._groupChunksByEntities', () => {
  const parser = new Budou()

  test('Entities should correctly concatenate', () => {
    // chunks: foo bar baz
    // entity: ___ bar ___
    const chunks = new ChunkList(new Chunk('foo'), new Chunk('bar'), new Chunk('baz'))
    const entities = [{ beginOffset: 3, content: 'bar' }]
    const expected = ['foo', 'bar', 'baz']
    const result = parser._groupChunksByEntities(chunks, entities)
    expect(result.map(chunk => chunk.word)).toEqual(expected)
  })

  test('Overlapping entities should correctly concatenate', () => {
    // chunks foo bar baz
    // entity: foo ba_ ___
    const chunks = new ChunkList(new Chunk('foo'), new Chunk('bar'), new Chunk('baz'))
    const entities = [{ beginOffset: 0, content: 'fooba' }]
    const expected = ['foobar', 'baz']
    const result = parser._groupChunksByEntities(chunks, entities)
    expect(result.map(chunk => chunk.word)).toEqual(expected)
  })
})

describe('Budou.parse', async () => {
  const parser = new Budou()
  parser._getAnnotations = jest.fn()

  test('it should correctly parse chunks for given sentences', async () => {
    expect.assertions(7)

    for (let i = 0; i < cases.length; i++) {
      const { expected, language, sentence, tokens } = cases[i]
      // Mocks external getAnnotations Google API request
      parser._getAnnotations.mockReturnValue(Promise.resolve({ tokens }))
      // to do mock entities call

      const { chunks } = await parser.parse(sentence, { language, useCache: false })
      expect(chunks.map(chunk => chunk.word)).toEqual(expected)
    }
  })
})
