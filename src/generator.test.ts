import { expandMacros } from './expand-macros'
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
      const expandedAST = expandMacros(ast)
      const flattenedAST = rewriter(expandedAST)
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

  test('nested scopes and identifiers shadowing', () => {
    const tests: GeneratorTestCase[] = [
      {
        input: `
            $primary-color: red;
            $secondary-color: blue;
            .container {
              color: $primary-color;
              $secondary-color: pink;
              background-color: $secondary-color;
            }
            .box {
              color: $secondary-color;
            }
            `,
        expected: `
            .container {
              color: red;
              background-color: pink;
            }

            .box {
              color: blue;
            }
            `
      }
    ]

    runGeneratorTests(tests)
  })

  test('generate mixin and include', () => {
    const tests: GeneratorTestCase[] = [
      {
        input: `
        @mixin color($fg, $bg) {
          color: $fg;
          background-color: $bg;
        }
        @mixin center() {
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .container {
          margin: 10px;
          @mixin avatar($round, $w) {
            @include center();
            border-radius: $round;
            width: $w;
            height: $w;
          }
          .box {
            @include avatar(50px, 100px);
            @include color(red, blue);
            box-sizing: border-box;
          }
        }`,
        expected: `
        .container {
          margin: 10px;
        }
        .container .box {
          display: flex;
          justify-content: center;
          align-items: center;    
          border-radius: 50px;
          width: 100px;
          height: 100px;
          color: red;
          background-color: blue;
          box-sizing: border-box;
        }`
      },
      {
        input: `
        @mixin test($n) {
          @if $n == 0 {
          } @else {
            height: $n + 0px;
            @include test($n - 1);
          }
        }

        .container {
          @include test(3);
        }
        `,
        expected: `
        .container {
          height: 3px;
          height: 2px;
          height: 1px;
        }
        `
      }
    ]

    runGeneratorTests(tests)
  })
})
