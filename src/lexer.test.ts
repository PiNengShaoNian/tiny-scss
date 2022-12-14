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

  test('lexes rules', () => {
    const tests: LexerTestCase[] = [
      {
        input: `div {
          color: red;
          height: 10px;
        }`,
        expectedTokens: [
          [SyntaxType.NameToken, 'div'],
          [SyntaxType.LBraceToken, '{'],
          [SyntaxType.NameToken, 'color'],
          [SyntaxType.ColonToken, ':'],
          [SyntaxType.NameToken, 'red'],
          [SyntaxType.SemicolonToken, ';'],
          [SyntaxType.NameToken, 'height'],
          [SyntaxType.ColonToken, ':'],
          [SyntaxType.ValueToken, '10px'],
          [SyntaxType.SemicolonToken, ';'],
          [SyntaxType.RBraceToken, '}'],
          [SyntaxType.EOF, '']
        ]
      },
      {
        input: `.container {
          div {
            height: 10px;
          }
        }
        `,
        expectedTokens: [
          [SyntaxType.DotToken, '.'],
          [SyntaxType.NameToken, 'container'],
          [SyntaxType.LBraceToken, '{'],
          [SyntaxType.NameToken, 'div'],
          [SyntaxType.LBraceToken, '{'],
          [SyntaxType.NameToken, 'height'],
          [SyntaxType.ColonToken, ':'],
          [SyntaxType.ValueToken, '10px'],
          [SyntaxType.SemicolonToken, ';'],
          [SyntaxType.RBraceToken, '}'],
          [SyntaxType.RBraceToken, '}'],
          [SyntaxType.EOF, '']
        ]
      }
    ]

    runLexerTests(tests)
  })

  test('lexes identifier', () => {
    const tests: LexerTestCase[] = [
      {
        input: `
        $primary-color: red;
        $base-width: 10px;
        $lh: 10;
        $test1: 1;
        $test1-3: 2;
        color: $primary-color;
        `,
        expectedTokens: [
          [SyntaxType.IdentToken, '$primary-color'],
          [SyntaxType.ColonToken, ':'],
          [SyntaxType.NameToken, 'red'],
          [SyntaxType.SemicolonToken, ';'],

          [SyntaxType.IdentToken, '$base-width'],
          [SyntaxType.ColonToken, ':'],
          [SyntaxType.ValueToken, '10px'],
          [SyntaxType.SemicolonToken, ';'],

          [SyntaxType.IdentToken, '$lh'],
          [SyntaxType.ColonToken, ':'],
          [SyntaxType.ValueToken, '10'],
          [SyntaxType.SemicolonToken, ';'],

          [SyntaxType.IdentToken, '$test1'],
          [SyntaxType.ColonToken, ':'],
          [SyntaxType.ValueToken, '1'],
          [SyntaxType.SemicolonToken, ';'],

          [SyntaxType.IdentToken, '$test1-3'],
          [SyntaxType.ColonToken, ':'],
          [SyntaxType.ValueToken, '2'],
          [SyntaxType.SemicolonToken, ';'],

          [SyntaxType.NameToken, 'color'],
          [SyntaxType.ColonToken, ':'],
          [SyntaxType.IdentToken, '$primary-color'],
          [SyntaxType.SemicolonToken, ';'],

          [SyntaxType.EOF, '']
        ]
      }
    ]

    runLexerTests(tests)
  })

  test('lexes expressions', () => {
    const tests: LexerTestCase[] = [
      {
        input: `
        a == b
        $a == 1
        b != a
        a + 3
        a - 3
        a * 3
        a / 3
        a % 3
        `,
        expectedTokens: [
          [SyntaxType.NameToken, 'a'],
          [SyntaxType.EqualsEqualsToken, '=='],
          [SyntaxType.NameToken, 'b'],
          [SyntaxType.IdentToken, '$a'],
          [SyntaxType.EqualsEqualsToken, '=='],
          [SyntaxType.ValueToken, '1'],
          [SyntaxType.NameToken, 'b'],
          [SyntaxType.BangEqualsToken, '!='],
          [SyntaxType.NameToken, 'a'],
          [SyntaxType.NameToken, 'a'],
          [SyntaxType.PlusToken, '+'],
          [SyntaxType.ValueToken, '3'],
          [SyntaxType.NameToken, 'a'],
          [SyntaxType.MinusToken, '-'],
          [SyntaxType.ValueToken, '3'],
          [SyntaxType.NameToken, 'a'],
          [SyntaxType.MulToken, '*'],
          [SyntaxType.ValueToken, '3'],
          [SyntaxType.NameToken, 'a'],
          [SyntaxType.DivToken, '/'],
          [SyntaxType.ValueToken, '3'],
          [SyntaxType.NameToken, 'a'],
          [SyntaxType.ModToken, '%'],
          [SyntaxType.ValueToken, '3'],
          [SyntaxType.EOF, '']
        ]
      }
    ]

    runLexerTests(tests)
  })

  test('lexes keywords', () => {
    const tests: LexerTestCase[] = [
      {
        input: `
        @mixin
        @return
        @else
        @if
        @include
        @function
        `,
        expectedTokens: [
          [SyntaxType.MixinToken, '@mixin'],
          [SyntaxType.ReturnToken, '@return'],
          [SyntaxType.ElseToken, '@else'],
          [SyntaxType.IfToken, '@if'],
          [SyntaxType.IncludeToken, '@include'],
          [SyntaxType.FunctionToken, '@function'],
          [SyntaxType.EOF, '']
        ]
      }
    ]

    runLexerTests(tests)
  })

  test('lexes include', () => {
    const tests: LexerTestCase[] = [
      {
        input: `
        @include test();
        @include test(1, 2);
        @include test((1 + 2) * 3, 4px, $a);
        `,
        expectedTokens: [
          [SyntaxType.IncludeToken, '@include'],
          [SyntaxType.NameToken, 'test'],
          [SyntaxType.LParenToken, '('],
          [SyntaxType.RParenToken, ')'],
          [SyntaxType.SemicolonToken, ';'],

          [SyntaxType.IncludeToken, '@include'],
          [SyntaxType.NameToken, 'test'],
          [SyntaxType.LParenToken, '('],
          [SyntaxType.ValueToken, '1'],
          [SyntaxType.CommaToken, ','],
          [SyntaxType.ValueToken, '2'],
          [SyntaxType.RParenToken, ')'],
          [SyntaxType.SemicolonToken, ';'],

          [SyntaxType.IncludeToken, '@include'],
          [SyntaxType.NameToken, 'test'],
          [SyntaxType.LParenToken, '('],
          [SyntaxType.LParenToken, '('],
          [SyntaxType.ValueToken, '1'],
          [SyntaxType.PlusToken, '+'],
          [SyntaxType.ValueToken, '2'],
          [SyntaxType.RParenToken, ')'],
          [SyntaxType.MulToken, '*'],
          [SyntaxType.ValueToken, '3'],
          [SyntaxType.CommaToken, ','],
          [SyntaxType.ValueToken, '4px'],
          [SyntaxType.CommaToken, ','],
          [SyntaxType.IdentToken, '$a'],
          [SyntaxType.RParenToken, ')'],
          [SyntaxType.SemicolonToken, ';'],

          [SyntaxType.EOF, '']
        ]
      }
    ]

    runLexerTests(tests)
  })

  test('lexes if', () => {
    const tests: LexerTestCase[] = [
      {
        input: `
            @if $a == a {
            } @else if($b != b) {
            }
            `,
        expectedTokens: [
          [SyntaxType.IfToken, '@if'],
          [SyntaxType.IdentToken, '$a'],
          [SyntaxType.EqualsEqualsToken, '=='],
          [SyntaxType.NameToken, 'a'],
          [SyntaxType.LBraceToken, '{'],
          [SyntaxType.RBraceToken, '}'],
          [SyntaxType.ElseToken, '@else'],
          [SyntaxType.NameToken, 'if'],
          [SyntaxType.LParenToken, '('],
          [SyntaxType.IdentToken, '$b'],
          [SyntaxType.BangEqualsToken, '!='],
          [SyntaxType.NameToken, 'b'],
          [SyntaxType.RParenToken, ')'],
          [SyntaxType.LBraceToken, '{'],
          [SyntaxType.RBraceToken, '}'],
          [SyntaxType.EOF, '']
        ]
      }
    ]

    runLexerTests(tests)
  })

  test('lexes function', () => {
    const tests: LexerTestCase[] = [
      {
        input: `
            @function test() {}

            @function test($a, $b) {
              @return 1 + $a;
            }
            `,
        expectedTokens: [
          [SyntaxType.FunctionToken, '@function'],
          [SyntaxType.NameToken, 'test'],
          [SyntaxType.LParenToken, '('],
          [SyntaxType.RParenToken, ')'],
          [SyntaxType.LBraceToken, '{'],
          [SyntaxType.RBraceToken, '}'],

          [SyntaxType.FunctionToken, '@function'],
          [SyntaxType.NameToken, 'test'],
          [SyntaxType.LParenToken, '('],
          [SyntaxType.IdentToken, '$a'],
          [SyntaxType.CommaToken, ','],
          [SyntaxType.IdentToken, '$b'],
          [SyntaxType.RParenToken, ')'],
          [SyntaxType.LBraceToken, '{'],
          [SyntaxType.ReturnToken, '@return'],
          [SyntaxType.ValueToken, '1'],
          [SyntaxType.PlusToken, '+'],
          [SyntaxType.IdentToken, '$a'],
          [SyntaxType.SemicolonToken, ';'],
          [SyntaxType.RBraceToken, '}'],
          [SyntaxType.EOF, '']
        ]
      }
    ]

    runLexerTests(tests)
  })
})
