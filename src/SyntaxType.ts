export enum SyntaxType {
  // Tokens
  DotToken = 'DotToken',
  NameToken = 'NameToken',
  LBraceToken = 'LBraceToken',
  RBraceToken = 'RBraceToken',
  ColonToken = 'ColonToken',
  SemicolonToken = 'SemicolonToken',
  ValueToken = 'ValueToken',
  EOF = 'EOF',

  // Nodes
  SCSS = 'SCSS',
  Block = 'Block',
  Rule = 'Rule'
}
