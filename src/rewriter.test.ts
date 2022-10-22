import { lexer, Token } from './lexer'
import { parser, Rule } from './parser'
import { rewriter } from './rewriter'
import { SyntaxType } from './SyntaxType'

describe('rewriter', () => {
  interface RewriterTestCase {
    input: string
    expectedAST: Record<string, any>
  }
  const runRewriterTests = (tests: RewriterTestCase[]): void => {
    for (const tt of tests) {
      const { input, expectedAST } = tt
      const tokens = lexer(input)
      const ast = parser(tokens)
      const rewrittenAST = rewriter(ast)

      expect(rewrittenAST).toEqual(expectedAST)
    }
  }

  test('rewrite simple nested block', () => {
    const tests: RewriterTestCase[] = [
      {
        input: `.container {
                color: red;
                div {
                   height: 10px;
                }
              }`,
        expectedAST: {
          type: SyntaxType.SCSS,
          content: [
            {
              type: SyntaxType.Block,
              selector: '.container',
              body: [new Rule('color', new Token(SyntaxType.NameToken, 'red'))]
            },
            {
              type: SyntaxType.Block,
              selector: '.container div',
              body: [
                new Rule('height', new Token(SyntaxType.ValueToken, '10px'))
              ]
            }
          ]
        }
      }
    ]

    runRewriterTests(tests)
  })
})
