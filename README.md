# 这是一个教学项目，旨在从零开始构造一个 SCSS 的子集，并在其中实现一些有趣的功能比如闭包

## 1. 这个项目的目的

- 现在好像前端所有的东西都和编译原理有关, 前端框架中 react 使用 jsx 作为 DSL 能够更优雅的把视图和逻辑优雅的组合在一起,vue 用限制性更强,更容易发现优化特征的模板编编写代码,结合运行时能够生成性能更高的 javascript 代码(render 函数), babel,typescript 这种编译器让我们不管目标平台的兼容性而能直接使用下一代语言的所有 feature,以至于本项目模仿的对象 scss,也是编译原理的应用它能让我们以往在 css 中大量重复的代码只需要少量逻辑即可实现。
- 编译原理很重要，但是就前端需要了解的部分(编译的前端部分)是相对简单的，这个项目的目的就是让你了解这一部分中一些非常具有套路性的模式,并且能够使用这些套路实现自己感兴趣的东西.
- 在这个项目中我们通过对 scss 字符串进行 词法解析，语法解析，宏拓展，重写 AST,生成 CSS 这五个阶段学习到 AST 的生成, AST 的增删改, 和少量的解释器运行时, 了解本项目之后我想你应该就能理解了类似于 babel 这种库干了些什么它是如何工作的，怎么暴露 api 给用户重写 AST 最终生成目标代码的
- 当然作为一个练习时长两年半的前端练习生,我也在持续学习中，这个项目只是把我目前学到的东西展示给大家，可能存在的错误和疏漏欢迎大家指出和讨论

## 2. 需要的前置知识

本项目的学习几乎不需要任何前置知识，在这个项目中只使用到了 javascript 内置的对象或功能，没有用到任何复杂的数据结构和算法，更没有任何元编程技巧，唯一有难度的地方可能就是一些具有套路性的递归,除了少量用来测试代码和规范代码风格的开发依赖外该项目没有用到任何其他第三方库, 当然这个项目是用 typescript 编写,如果你之前没有接触过可能代码对你看起来会有点奇怪,当然如果你已经能熟悉使用 javascript 相信这对你重构到 javascript 也不是什么难事(删除所有类型注释), 最重要的时本项目采用 TDD 模式开发每当我们要实现某一个功能时会先写出他的测试用例，然后在实现功能通过测试，所以你只要跟着本项目的脚步，很轻松就能完成该项目，在中途基本不会遇到什么问题。

## 3. 最终成果

我们会实现 scss 中的以下的功能

- [x] 嵌套的样式块
- [x] 少量的选择器解析
- [x] mixin
- [x] function
- [x] if else
- [x] 二元表达式

废话不多说直接看成果

- ### 闭包支持

```scss
@function createAdd($a) {
  @function add($b) {
    @return $a + $b;
  }

  @return add;
}

.container {
  $add: createAdd(10);
  width: $add(1) + $add(2) + 0px;
}
```

会生成以下 css

```css
.container {
  width: 23px;
}
```

---

- ### 函数递归

源代码

```scss
@function pow($base, $n) {
  @if ($n == 1) {
    @return $base;
  } @else if($n % 2 == 1) {
    @return $base * pow($base, $n - 1);
  } @else {
    $half: pow($base, $n / 2);
    @return $half * $half;
  }
}
@function acc($n) {
  @if ($n == 0) {
    @return 0;
  } @else {
    @return pow($n, 2) + acc($n - 1);
  }
}

.container {
  height: pow(2, 10) + 0px;
  width: acc(3) + 0px;
}
```

输出 css

```css
.container {
  height: 1024px;
  width: 14px;
}
```

---

- ### mixin

源代码 1

```scss
@mixin test($n) {
  @if $n == 0 {
  } @else {
    height: $n + 0px;
    @include test($n - 1);
  }
}
.container {
  @include test(3);
}
```

输出 css1

```css
.container {
  height: 3px;
  height: 2px;
  height: 1px;
}
```

源代码 2

```scss
@mixin color($fg, $bg) {
  color: $fg;
  background-color: $bg;
}
@mixin center() {
  display: flex;
  justify-content: center;
  align-items: center;
}

.container {
  margin: 10px;
  @mixin avatar($round, $w) {
    @include center();
    border-radius: $round;
    width: $w;
    height: $w;
  }
  .box {
    @include avatar(50px, 100px);
    @include color(red, blue);
    box-sizing: border-box;
  }
}
```

输出 css2

```css
.container {
  margin: 10px;
}
.container .box {
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50px;
  width: 100px;
  height: 100px;
  color: red;
  background-color: blue;
  box-sizing: border-box;
}
```

## 4. 开始编写

从这里开始我们就开始编写代码了，我们直接跳过项目的搭建，如果有不了解如何搭建的同学可以直接将项目退回到第一次 commit 直接使用搭建好的项目即可.

### 4.1 词法解析

词法解析是很有必要的一个步骤, 特别是对于一个复杂的文法, 想象以下没有词法解析阶段要怎么解析一个表达式 `3 + 4px * pow(3, 4)`再碰到第一个数字后`3`后我们知道碰到了一个表达式了开始先把这个数字解析出来,解析完`3`后我们应该干什么？开始解析操作符？但实际上我们不能这么做，因为有可能压根没有操作符`3`就是整个表达式，或者操作符前面有很多空格我们应该先跳过空格，所有这些都干完以后我们还忘了`3`后面是不是还有可能有单位,这些细枝末节的逻辑如果和语法解析逻辑(构建语法解析树,也就是常说的 AST)放在一起的话，文法越复杂就越苦不堪言，相反我们先把输入转换成一系列的词法单元，再在词法单元的基础上进行语法解析的话就会轻松很多，比如同样时上面的例子在解析完`3`后我们只需要关心他的下一个词法单元是不是操作符而不用考虑操作符要怎么解析，因为词法解析工作已经在前一个阶段完成了

#### [4.1.1 词法解析空 block](https://github.com/PiNengShaoNian/tiny-scss/blob/main/docs/4-1-1.md)

#### [4.1.2 词法解析 rule](https://github.com/PiNengShaoNian/tiny-scss/blob/main/docs/4-1-2.md)

### 4.2 语法解析

语法解析是根据一个文法推导出该词法单元序列对于语法树(AST)的过程，在这里我们可以先写出目前我们所支持的文法

```
SCSS           --->  SCSSContent
SCSSContent    --->  Block*
Block          --->  Selector `{`
                       BlockBody
                     `}`
Selector       --->  `.`? Name
BlockBody      --->  (Rule | Block)*
Name           --->  [a-zA-Z]+
Rule           --->  Name `:` (Name | Value) `;`
Value          --->  [0-9]+ Name?
```

以上的每一行都是一个产生式，其中大写字母开头的单词被称作为非终结符(比如`SCSS`, `Block`等等)，一个产生式代表一个非终结符的推导逻辑比如一个`Block`会被推导为被选择器和大括号包起来的`BlockBody`,用`BlockBody`又可以推导出零或多个`Rule`和`Block`组成的序列，产生式中的`*`和`+`如果没有被 \` 包裹则它们的意义与正则表达式中的意义相同比如 `Block+`就表示若干个`Block`组成的序列, `Block*`就表示零或多个`Block`组成的序列。
非终结符他们可以推到出终结符,也就是由"\`"包起来的字符比如 `{`,或者像`[a-zA-Z]+`这种用普通的正则表达式写出来串，它们不可以再往下推导。
在语法解析中我们的任务就是从初始非终结符`SCSS`开始推导直到展开所有非终结符后得到输入`SCSS`字符串的过程，在这个过程中`AST`会被顺带构建出来,注意在上面的产生式里面我们偷了个懒实际上`SCSS`实际的产生式应为`SCSS ---> SCSSContent EOF`，也就是说 SCSS 在匹配完`SCSSContent`后还应该在匹配一个`EOF`

可能有点抽象，没关系看一下这个例子,假如输入以下`SCSS`字符串

```scss
.container {
  div {
    height: 10px;
  }
}
```

我们可以看看他是如何一步一步从最顶层的 SCSS 推导式推导出输入的`SCSS`字符串的

1. 将 `SCSS`推导为`SCSSContent`

```
SCSSContent
```

1. 将`SCSSContent`推导为`Block*`

```
Block*
```

1. 将`Block*`推导为`Block`

```
Block
```

1. 将`Block`用产生式体展开

```
Selector `{`
  BlockBody
`}`
```

1. 将`Selector`用产生式体展开

```
`.`? Name `{`
  BlockBody
`}`
```

1. 将`Name`展开为`container`

```
`.container` `{`
  BlockBody
`}`
```

1. 将`BlockBody`用产生式体展开

```
`.container` `{`
  (Rule | Block)*
`}`
```

1. 将`(Rule | Block)*`推导为`Block`

```
`.container` `{`
  Block
`}`
```

1. 重复步骤 4-6

```
`.container` `{`
  `div` `{`
     BlockBody
  `}`
`}`
```

1.  将`BlockBody`推导为`Rule`

```
`.container` `{`
  `div` `{`
     Rule
  `}`
`}`
```

1.  将`Rule`用产生式体展开

```
`.container` `{`
  `div` `{`
     Name `:` (Name | Value) `;`
  `}`
`}`
```

1.  把`Name`推导为`height`

```
`.container` `{`
  `div` `{`
     `height` `:` (Name | Value) `;`
  `}`
`}`
```

1.  将 `(Name | Value)`推导为`10px`,由于所有的非终结符都被展开了我们可以删了 \`

```css
.container {
  div {
    height: 10px;
  }
}
```

大功告成，我们已经用 SCSS 文法推导出了输入的`SCSS`，用推导过程中展开选择的产生式其中的终结符和非终结符建立出一颗自顶向下的树就是我们所需要的`AST`他代表了该`SCSS`串的语法信息，比如上面的推导过程就可以建立以下语法树

```
                              SCSS
                                |
                           SCSSContent
                                |
                              Block
                                |
      ------------------------------------------------------
      |        |                     |                      |
  Selector     {                  BlockBody                 }
      |                              |
   -------                         Block
   |     |                           |
   .    Name          -------------------------------------
         |            |         |            |            |
       container     Selector   {        BlockBody        }
                      |                      |
                     div                   Rule
                                             |
                                     --------------------
                                     |     |     |      |
                                    Name   :    Value   ;
                                     |           |
                                   height       3px
```

好的既然已经知道解析的过程是怎么样的，和要的结果是什么那么我们就开始编写代码吧。

#### [4.2.1 简单嵌套 block 的语法解析](https://github.com/PiNengShaoNian/tiny-scss/blob/main/docs/4-2-1.md)

---

### 4.3 重写 AST

上面的步骤已经完成了将输入的词法单元序列转换为 AST 的工作，在这个步骤我们将对他进行重写成和 CSS 兼容的格式比如将嵌套的样式铺平,以便后续将其生成 CSS

#### [4.3.1 将嵌套的 AST 转换成等价的 CSS 铺平形式](https://github.com/PiNengShaoNian/tiny-scss/blob/main/docs/4-3-1.md)

### 4.4 生成 CSS

这个步骤我们会用上一个步骤产生的和 CSS 兼容的 AST 产生 CSS 字符串

#### [4.4.1 根据 AST 生成对应的 CSS 字符串](https://github.com/PiNengShaoNian/tiny-scss/blob/main/docs/4-4-1.md)

### 4.5 宏拓展

上面的四个小节中我们已经有了将`SCSS`字符串转换为`CSS`字符串的能力,接下来我们终于可以做一些有趣的东西了,在宏拓展的阶段我们将完成`SCSS`中的变量,函数求值,mixin 的导入，至于为啥把这些东西叫成宏是因为像`SCSS`中的 mixin 和 function 它们更类似于传统编程语言中的宏，它们以源码作为输入, 并以源码作为输出, 在编译阶段就能完成所有计算, 并不会真正的作为程序去运行,宏拓展阶段同样是对 AST 进行增删改,它以 AST 作为输入并以 AST 最为输出, 这和`rewriter`干的事情差不多但是在本项目中仍然会多区分出一个阶段来单独做宏拓展,而不是在`rewrite`阶段做这件事,因为在宏拓展阶段某些东西和 AST 的结构是强绑定的,比如一个函数的词法作用域,是相对固定的但是在`rewrite`阶段中我们有可能会改变 AST 的层次结构使这两种东西变得不在统一,但单独讨论实现的话,是完全可以把它们合成一个阶段的,不过为了让程序更加易读我选择单独增加一个宏拓展阶段, 宏拓展阶段必须发生在`rewrite`阶段之前,保证拓展后的 AST 能得到全面的重写,想象一下你都到`rewrite`阶段了,要是 mixin 还没有完成导入的话,待会导入以后你为了保证输出的 AST 一定是被拍平的还要不得不在进行一遍`rewrite`

#### [4.5.1 实现变量,以及块级作用域功能](https://github.com/PiNengShaoNian/tiny-scss/blob/main/docs/4-5-1.md)

#### [4.5.2 实现二元表达式](https://github.com/PiNengShaoNian/tiny-scss/blob/main/docs/4-5-2.md)

#### [4.5.3 实现 mixin](https://github.com/PiNengShaoNian/tiny-scss/blob/main/docs/4-5-3.md)

#### [4.5.4 实现 include](https://github.com/PiNengShaoNian/tiny-scss/blob/main/docs/4-5-4.md)

#### [4.5.5 完成剩余部分](https://github.com/PiNengShaoNian/tiny-scss/blob/main/docs/4-5-5.md)

### 4.6 更多
本项目用到的语法分析方法为"递归下降预测分析"，这种自顶向下方法比较符合人类的思维非常适合手写，基本上所有手写的编译器工具都是用的这种方法，如果想要解析更复杂的文法，可以阅读书籍[编译原理](https://book.douban.com/subject/3296317/)这本书里面介绍了大量的通用编译原理知识，如果比较偏向实战的话推荐看[用Go语言自制解释器](https://book.douban.com/subject/35909085/)和[用Go语言自制编译器
](https://book.douban.com/subject/35909089/)这两本书可以说是实战类书籍中的佼佼者了