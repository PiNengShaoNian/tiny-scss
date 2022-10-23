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
      },
      {
        input: `
        .container {
          height: 3 + 4 * 5px;
          height: 3 * 4 + 5px;
          height: 5 / 2px;
          height: 1 - 10 % 3px;
          $a: 3 * 3px;
          $b: $a * 3 / 3;
          height: $b;
        }
        `,
        expectedAST: {
          type: SyntaxType.SCSS,
          content: [
            {
              type: SyntaxType.Block,
              selector: '.container',
              body: [
                new Rule('height', new Token(SyntaxType.ValueToken, '23px')),
                new Rule('height', new Token(SyntaxType.ValueToken, '17px')),
                new Rule('height', new Token(SyntaxType.ValueToken, '2.5px')),
                new Rule('height', new Token(SyntaxType.ValueToken, '0px')),
                new Rule('height', new Token(SyntaxType.ValueToken, '9px'))
              ]
            }
          ]
        }
      }
    ]

    runExpandMacrosTests(tests)
  })

  test('expand mixin', () => {
    const tests: ExpandMacrosTestCase[] = [
      {
        input: `
        @mixin test() {

        }
        `,
        expectedAST: {
          type: SyntaxType.SCSS,
          content: []
        }
      },
      {
        input: `
        $border-color: pink;
        @mixin color($fc, $bc) {
          color: $fc;
          background-color: $bc;
          border-color: $border-color;
        }
  
        .container {
          @include color(red, blue);
        }
  
        .box {
          @include color(indigo, purple);
        }
        `,
        expectedAST: {
          type: SyntaxType.SCSS,
          content: [
            {
              type: SyntaxType.Block,
              selector: '.container',
              body: [
                new Rule('color', new Token(SyntaxType.NameToken, 'red')),
                new Rule(
                  'background-color',
                  new Token(SyntaxType.NameToken, 'blue')
                ),
                new Rule(
                  'border-color',
                  new Token(SyntaxType.NameToken, 'pink')
                )
              ]
            },
            {
              type: SyntaxType.Block,
              selector: '.box',
              body: [
                new Rule('color', new Token(SyntaxType.NameToken, 'indigo')),
                new Rule(
                  'background-color',
                  new Token(SyntaxType.NameToken, 'purple')
                ),
                new Rule(
                  'border-color',
                  new Token(SyntaxType.NameToken, 'pink')
                )
              ]
            }
          ]
        }
      },
      {
        input: `
      @mixin test($size) {
        @if $size == large {
          height: 100px;
        } @else if $size == medium {
          height: 80px;
        } @else if $size == small {
          height: 60px;
        } @else {
          height: 40px;
        }
      }

      .container {
        @include test(foo);
        @include test(large);
        @include test(medium);
        @include test(small);
      }
      `,
        expectedAST: {
          type: SyntaxType.SCSS,
          content: [
            {
              type: SyntaxType.Block,
              selector: '.container',
              body: [
                new Rule('height', new Token(SyntaxType.ValueToken, '40px')),
                new Rule('height', new Token(SyntaxType.ValueToken, '100px')),
                new Rule('height', new Token(SyntaxType.ValueToken, '80px')),
                new Rule('height', new Token(SyntaxType.ValueToken, '60px'))
              ]
            }
          ]
        }
      }
    ]

    runExpandMacrosTests(tests)
  })
})
