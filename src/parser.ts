import { Token } from './lexer'
import { SyntaxType } from './SyntaxType'

export type SCSSChild =
  | Block
  | Declaration
  | Mixin
  | Include
  | IfClause<BlockChild>
  | Function
export type BlockChild = SCSSChild | Rule
export type FunctionChild =
  | Function
  | IfClause<FunctionChild>
  | Declaration
  | Return
export type Expression = Token | BinaryExpression | CallExpression
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

export class Branch<ChildType extends FunctionChild | BlockChild = BlockChild> {
  constructor(public condition: Expression, public body: ChildType[]) {}
}

export class IfClause<
  ChildType extends FunctionChild | BlockChild = BlockChild
> {
  readonly type = SyntaxType.IfClause
  constructor(
    public branches: Array<Branch<ChildType>>,
    public alternative: ChildType[] | null
  ) {}
}

export class Function {
  readonly type = SyntaxType.Function
  constructor(
    public name: string,
    public parameters: string[],
    public body: FunctionChild[]
  ) {}
}

export class Return {
  readonly type = SyntaxType.Return
  constructor(public expression: Expression) {}
}

export class CallExpression {
  readonly type = SyntaxType.CallExpression
  constructor(public name: string, public args: Expression[]) {}
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
        return parseIfClause('block')
      case SyntaxType.FunctionToken:
        return parseFunction()
      default:
        return parseBlock()
    }
  }

  const parseReturn = (): Return => {
    matchToken(SyntaxType.ReturnToken)
    const expression = parseExpression()
    matchToken(SyntaxType.SemicolonToken)

    return new Return(expression)
  }

  const parseFunctionBody = (): FunctionChild[] => {
    const body: FunctionChild[] = []
    while (tokens[idx].type !== SyntaxType.RBraceToken) {
      switch (tokens[idx].type) {
        case SyntaxType.FunctionToken:
          body.push(parseFunction())
          break
        case SyntaxType.IfToken:
          body.push(parseIfClause('function'))
          break
        case SyntaxType.IdentToken:
          body.push(parseDeclaration())
          break
        case SyntaxType.ReturnToken:
          body.push(parseReturn())
          break
        default:
          throw new Error(
            `ParseFunctionBody: unexpected NodeType '${tokens[idx].type}'`
          )
      }
    }

    return body
  }

  const parseFunction = (): Function => {
    matchToken(SyntaxType.FunctionToken)
    const nameToken = matchToken(SyntaxType.NameToken)
    matchToken(SyntaxType.LParenToken)
    const parameters = parseParameters()
    matchToken(SyntaxType.RParenToken)
    matchToken(SyntaxType.LBraceToken)
    const body = parseFunctionBody()
    matchToken(SyntaxType.RBraceToken)
    return new Function(nameToken.literal, parameters, body)
  }

  const parseIfClause = <Context extends 'function' | 'block'>(
    context: Context
  ): IfClause<
    Context extends 'block'
      ? BlockChild
      : Context extends 'function'
        ? FunctionChild
        : never
    > => {
    type ChildType = Context extends 'block'
      ? BlockChild
      : Context extends 'function'
        ? FunctionChild
        : never
    matchToken(SyntaxType.IfToken)
    const bodyParseFunc =
      context === 'block' ? parseBlockBody : parseFunctionBody
    const ifCondition = parseExpression()
    matchToken(SyntaxType.LBraceToken)
    const ifBody = bodyParseFunc() as ChildType[]
    matchToken(SyntaxType.RBraceToken)
    const branches: Array<Branch<ChildType>> = []
    branches.push(new Branch<ChildType>(ifCondition, ifBody))

    while (
      tokens[idx].type === SyntaxType.ElseToken &&
      tokens[idx + 1].type === SyntaxType.NameToken &&
      tokens[idx + 1].literal === 'if'
    ) {
      matchToken(SyntaxType.ElseToken)
      matchToken(SyntaxType.NameToken)
      const elseIfCondition = parseExpression()
      matchToken(SyntaxType.LBraceToken)
      const elseIfBody = bodyParseFunc() as ChildType[]
      matchToken(SyntaxType.RBraceToken)
      branches.push(new Branch<ChildType>(elseIfCondition, elseIfBody))
    }

    let alternative: null | ChildType[] = null
    if (tokens[idx].type === SyntaxType.ElseToken) {
      matchToken(SyntaxType.ElseToken)
      matchToken(SyntaxType.LBraceToken)
      alternative = bodyParseFunc() as ChildType[]
      matchToken(SyntaxType.RBraceToken)
    }

    return new IfClause<ChildType>(branches as any[], alternative)
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

  const parseCallExpression = (): CallExpression => {
    let nameToken: Token
    if (tokens[idx].type === SyntaxType.NameToken) {
      nameToken = matchToken(SyntaxType.NameToken)
    } else {
      nameToken = matchToken(SyntaxType.IdentToken)
    }
    matchToken(SyntaxType.LParenToken)
    const args = parseArguments()
    matchToken(SyntaxType.RParenToken)

    return new CallExpression(nameToken.literal, args)
  }

  const parsePrimaryExpression = (): Expression => {
    const token = tokens[idx]
    switch (token.type) {
      case SyntaxType.IdentToken:
      case SyntaxType.NameToken:
        if (tokens[idx + 1].type === SyntaxType.LParenToken) {
          return parseCallExpression()
        }
        ++idx
        return token
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
