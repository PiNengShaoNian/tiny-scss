import { lexer } from './lexer'
import { SyntaxType } from './SyntaxType'

describe('lexer', () => {
  interface LexerTestCase {
    input: string
    expectedTokens: Array<[syntaxType: SyntaxType, literal: string]>
  }

  const runLexerTests = (tests: LexerTestCase[]): void => {
    for (const tt of tests) {
      const { input, expectedTokens } = tt
      const actualTokens = lexer(input)

      expect(actualTokens.length).toBe(expectedTokens.length)
      for (let i = 0; i < actualTokens.length; ++i) {
        const actualToken = actualTokens[i]
        const expectToken = expectedTokens[i]
        expect(actualToken.type).toBe(expectToken[0])
        expect(actualToken.literal).toBe(expectToken[1])
      }
    }
  }

  test('lexes block', () => {
    const tests: LexerTestCase[] = [
      {
        input: `.container {
        }`,
        expectedTokens: [
          [SyntaxType.DotToken, '.'],
          [SyntaxType.NameToken, 'container'],
          [SyntaxType.LBraceToken, '{'],
          [SyntaxType.RBraceToken, '}'],
          [SyntaxType.EOF, '']
        ]
      }
    ]

    runLexerTests(tests)
  })
})
