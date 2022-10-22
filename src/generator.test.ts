import { generator } from './generator'
import { lexer } from './lexer'
import { parser } from './parser'
import { rewriter } from './rewriter'

describe('generator', () => {
  interface GeneratorTestCase {
    input: string
    expected: string
  }

  const runGeneratorTests = (tests: GeneratorTestCase[]): void => {
    for (const tt of tests) {
      const { input, expected } = tt
      const expectedLines = expected
        .split('\n')
        .map((v) => v.trim())
        .filter(Boolean)
      const tokens = lexer(input)
      const ast = parser(tokens)
      const flattenedAST = rewriter(ast)
      const actualCSS = generator(flattenedAST)
      const actualLines = actualCSS
        .split('\n')
        .map((v) => v.trim())
        .filter(Boolean)

      expect(actualLines.length).toBe(expectedLines.length)

      for (let i = 0; i < actualLines.length; ++i) {
        expect(actualLines[i]).toBe(expectedLines[i])
      }
    }
  }

  test('generate simple nested block', () => {
    const tests: GeneratorTestCase[] = [
      {
        input: `.container {
            color: red;
            div {
               height: 10px;
            }
          }`,
        expected: `
        .container {
          color: red;
        }
        .container div {
          height: 10px;
        }
        `
      }
    ]

    runGeneratorTests(tests)
  })
})
