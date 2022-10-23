import { lexer, Token } from './lexer'
import { BinaryExpression, parser, Rule } from './parser'
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

  test('operator precedences', () => {
    const tests: ParserTestCase[] = [
      {
        input: `
        $a: 3 * 2 + 4px;
        $b: 3 + 2 * 4px;
        $c: a == b;
        $d: a != b;
        $e: 3 % 1 == 2;
        $f: 3 != 3 % 1;
        $g: a + b * c / 4 % 5 - 1;
        `,
        expectedAST: {
          type: SyntaxType.SCSS,
          content: [
            {
              type: SyntaxType.Declaration,
              name: '$a',
              expression: {
                type: SyntaxType.BinaryExpression,
                left: new BinaryExpression(
                  new Token(SyntaxType.ValueToken, '3'),
                  new Token(SyntaxType.MulToken, '*'),
                  new Token(SyntaxType.ValueToken, '2')
                ),
                operator: new Token(SyntaxType.PlusToken, '+'),
                right: new Token(SyntaxType.ValueToken, '4px')
              }
            },
            {
              type: SyntaxType.Declaration,
              name: '$b',
              expression: {
                type: SyntaxType.BinaryExpression,
                left: new Token(SyntaxType.ValueToken, '3'),
                operator: new Token(SyntaxType.PlusToken, '+'),
                right: new BinaryExpression(
                  new Token(SyntaxType.ValueToken, '2'),
                  new Token(SyntaxType.MulToken, '*'),
                  new Token(SyntaxType.ValueToken, '4px')
                )
              }
            },
            {
              type: SyntaxType.Declaration,
              name: '$c',
              expression: new BinaryExpression(
                new Token(SyntaxType.NameToken, 'a'),
                new Token(SyntaxType.EqualsEqualsToken, '=='),
                new Token(SyntaxType.NameToken, 'b')
              )
            },
            {
              type: SyntaxType.Declaration,
              name: '$d',
              expression: new BinaryExpression(
                new Token(SyntaxType.NameToken, 'a'),
                new Token(SyntaxType.BangEqualsToken, '!='),
                new Token(SyntaxType.NameToken, 'b')
              )
            },
            {
              type: SyntaxType.Declaration,
              name: '$e',
              expression: {
                type: SyntaxType.BinaryExpression,
                left: new BinaryExpression(
                  new Token(SyntaxType.ValueToken, '3'),
                  new Token(SyntaxType.ModToken, '%'),
                  new Token(SyntaxType.ValueToken, '1')
                ),
                operator: new Token(SyntaxType.EqualsEqualsToken, '=='),
                right: new Token(SyntaxType.ValueToken, '2')
              }
            },
            {
              type: SyntaxType.Declaration,
              name: '$f',
              expression: {
                type: SyntaxType.BinaryExpression,
                left: new Token(SyntaxType.ValueToken, '3'),
                operator: new Token(SyntaxType.BangEqualsToken, '!='),
                right: new BinaryExpression(
                  new Token(SyntaxType.ValueToken, '3'),
                  new Token(SyntaxType.ModToken, '%'),
                  new Token(SyntaxType.ValueToken, '1')
                )
              }
            },
            {
              type: SyntaxType.Declaration,
              name: '$g',
              expression: {
                type: SyntaxType.BinaryExpression,
                left: {
                  type: SyntaxType.BinaryExpression,
                  left: new Token(SyntaxType.NameToken, 'a'),
                  operator: new Token(SyntaxType.PlusToken, '+'),
                  right: {
                    type: SyntaxType.BinaryExpression,
                    left: {
                      type: SyntaxType.BinaryExpression,
                      left: {
                        type: SyntaxType.BinaryExpression,
                        left: new Token(SyntaxType.NameToken, 'b'),
                        operator: new Token(SyntaxType.MulToken, '*'),
                        right: new Token(SyntaxType.NameToken, 'c')
                      },
                      operator: new Token(SyntaxType.DivToken, '/'),
                      right: new Token(SyntaxType.ValueToken, '4')
                    },
                    operator: new Token(SyntaxType.ModToken, '%'),
                    right: new Token(SyntaxType.ValueToken, '5')
                  }
                },
                operator: new Token(SyntaxType.MinusToken, '-'),
                right: new Token(SyntaxType.ValueToken, '1')
              }
            }
          ]
        }
      }
    ]

    runParserTests(tests)
  })

  test('parse mixin', () => {
    const tests: ParserTestCase[] = [
      {
        input: `
        @mixin test() {
        }`,
        expectedAST: {
          type: SyntaxType.SCSS,
          content: [
            {
              type: SyntaxType.Mixin,
              name: 'test',
              parameters: [],
              body: []
            }
          ]
        }
      },
      {
        input: `
        @mixin test($a, $b) {
          height: 100px;
          .box {
            width: 30px;
          }
        }`,
        expectedAST: {
          type: SyntaxType.SCSS,
          content: [
            {
              type: SyntaxType.Mixin,
              name: 'test',
              parameters: ['$a', '$b'],
              body: [
                new Rule('height', new Token(SyntaxType.ValueToken, '100px')),
                {
                  type: SyntaxType.Block,
                  selector: '.box',
                  body: [
                    new Rule('width', new Token(SyntaxType.ValueToken, '30px'))
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

  test('parse include', () => {
    const tests: ParserTestCase[] = [
      {
        input: `
            @include test();
            @include test(1, 2);
            @include test((1 + 2) * 3, 4px, $a);
            `,
        expectedAST: {
          type: SyntaxType.SCSS,
          content: [
            {
              type: SyntaxType.Include,
              name: 'test',
              args: []
            },
            {
              type: SyntaxType.Include,
              name: 'test',
              args: [
                new Token(SyntaxType.ValueToken, '1'),
                new Token(SyntaxType.ValueToken, '2')
              ]
            },
            {
              type: SyntaxType.Include,
              name: 'test',
              args: [
                {
                  type: SyntaxType.BinaryExpression,
                  left: {
                    type: SyntaxType.BinaryExpression,
                    left: new Token(SyntaxType.ValueToken, '1'),
                    operator: new Token(SyntaxType.PlusToken, '+'),
                    right: new Token(SyntaxType.ValueToken, '2')
                  },
                  operator: new Token(SyntaxType.MulToken, '*'),
                  right: new Token(SyntaxType.ValueToken, '3')
                },
                new Token(SyntaxType.ValueToken, '4px'),
                new Token(SyntaxType.IdentToken, '$a')
              ]
            }
          ]
        }
      },
      {
        input: `
      @if $a == a {
      } @else if($b != b) {
      } @else if c == 3px {
      } @else {
        height: 3px;
      }
      `,
        expectedAST: {
          type: SyntaxType.SCSS,
          content: [
            {
              type: SyntaxType.IfClause,
              branches: [
                {
                  condition: new BinaryExpression(
                    new Token(SyntaxType.IdentToken, '$a'),
                    new Token(SyntaxType.EqualsEqualsToken, '=='),
                    new Token(SyntaxType.NameToken, 'a')
                  ),
                  body: []
                },
                {
                  condition: new BinaryExpression(
                    new Token(SyntaxType.IdentToken, '$b'),
                    new Token(SyntaxType.BangEqualsToken, '!='),
                    new Token(SyntaxType.NameToken, 'b')
                  ),
                  body: []
                },
                {
                  condition: new BinaryExpression(
                    new Token(SyntaxType.NameToken, 'c'),
                    new Token(SyntaxType.EqualsEqualsToken, '=='),
                    new Token(SyntaxType.ValueToken, '3px')
                  ),
                  body: []
                }
              ],
              alternative: [
                {
                  type: SyntaxType.Rule,
                  name: 'height',
                  expression: new Token(SyntaxType.ValueToken, '3px')
                }
              ]
            }
          ]
        }
      }
    ]

    runParserTests(tests)
  })
})
