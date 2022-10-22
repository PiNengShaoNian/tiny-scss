import { Token } from './lexer'
import { SyntaxType } from './SyntaxType'

export type SCSSChild = Block
export class SCSS {
  readonly type = SyntaxType.SCSS
  constructor(public content: SCSSChild[]) {}
}

export type BlockChild = SCSSChild | Rule
export class Block {
  readonly type = SyntaxType.Block
  constructor(public selector: string, public body: BlockChild[]) {}
}

export class Rule {
  readonly type = SyntaxType.Rule
  constructor(public name: string, public value: Token) {}
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
      const block = parseBlock()
      content.push(block)
    }

    return content
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
        const block = parseBlock()
        body.push(block)
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
    let ruleValueToken: Token
    if (tokens[idx].type === SyntaxType.NameToken) {
      ruleValueToken = matchToken(SyntaxType.NameToken)
    } else {
      ruleValueToken = matchToken(SyntaxType.ValueToken)
    }
    matchToken(SyntaxType.SemicolonToken)

    return new Rule(ruleNameToke.literal, ruleValueToken)
  }

  return parseSCSS()
}
