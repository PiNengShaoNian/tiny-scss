import { Token } from './lexer'
import { SyntaxType } from './SyntaxType'

export type SCSSChild = Block | Declaration | Mixin | Include | IfClause
export type BlockChild = SCSSChild | Rule
export type Expression = Token | BinaryExpression
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

export class BinaryExpression {
  readonly type = SyntaxType.BinaryExpression
  constructor(
    public left: Expression,
    public operator: Token,
    public right: Expression
  ) {}
}

export class Mixin {
  readonly type = SyntaxType.Mixin
  constructor(
    public name: string,
    public parameters: string[],
    public body: BlockChild[]
  ) {}
}

export class Include {
  readonly type = SyntaxType.Include
  constructor(public name: string, public args: Expression[]) {}
}

export class Branch {
  constructor(public condition: Expression, public body: BlockChild[]) {}
}

export class IfClause {
  readonly type = SyntaxType.IfClause
  constructor(
    public branches: Branch[],
    public alternative: BlockChild[] | null
  ) {}
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

  const getBinaryOperatorPrecedence = (token: Token): number => {
    switch (token.type) {
      case SyntaxType.BangEqualsToken:
      case SyntaxType.EqualsEqualsToken:
        return 1
      case SyntaxType.PlusToken:
      case SyntaxType.MinusToken:
        return 2
      case SyntaxType.MulToken:
      case SyntaxType.DivToken:
      case SyntaxType.ModToken:
        return 3
      default:
        return 0
    }
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
      case SyntaxType.MixinToken:
        return parseMixin()
      case SyntaxType.IncludeToken:
        return parseInclude()
      case SyntaxType.IfToken:
        return parseIfClause()
      default:
        return parseBlock()
    }
  }

  const parseIfClause = (): IfClause => {
    matchToken(SyntaxType.IfToken)
    const ifCondition = parseExpression()
    matchToken(SyntaxType.LBraceToken)
    const ifBody = parseBlockBody()
    matchToken(SyntaxType.RBraceToken)
    const branches: Branch[] = []
    branches.push(new Branch(ifCondition, ifBody))

    while (
      tokens[idx].type === SyntaxType.ElseToken &&
      tokens[idx + 1].type === SyntaxType.NameToken &&
      tokens[idx + 1].literal === 'if'
    ) {
      matchToken(SyntaxType.ElseToken)
      matchToken(SyntaxType.NameToken)
      const elseIfCondition = parseExpression()
      matchToken(SyntaxType.LBraceToken)
      const elseIfBody = parseBlockBody()
      matchToken(SyntaxType.RBraceToken)
      branches.push(new Branch(elseIfCondition, elseIfBody))
    }

    let alternative: null | BlockChild[] = null
    if (tokens[idx].type === SyntaxType.ElseToken) {
      matchToken(SyntaxType.ElseToken)
      matchToken(SyntaxType.LBraceToken)
      alternative = parseBlockBody()
      matchToken(SyntaxType.RBraceToken)
    }

    return new IfClause(branches, alternative)
  }

  const parseArguments = (): Expression[] => {
    const args: Expression[] = []

    while (tokens[idx].type !== SyntaxType.RParenToken) {
      const arg = parseExpression()
      args.push(arg)
      if (tokens[idx].type === SyntaxType.CommaToken) {
        ++idx
      }
    }

    return args
  }

  const parseInclude = (): Include => {
    matchToken(SyntaxType.IncludeToken)
    const nameToken = matchToken(SyntaxType.NameToken)
    matchToken(SyntaxType.LParenToken)
    const args = parseArguments()
    matchToken(SyntaxType.RParenToken)
    matchToken(SyntaxType.SemicolonToken)

    return new Include(nameToken.literal, args)
  }

  const parseParameters = (): string[] => {
    const parameters: string[] = []

    while (tokens[idx].type !== SyntaxType.RParenToken) {
      const parameter = matchToken(SyntaxType.IdentToken)
      parameters.push(parameter.literal)
      if (tokens[idx].type === SyntaxType.CommaToken) {
        ++idx
      }
    }

    return parameters
  }

  const parseMixin = (): Mixin => {
    matchToken(SyntaxType.MixinToken)
    const mixinNameToken = matchToken(SyntaxType.NameToken)
    matchToken(SyntaxType.LParenToken)
    const parameters = parseParameters()
    matchToken(SyntaxType.RParenToken)
    matchToken(SyntaxType.LBraceToken)
    const body = parseBlockBody()
    matchToken(SyntaxType.RBraceToken)

    return new Mixin(mixinNameToken.literal, parameters, body)
  }

  const parsePrimaryExpression = (): Expression => {
    const token = tokens[idx]
    switch (token.type) {
      case SyntaxType.IdentToken:
      case SyntaxType.NameToken:
      case SyntaxType.ValueToken:
        ++idx
        return token
      case SyntaxType.LParenToken: {
        ++idx
        const expr = parseExpression()
        matchToken(SyntaxType.RParenToken)
        return expr
      }
      default:
        throw new Error(`ParseExpression: unexpected NodeType '${token.type}'`)
    }
  }

  const parseBinaryExpression = (parentPrecedence: number): Expression => {
    let left = parsePrimaryExpression()

    while (true) {
      const operator = tokens[idx]
      const precedence = getBinaryOperatorPrecedence(operator)
      if (precedence <= parentPrecedence) {
        break
      }

      ++idx
      const right = parseBinaryExpression(precedence)
      left = new BinaryExpression(left, operator, right)
    }

    return left
  }

  const parseExpression = (): Expression => {
    return parseBinaryExpression(0)
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
