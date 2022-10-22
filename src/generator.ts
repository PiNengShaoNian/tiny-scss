import { Block, BlockChild, Rule, SCSS, SCSSChild } from './parser'
import { SyntaxType } from './SyntaxType'

export const generator = (scss: SCSS): string => {
  const identUnit = 2
  let ident = 0

  const generateSCSS = (scss: SCSS): string => {
    return generateSCSSContent(scss.content)
  }

  const generateSCSSContent = (content: SCSSChild[]): string => {
    let css = ''
    for (const node of content) {
      switch (node.type) {
        case SyntaxType.Block:
          css += generateBlock(node)
          break
        default:
          throw new Error(
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `GenerateSCSSContent: unexpected NodeType ${node.type}`
          )
      }
    }

    return css
  }

  const generateBlock = (block: Block): string => {
    const prefix = ' '.repeat(ident * identUnit)
    let css = prefix + block.selector + ' {\n'

    ++ident

    for (const node of block.body) {
      switch (node.type) {
        case SyntaxType.Block:
          css += generateBlock(node)
          break
        case SyntaxType.Rule:
          css += generateRule(node)
          break
        default:
          throw new Error(
            `GenerateBlock: unexpected NodeType ${(node as BlockChild).type}`
          )
      }
    }

    --ident

    css += '}\n'

    return css
  }

  const generateRule = (rule: Rule): string => {
    const prefix = ' '.repeat(ident * identUnit)
    return prefix + rule.name + ': ' + rule.value.literal + ';\n'
  }

  return generateSCSS(scss)
}
