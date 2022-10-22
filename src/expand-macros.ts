import { Token } from './lexer'
import {
  Block,
  BlockChild,
  Declaration,
  Expression,
  Rule,
  SCSS,
  SCSSChild
} from './parser'
import { SyntaxType } from './SyntaxType'

type SCSSObject = StringObject | NumberObject
enum SCSSObjectType {
  String = 'String',
  Number = 'Number'
}
class StringObject {
  readonly type = SCSSObjectType.String
  constructor(public value: string) {}
  toString = (): string => this.value
}
class NumberObject {
  readonly type = SCSSObjectType.Number
  constructor(public value: number, public unit: string | null) {}
  toString = (): string => `${this.value}${this.unit ?? ''}`
}

class Scope {
  private symbols?: Record<string, SCSSObject>

  constructor(private readonly parent: Scope | null) {}

  addSymbol(name: string, object: SCSSObject): void {
    if (this.symbols == null) {
      this.symbols = {}
    }

    this.symbols[name] = object
  }

  lookup(name: string): SCSSObject | null {
    const obj = this.symbols?.[name]
    if (obj == null) {
      return this.parent?.lookup(name) ?? null
    }

    return obj
  }
}

export const expandMacros = (scss: SCSS): SCSS => {
  const evalValueToken = (token: Token): NumberObject => {
    const literal = token.literal
    const n = literal.length
    let i = n - 1
    for (; i >= 1; --i) {
      const isLetter = literal[i] >= 'a' && literal[i] <= 'z'
      if (!isLetter) break
    }

    return new NumberObject(
      parseFloat(literal),
      i + 1 === n ? null : literal.slice(i + 1)
    )
  }

  const evalExpression = (expr: Expression, scope: Scope): SCSSObject => {
    switch (expr.type) {
      case SyntaxType.IdentToken: {
        const { literal } = expr
        const obj = scope.lookup(literal)

        if (obj === null) {
          throw new Error(`EvalExpression: '${literal}' is not defined`)
        }
        return obj
      }
      case SyntaxType.NameToken:
        return new StringObject(expr.literal)
      case SyntaxType.ValueToken:
        return evalValueToken(expr)
      default:
        throw new Error(`EvalExpression: unexpected NodeType '${expr.type}'`)
    }
  }

  const expandSCSS = (scss: SCSS, scope: Scope): SCSS => {
    const content = expandSCSSContent(scss.content, scope)
    return new SCSS(content)
  }

  const expandSCSSContent = (
    content: SCSSChild[],
    scope: Scope
  ): SCSSChild[] => {
    const children: SCSSChild[] = []
    for (const node of content) {
      const child = expandSCSSChild(node, scope)
      if (child !== null) {
        children.push(child)
      }
    }

    return children
  }

  const expandSCSSChild = (node: SCSSChild, scope: Scope): SCSSChild | null => {
    switch (node.type) {
      case SyntaxType.Block:
        return expandBlock(node, scope)
      case SyntaxType.Declaration:
        return expandDeclaration(node, scope)
      default:
        throw new Error(
          `ExpandSCSSChild: unexpected NodeType '${(node as SCSSChild).type}'`
        )
    }
  }

  const expandBlock = (block: Block, scope: Scope): Block => {
    const body: BlockChild[] = []
    const blockScope = new Scope(scope)
    for (const node of block.body) {
      switch (node.type) {
        case SyntaxType.Rule:
          body.push(expandRule(node, blockScope))
          break
        default: {
          const child = expandSCSSChild(node, blockScope)
          if (child !== null) {
            body.push(child)
          }
        }
      }
    }

    return new Block(block.selector, body)
  }

  const expandRule = (rule: Rule, scope: Scope): Rule => {
    const { expression: value, name } = rule
    if (
      value.type === SyntaxType.NameToken ||
      value.type === SyntaxType.ValueToken
    ) {
      return rule
    }

    const obj = evalExpression(value, scope)
    return new Rule(
      name,
      new Token(
        obj.type === SCSSObjectType.Number
          ? SyntaxType.ValueToken
          : SyntaxType.NameToken,
        obj.toString()
      )
    )
  }

  const expandDeclaration = (decl: Declaration, scope: Scope): null => {
    const obj = evalExpression(decl.expression, scope)
    scope.addSymbol(decl.name, obj)
    return null
  }

  const globalScope = new Scope(null)
  return expandSCSS(scss, globalScope)
}
