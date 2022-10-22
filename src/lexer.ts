import { SyntaxType } from './SyntaxType'

export class Token {
  constructor(public type: SyntaxType, public literal: string) {}
}

export const lexer = (input: string): Token[] => {
  let idx = 0
  const n = input.length
  const tokens: Token[] = []
  const isLetter = (c: string): boolean =>
    (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')
  const readName = (): string => {
    const start = idx

    while (
      (idx < n && isLetter(input[idx])) ||
      isDigit(input[idx]) ||
      input[idx] === '-'
    ) {
      ++idx
    }

    return input.slice(start, idx)
  }
  const isDigit = (c: string): boolean => c >= '0' && c < '9'
  const readValue = (): string => {
    const start = idx

    while (idx < n && (isDigit(input[idx]) || isLetter(input[idx]))) ++idx

    return input.slice(start, idx)
  }

  while (idx < n) {
    switch (input[idx]) {
      case ' ':
      case '\t':
      case '\n':
      case '\r':
        idx++
        break
      case '.':
        tokens.push(new Token(SyntaxType.DotToken, '.'))
        ++idx
        break
      case '{':
        tokens.push(new Token(SyntaxType.LBraceToken, '{'))
        ++idx
        break
      case '}':
        tokens.push(new Token(SyntaxType.RBraceToken, '}'))
        ++idx
        break
      case ':':
        tokens.push(new Token(SyntaxType.ColonToken, ':'))
        ++idx
        break
      case ';':
        tokens.push(new Token(SyntaxType.SemicolonToken, ';'))
        ++idx
        break
      default: {
        if (isLetter(input[idx])) {
          const name = readName()
          tokens.push(new Token(SyntaxType.NameToken, name))
        } else if (isDigit(input[idx])) {
          const value = readValue()
          tokens.push(new Token(SyntaxType.ValueToken, value))
        } else if (input[idx] === '$' && isLetter(input[idx + 1])) {
          ++idx
          const name = readName()
          tokens.push(new Token(SyntaxType.IdentToken, '$' + name))
        } else {
          throw new Error(`Lexer: bad character '${input[idx]}' at ${idx}`)
        }
      }
    }
  }

  tokens.push(new Token(SyntaxType.EOF, ''))
  return tokens
}
