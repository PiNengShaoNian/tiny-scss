import { Block, BlockChild, Rule, SCSS, SCSSChild } from './parser'
import { SyntaxType } from './SyntaxType'

export const rewriter = (scss: SCSS): SCSS => {
  const rewriteSCSS = (scss: SCSS): SCSS => {
    const content = rewriteSCSSContent(scss.content)
    return new SCSS(content)
  }

  const rewriteSCSSContent = (content: SCSSChild[]): SCSSChild[] => {
    const children: SCSSChild[] = []
    for (const node of content) {
      switch (node.type) {
        case SyntaxType.Block: {
          const block = rewriteBlock(node)
          if (Array.isArray(block)) {
            children.push(...block)
          } else {
            children.push(block)
          }
          break
        }
        default:
          throw new Error(
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `RewriteSCSSContent: unexpected NodeType ${node.type}`
          )
      }
    }

    return children
  }

  const rewriteBlock = (block: Block): Block | Block[] => {
    const needsRewrite = block.body.some((v) => v.type === SyntaxType.Block)

    if (!needsRewrite) return block

    const blocks: Block[] = []
    const blockBody: BlockChild[] = []
    blocks.push(new Block(block.selector, blockBody))

    for (const node of block.body) {
      switch (node.type) {
        case SyntaxType.Block: {
          const { selector, body } = node
          const newBlock = new Block(block.selector + ' ' + selector, body)
          const rewrittenBlock = rewriteBlock(newBlock)
          if (Array.isArray(rewrittenBlock)) {
            blocks.push(...rewrittenBlock)
          } else {
            blocks.push(rewrittenBlock)
          }
          break
        }
        case SyntaxType.Rule:
          blockBody.push(rewriteRule(node))
          break
        default:
          throw new Error(
            `RewriteBlock: unexpected NodeType ${(node as BlockChild).type}`
          )
      }
    }

    return blocks
  }

  const rewriteRule = (rule: Rule): Rule => {
    return rule
  }

  return rewriteSCSS(scss)
}
