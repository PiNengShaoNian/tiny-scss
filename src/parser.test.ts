import { lexer, Token } from './lexer'
import { parser, Rule } from './parser'
import { SyntaxType } from './SyntaxType'

describe('parser', () => {
  interface ParserTestCase {
    input: string
    expectedAST: Record<string, any>
  }

  const runParserTests = (tests: ParserTestCase[]): void => {
    for (const tt of tests) {
      const { input, expectedAST } = tt
      const tokens = lexer(input)
      const actualAST = parser(tokens)

      expect(actualAST).toEqual(expectedAST)
    }
  }

  test('parsing simple nested block', () => {
    const tests: ParserTestCase[] = [
      {
        input: `.container {
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
              body: [
                {
                  type: SyntaxType.Block,
                  selector: 'div',
                  body: [
                    new Rule('height', new Token(SyntaxType.ValueToken, '10px'))
                  ]
                }
              ]
            }
          ]
        }
      }
    ]

    runParserTests(tests)
  })

  test('parse declaration and identifier', () => {
    const tests: ParserTestCase[] = [
      {
        input: `
      $primary-color: red;
      .container {
        $width-sm: 10px;
        color: $primary-color;
      }
      `,
        expectedAST: {
          type: SyntaxType.SCSS,
          content: [
            {
              type: SyntaxType.Declaration,
              name: '$primary-color',
              expression: new Token(SyntaxType.NameToken, 'red')
            },
            {
              type: SyntaxType.Block,
              selector: '.container',
              body: [
                {
                  type: SyntaxType.Declaration,
                  name: '$width-sm',
                  expression: new Token(SyntaxType.ValueToken, '10px')
                },
                new Rule(
                  'color',
                  new Token(SyntaxType.IdentToken, '$primary-color')
                )
              ]
            }
          ]
        }
      }
    ]

    runParserTests(tests)
  })
})
