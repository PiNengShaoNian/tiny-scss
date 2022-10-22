export enum SyntaxType {
  // Tokens
  DotToken = 'DotToken',
  NameToken = 'NameToken',
  LBraceToken = 'LBraceToken',
  RBraceToken = 'RBraceToken',
  ColonToken = 'ColonToken',
  SemicolonToken = 'SemicolonToken',
  ValueToken = 'ValueToken',
  IdentToken = 'IdentToken',
  EqualsEqualsToken = 'EqualsEqualsToken',
  BangEqualsToken = 'BangEqualsToken',
  PlusToken = 'PlusToken',
  MinusToken = 'MinusToken',
  MulToken = 'MulToken',
  DivToken = 'DivToken',
  ModToken = 'ModToken',
  EOF = 'EOF',

  // Nodes
  SCSS = 'SCSS',
  Block = 'Block',
  Rule = 'Rule',
  Declaration = 'Declaration'
}
