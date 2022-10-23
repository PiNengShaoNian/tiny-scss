import { Token } from './lexer'
import {
  BinaryExpression,
  Block,
  BlockChild,
  Declaration,
  Expression,
  Rule,
  SCSS,
  SCSSChild,
  Mixin,
  Include,
  IfClause
} from './parser'
import { SyntaxType } from './SyntaxType'

type SCSSObject = StringObject | NumberObject | BooleanObject | MixinObject
enum SCSSObjectType {
  String = 'String',
  Number = 'Number',
  Boolean = 'Boolean',
  Mixin = 'Mixin'
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
class BooleanObject {
  readonly type = SCSSObjectType.Boolean
  constructor(public value: boolean) {}
  toString = (): string => this.value.toString()
}
class MixinObject {
  readonly type = SCSSObjectType.Mixin
  constructor(public value: Mixin, public scope: Scope) {}
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
  const extendScope = (
    obj: MixinObject,
    execScope: Scope,
    args: Expression[]
  ): Scope => {
    const extendedScope = new Scope(obj.scope)
    const parameters = obj.value.parameters

    if (parameters.length !== args.length) {
      throw new Error(
        `ExtendScope: ${obj.value.name} want ${
          parameters.length
        } arguments, got=${args.length} (${JSON.stringify(args)})`
      )
    }

    for (let i = 0; i < parameters.length; ++i) {
      const arg = evalExpression(args[i], execScope)
      const parameter = parameters[i]
      extendedScope.addSymbol(parameter, arg)
    }

    return extendedScope
  }

  const findTargetBranch = (
    ifClause: IfClause,
    scope: Scope
  ): BlockChild[] | null => {
    const branches = ifClause.branches
    let targetBranch: BlockChild[] | null = null
    for (const branch of branches) {
      const condition = evalExpression(branch.condition, scope)

      if (condition.type !== SCSSObjectType.Boolean) {
        throw new Error(
          `FindTargetBranch: unexpected ObjectType ${condition.type}, want=${
            SCSSObjectType.Boolean
          } (${JSON.stringify(branch.condition)})`
        )
      }

      if (condition.value) {
        targetBranch = branch.body
        break
      }
    }

    if (targetBranch == null) {
      targetBranch = ifClause.alternative
    }

    return targetBranch
  }

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

  const executeNumberBinaryOperator = (
    left: SCSSObject,
    operator: Token,
    right: SCSSObject
  ): SCSSObject => {
    if (
      left.type !== SCSSObjectType.Number ||
      right.type !== SCSSObjectType.Number
    ) {
      throw new Error(
        `ExecuteNumberBinaryOperator: unexpected operand type, '${left.type}'' '${operator.literal}'' '${right.type}'`
      )
    }

    if (left.unit !== null && right.unit !== null && left.unit !== right.unit) {
      throw new Error(
        `ExecuteNumberBinaryOperator: incompatible unit '${JSON.stringify(
          left
        )}' and '${JSON.stringify(right)}'`
      )
    }

    const unit = left.unit ?? right.unit
    switch (operator.type) {
      case SyntaxType.PlusToken:
        return new NumberObject(left.value + right.value, unit)
      case SyntaxType.MinusToken:
        return new NumberObject(left.value - right.value, unit)
      case SyntaxType.MulToken:
        return new NumberObject(left.value * right.value, unit)
      case SyntaxType.DivToken:
        return new NumberObject(left.value / right.value, unit)
      case SyntaxType.ModToken:
        return new NumberObject(left.value % right.value, unit)
      default:
        throw new Error(
          `ExecuteNumberBinaryOperator: unexpected operator type '${operator.type}'`
        )
    }
  }

  const evalBinaryExpression = (
    bs: BinaryExpression,
    scope: Scope
  ): SCSSObject => {
    const { left, right, operator } = bs

    const leftObj = evalExpression(left, scope)
    const rightObj = evalExpression(right, scope)
    switch (operator.type) {
      case SyntaxType.EqualsEqualsToken:
        return new BooleanObject(leftObj.value === rightObj.value)
      case SyntaxType.BangEqualsToken:
        return new BooleanObject(leftObj.value !== rightObj.value)
      case SyntaxType.PlusToken:
      case SyntaxType.MinusToken:
      case SyntaxType.MulToken:
      case SyntaxType.DivToken:
      case SyntaxType.ModToken:
        return executeNumberBinaryOperator(leftObj, operator, rightObj)
      default:
        throw new Error(
          `EvalBinaryExpression: unexpected operator type ${operator.type}`
        )
    }
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
      case SyntaxType.BinaryExpression:
        return evalBinaryExpression(expr as BinaryExpression, scope)
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
      if (Array.isArray(child)) {
        children.push(...child)
      } else if (child !== null) {
        children.push(child)
      }
    }

    return children
  }

  const expandSCSSChild = (
    node: SCSSChild,
    scope: Scope
  ): SCSSChild | SCSSChild[] | null => {
    switch (node.type) {
      case SyntaxType.Block:
        return expandBlock(node, scope)
      case SyntaxType.Declaration:
        return expandDeclaration(node, scope)
      case SyntaxType.Mixin:
        return expandMixin(node, scope)
      case SyntaxType.Include:
        return expandInclude(node, scope) as SCSSChild[]
      case SyntaxType.IfClause:
        return expandIfClause(node, scope) as SCSSChild[]
      default:
        throw new Error(
          `ExpandSCSSChild: unexpected NodeType '${(node as SCSSChild).type}'`
        )
    }
  }

  const expandIfClause = (ifClause: IfClause, scope: Scope): BlockChild[] => {
    const targetBranch = findTargetBranch(ifClause, scope)

    if (targetBranch === null) return []
    const dummyBlock = new Block('', targetBranch)

    return expandBlock(dummyBlock, scope).body
  }

  const expandInclude = (include: Include, scope: Scope): BlockChild[] => {
    const mixinObj = scope.lookup(include.name)
    if (mixinObj === null || mixinObj.type !== SCSSObjectType.Mixin) {
      throw new Error(`ExpandInclude: Mixin '${include.name}' is not defined`)
    }
    const extendedScope = extendScope(mixinObj, scope, include.args)
    const dummyBlock = new Block('', mixinObj.value.body)
    const expandedBlock = expandBlock(dummyBlock, extendedScope)

    return expandedBlock.body
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
          if (Array.isArray(child)) {
            body.push(...child)
          } else if (child !== null) {
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

    if (
      obj.type !== SCSSObjectType.Number &&
      obj.type !== SCSSObjectType.String
    ) {
      throw new Error(`ExpandRule: unexpected object type ${obj.type}`)
    }

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

  const expandMixin = (mixin: Mixin, scope: Scope): null => {
    const obj = new MixinObject(mixin, scope)
    scope.addSymbol(mixin.name, obj)
    return null
  }

  const globalScope = new Scope(null)
  return expandSCSS(scss, globalScope)
}
