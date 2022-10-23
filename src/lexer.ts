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
  const getKeywordType = (keyword: string): SyntaxType | null => {
    switch (keyword) {
      case 'mixin':
        return SyntaxType.MixinToken
      case 'include':
        return SyntaxType.IncludeToken
      case 'if':
        return SyntaxType.IfToken
      case 'else':
        return SyntaxType.ElseToken
      default:
        return null
    }
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
      case '+':
        tokens.push(new Token(SyntaxType.PlusToken, '+'))
        ++idx
        break
      case '-':
        tokens.push(new Token(SyntaxType.MinusToken, '-'))
        ++idx
        break
      case '*':
        tokens.push(new Token(SyntaxType.MulToken, '*'))
        ++idx
        break
      case '/':
        tokens.push(new Token(SyntaxType.DivToken, '/'))
        ++idx
        break
      case '%':
        tokens.push(new Token(SyntaxType.ModToken, '%'))
        ++idx
        break
      case '(':
        tokens.push(new Token(SyntaxType.LParenToken, '('))
        ++idx
        break
      case ')':
        tokens.push(new Token(SyntaxType.RParenToken, ')'))
        ++idx
        break
      case ',':
        tokens.push(new Token(SyntaxType.CommaToken, ','))
        ++idx
        break
      case '!': {
        ++idx
        if (input[idx] === '=') {
          tokens.push(new Token(SyntaxType.BangEqualsToken, '!='))
          ++idx
        } else {
          throw new Error(`Lexer: bad character '${input[idx]}' at ${idx}`)
        }
        break
      }
      case '=': {
        ++idx
        if (input[idx] === '=') {
          tokens.push(new Token(SyntaxType.EqualsEqualsToken, '=='))
          ++idx
        } else {
          throw new Error(`Lexer: bad character '${input[idx]}' at ${idx}`)
        }
        break
      }
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
        } else if (input[idx] === '@' && isLetter(input[idx + 1])) {
          ++idx
          const name = readName()
          const keywordType = getKeywordType(name)
          if (keywordType === null) {
            throw new Error(`Lexer: unknown keyword '${name}'`)
          }
          tokens.push(new Token(keywordType, '@' + name))
        } else {
          throw new Error(`Lexer: bad character '${input[idx]}' at ${idx}`)
        }
      }
    }
  }

  tokens.push(new Token(SyntaxType.EOF, ''))
  return tokens
}
