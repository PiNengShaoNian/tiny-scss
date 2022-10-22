import { expandMacros } from './expand-macros'
import { lexer, Token } from './lexer'
import { parser, Rule } from './parser'
import { SyntaxType } from './SyntaxType'

describe('expand-macros', () => {
  interface ExpandMacrosTestCase {
    input: string
    expectedAST: Record<string, any>
  }

  const runExpandMacrosTests = (tests: ExpandMacrosTestCase[]): void => {
    for (const tt of tests) {
      const { input, expectedAST } = tt
      const tokens = lexer(input)
      const ast = parser(tokens)
      const expandedAST = expandMacros(ast)

      expect(expandedAST).toEqual(expectedAST)
    }
  }

  test('test nested scopes', () => {
    const tests: ExpandMacrosTestCase[] = [
      {
        input: `
            $fc: red;
            $bc: blue;
            .container {
              height: 10px;
              $bc: pink;
              color: $fc;
              background-color: $bc; 
            }

            .box {
              color: $fc;
              background-color: $bc;
            }
            `,
        expectedAST: {
          type: SyntaxType.SCSS,
          content: [
            {
              type: SyntaxType.Block,
              selector: '.container',
              body: [
                new Rule('height', new Token(SyntaxType.ValueToken, '10px')),
                new Rule('color', new Token(SyntaxType.NameToken, 'red')),
                new Rule(
                  'background-color',
                  new Token(SyntaxType.NameToken, 'pink')
                )
              ]
            },
            {
              type: SyntaxType.Block,
              selector: '.box',
              body: [
                new Rule('color', new Token(SyntaxType.NameToken, 'red')),
                new Rule(
                  'background-color',
                  new Token(SyntaxType.NameToken, 'blue')
                )
              ]
            }
          ]
        }
      }
    ]

    runExpandMacrosTests(tests)
  })

  test('expand expressions', () => {
    const tests: ExpandMacrosTestCase[] = [
      {
        input: `
        .container {
          $a: 1;
          $b: 1px;
          $c: red;
          $d: $c;
          height: $a;
          height: $b;
          height: $c;
          height: $d;
        }
            `,
        expectedAST: {
          type: SyntaxType.SCSS,
          content: [
            {
              type: SyntaxType.Block,
              selector: '.container',
              body: [
                new Rule('height', new Token(SyntaxType.ValueToken, '1')),
                new Rule('height', new Token(SyntaxType.ValueToken, '1px')),
                new Rule('height', new Token(SyntaxType.NameToken, 'red')),
                new Rule('height', new Token(SyntaxType.NameToken, 'red'))
              ]
            }
          ]
        }
      }
    ]

    runExpandMacrosTests(tests)
  })
})