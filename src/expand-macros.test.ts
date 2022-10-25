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

  test('expand function', () => {
    const tests: ExpandMacrosTestCase[] = [
      {
        input: `
            @function pow($n, $e) {
              @if($e == 1) {
                @return $n;
              } @else if($e % 2 == 1) {
                @return $n * pow($n, $e - 1);
              } @else {
                $half: pow($n, $e / 2);
                @return $half * $half;
              }
            }

            $a: pow(2, 10);
            .container {
              height: $a + 0px;
            }
            `,
        expectedAST: {
          type: SyntaxType.SCSS,
          content: [
            {
              type: SyntaxType.Block,
              selector: '.container',
              body: [
                new Rule('height', new Token(SyntaxType.ValueToken, '1024px'))
              ]
            }
          ]
        }
      },
      {
        input: `
            @function fib($n) {
              @if($n == 1) {
                @return 1;
              } @else if($n == 0) {
                @return 0;
              } @else {
                @return fib($n - 1) + fib($n - 2);
              }
            }

            $a: fib(15);
            .container {
              height: $a + 0px;
            }
            `,
        expectedAST: {
          type: SyntaxType.SCSS,
          content: [
            {
              type: SyntaxType.Block,
              selector: '.container',
              body: [
                new Rule('height', new Token(SyntaxType.ValueToken, '610px'))
              ]
            }
          ]
        }
      },
      {
        input: `
        @function createAdd($base) {
          @function add($a) {
            @return $a + $base;
          }

          @return add;
        }

        $add: createAdd(10);

        .container {
          height: $add(1) + $add(2) + 0px;
        }
        `,
        expectedAST: {
          type: SyntaxType.SCSS,
          content: [
            {
              type: SyntaxType.Block,
              selector: '.container',
              body: [
                new Rule('height', new Token(SyntaxType.ValueToken, '23px'))
              ]
            }
          ]
        }
      },
      {
        input: `
        @function outer($n) {
          @function inner() {
            @return outer(10);
          }

          @if $n == 10 {
            @return 10;
          } @else {
            @return inner;
          }
        }

        $inner: outer(0);

        .container {
          height: $inner() + outer(10) * 1px;
        }
        `,
        expectedAST: {
          type: SyntaxType.SCSS,
          content: [
            {
              type: SyntaxType.Block,
              selector: '.container',
              body: [
                new Rule('height', new Token(SyntaxType.ValueToken, '20px'))
              ]
            }
          ]
        }
      }
    ]

    runExpandMacrosTests(tests)
  })
})
