import { Token } from './lexer'
import { SyntaxType } from './SyntaxType'

export type SCSSChild = Block | Declaration
export type BlockChild = SCSSChild | Rule
export type Expression = Token
export class SCSS {
  readonly type = SyntaxType.SCSS
  constructor(public content: SCSSChild[]) {}
}

export class Block {
  readonly type = SyntaxType.Block
  constructor(public selector: string, public body: BlockChild[]) {}
}

export class Rule {
  readonly type = SyntaxType.Rule
  constructor(public name: string, public expression: Expression) {}
}

export class Declaration {
  readonly type = SyntaxType.Declaration
  constructor(public name: string, public expression: Expression) {}
}

export const parser = (tokens: Token[]): SCSS => {
  let idx = 0
  const matchToken = (type: SyntaxType): Token => {
    if (tokens[idx].type !== type) {
      throw new Error(
        `expected SyntaxType ${type}, got=${tokens[idx].type} at index ${idx}`
      )
    }

    const token = tokens[idx]
    ++idx
    return token
  }
  const parseSCSS = (): SCSS => {
    const content = parseSCSSContent()
    matchToken(SyntaxType.EOF)

    return new SCSS(content)
  }

  const parseSCSSContent = (): SCSSChild[] => {
    const content: SCSSChild[] = []

    while (tokens[idx].type !== SyntaxType.EOF) {
      const child = parseSCSSChild()
      content.push(child)
    }

    return content
  }

  const parseSCSSChild = (): SCSSChild => {
    switch (tokens[idx].type) {
      case SyntaxType.IdentToken:
        return parseDeclaration()
      default:
        return parseBlock()
    }
  }

  const parseExpression = (): Expression => {
    const token = tokens[idx]
    switch (token.type) {
      case SyntaxType.IdentToken:
      case SyntaxType.NameToken:
      case SyntaxType.ValueToken:
        ++idx
        return token
      default:
        throw new Error(`ParseExpression: unexpected NodeType '${token.type}'`)
    }
  }

  const parseDeclaration = (): Declaration => {
    const identToken = matchToken(SyntaxType.IdentToken)
    matchToken(SyntaxType.ColonToken)
    const expr = parseExpression()
    matchToken(SyntaxType.SemicolonToken)

    return new Declaration(identToken.literal, expr)
  }

  const parseSelector = (): string => {
    let selector = ''
    if (tokens[idx].type === SyntaxType.DotToken) {
      selector += matchToken(SyntaxType.DotToken).literal
    }

    selector += matchToken(SyntaxType.NameToken).literal

    return selector
  }

  const parseBlockBody = (): BlockChild[] => {
    const body: BlockChild[] = []
    while (tokens[idx].type !== SyntaxType.RBraceToken) {
      if (
        tokens[idx].type === SyntaxType.NameToken &&
        tokens[idx + 1].type === SyntaxType.ColonToken
      ) {
        const rule = parseRule()
        body.push(rule)
      } else {
        const child = parseSCSSChild()
        body.push(child)
      }
    }

    return body
  }

  const parseBlock = (): Block => {
    const selector = parseSelector()
    matchToken(SyntaxType.LBraceToken)
    const body = parseBlockBody()
    matchToken(SyntaxType.RBraceToken)

    return new Block(selector, body)
  }

  const parseRule = (): Rule => {
    const ruleNameToke = matchToken(SyntaxType.NameToken)
    matchToken(SyntaxType.ColonToken)
    const expr = parseExpression()
    matchToken(SyntaxType.SemicolonToken)

    return new Rule(ruleNameToke.literal, expr)
  }

  return parseSCSS()
}
