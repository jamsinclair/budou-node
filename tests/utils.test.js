const { hasCjk, isOpenPunctuationChar } = require('./utils')

// @todo Use generator function to build random strings for ranges?
const CHINESE_DUMMY_TEXT = '能記安全償与属護月孫支人受。'
const JAPANESE_DUMMY_TEXT = 'はっぬるあつ無ャシコヘタさゃひょ。'
const KOREAN_DUMMY_TEXT = '모든 국민은 사생활의 비밀과 자유를 침해받지 아니한다.'
const ALPHABET_DUMMY_TEXT = 'Lorem ipsum dolor sit amet, mazim simul percipit an nam.'
const MIXTURE_DUMMY_TEXT = 'Lorem ipsum 食べる　모든 국민은　mazim simul 人受 an nam.'

describe('hasCjk', () => {
  test('should detect presence of Chinese characters', () => {
    expect(hasCjk(CHINESE_DUMMY_TEXT)).toEqual(true)
  })

  test('should detect presence of Japanese characters', () => {
    expect(hasCjk(JAPANESE_DUMMY_TEXT)).toEqual(true)
  })

  test('should detect presence of Korean characters', () => {
    expect(hasCjk(KOREAN_DUMMY_TEXT)).toEqual(true)
  })

  test('should detect presence of CJK characters when multiple types used', () => {
    expect(hasCjk(MIXTURE_DUMMY_TEXT)).toEqual(true)
  })

  test('should return false if no CJK characters present', () => {
    expect(hasCjk(ALPHABET_DUMMY_TEXT)).toEqual(false)
  })
})

describe('isOpenPunctuationChar', () => {
  test('should correctly detect open punctuation chars', () => {
    const testCharacters = ['「', '」', '（', '）', '<', '>', 'a', 'z', '‘', '’']
    const expectedResults = [true, false, true, false, false, false, false, false, true, false]
    testCharacters.forEach((char, index) => {
      expect(isOpenPunctuationChar(char)).toEqual(expectedResults[index])
    })
  })
})
