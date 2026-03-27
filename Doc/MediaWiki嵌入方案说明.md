# SekiroWikiCalculator 嵌入 MediaWiki 方案说明

## 1. 背景

当前项目是一个典型的静态前端工具，核心文件包括：

- [`index.html`](index.html)
- [`styles.css`](styles.css)
- [`main.js`](main.js)
- [`data.json`](data.json)

目标是将该项目嵌入 MediaWiki 中使用，同时兼顾上线效率、维护成本和后续扩展性。

---

## 2. 推荐的嵌入方式

### 方案一：独立部署后通过 iframe 嵌入（最推荐）

这是当前阶段最适合本项目的方式。

#### 做法

1. 将当前项目部署为一个独立的静态站点。
2. 在 MediaWiki 页面中通过 `iframe` 嵌入该页面。

示例：

```html
<iframe
  src="https://你的站点地址/index.html"
  width="100%"
  height="900"
  style="border:0;">
</iframe>
```

#### 优点

- 对现有项目改动最小。
- 不会让 [`styles.css`](styles.css) 和 [`main.js`](main.js) 影响 MediaWiki 页面本身。
- 部署和维护成本低。
- 后续更新只需要更新静态站点内容。

#### 缺点

- `iframe` 高度适配不够灵活。
- 与 MediaWiki 页面本身的交互能力有限。
- 某些站点可能限制 `iframe` 使用。

#### 适用场景

- 需要快速上线。
- 暂时不要求与 Wiki 深度集成。
- 工具主要是独立运行的前端应用。

---

### 方案二：直接嵌入 MediaWiki 页面

这种方式是将项目拆分后直接接入 MediaWiki 页面本身。

#### 做法

- 将 [`index.html`](index.html) 中的主体结构嵌入 Wiki 页面。
- 将 [`styles.css`](styles.css) 中的样式迁移到 MediaWiki 的样式页。
- 将 [`main.js`](main.js) 中的逻辑迁移到 MediaWiki 的脚本模块中。
- 重新规划 [`data.json`](data.json) 的加载方式。

#### 需要重点处理的问题

##### 1. 根容器隔离

建议为应用增加唯一根节点，例如：

```html
<div id="sekiro-calculator-app"></div>
```

这样可以避免页面结构和其他 Wiki 内容冲突。

##### 2. 样式作用域限制

[`styles.css`](styles.css) 不能继续使用容易污染全局的选择器。

建议将所有样式都限制在根节点下，例如：

```css
#sekiro-calculator-app .enemy-card {
  /* style */
}
```

这样可以避免对 MediaWiki 原有页面样式造成影响。

##### 3. 脚本初始化方式调整

[`main.js`](main.js) 建议改造成可挂载初始化函数，而不是直接依赖全局页面结构。

推荐目标形式：

```js
function initSekiroCalculator(root, data) {
  // 所有渲染与事件绑定都只在 root 内进行
}
```

这样在 MediaWiki 中可以通过指定容器挂载：

```js
initSekiroCalculator(document.getElementById('sekiro-calculator-app'), data);
```

##### 4. 数据加载方式调整

[`data.json`](data.json) 在普通静态页面中通常可以通过相对路径读取，但在 MediaWiki 中可能失效。

可选方案：

- 将 [`data.json`](data.json) 转为内嵌 JS 常量。
- 将 [`data.json`](data.json) 部署到独立可访问地址后远程获取。
- 通过 MediaWiki 模块或页面配置传入数据。

#### 优点

- 页面集成度高。
- 用户体验更接近 Wiki 原生内容。
- 后续可与模板、导航、页面结构更紧密结合。

#### 缺点

- 需要改造现有代码结构。
- 样式与脚本冲突风险更高。
- 接入和调试成本明显高于 `iframe`。

#### 适用场景

- 工具会长期维护。
- 希望和 MediaWiki 页面融为一体。
- 可以接受一次性重构成本。

---

### 方案三：封装为 MediaWiki Gadget 或扩展

这是更规范、更适合长期维护的方案。

#### 3.1 Gadget 方案

适合纯前端工具。

可以将：

- JS 放到 `MediaWiki:Gadget-xxx.js`
- CSS 放到 `MediaWiki:Gadget-xxx.css`

然后在 `MediaWiki:Gadgets-definition` 中注册。

页面中只保留一个挂载容器，例如：

```html
<div id="sekiro-calculator-app"></div>
```

由 Gadget 脚本自动渲染工具内容。

#### 3.2 扩展方案

适合以下场景：

- 需要后端接口。
- 需要权限控制。
- 需要和 MediaWiki 深度整合。
- 需要在多个页面、命名空间中复用复杂能力。

相较 Gadget，扩展开发成本更高，但架构更完整。

#### 优先建议

对本项目来说，如果只是前端计算器工具，优先考虑 Gadget，而不是一开始就开发扩展。

---

## 3. 对当前项目的建议路线

### 第一阶段：快速上线

优先采用“独立部署 + iframe 嵌入”。

原因：

- 现有代码几乎无需重构。
- 可以最快在 MediaWiki 中投入使用。
- 风险最低，维护成本最低。

实施步骤：

1. 部署当前项目为静态站点。
2. 在 MediaWiki 页面中加入 `iframe`。
3. 调整 `iframe` 的宽高和响应式表现。

---

### 第二阶段：为长期集成做重构

在确认工具功能稳定、使用场景明确后，再开始将项目改造成“可嵌入组件”。

建议重构目标：

1. 保留当前独立网页模式。
2. 为 MediaWiki 新增可嵌入版。
3. 将 [`main.js`](main.js) 改造成容器挂载式初始化。
4. 将 [`styles.css`](styles.css) 全部限制在应用根节点作用域内。
5. 调整 [`data.json`](data.json) 的数据注入方式。
6. 最终封装为 Gadget。

这样可以同时兼容：

- 独立网页运行
- MediaWiki 页面嵌入
- 后续多页面复用

---

## 4. 嵌入 MediaWiki 时的关键风险

### 4.1 样式冲突

[`styles.css`](styles.css) 如果存在如下全局选择器，可能会影响整个 Wiki 页面：

- `body`
- `table`
- `button`
- `input`
- `h1` / `h2` / `h3`

解决建议：

- 所有样式必须加根节点前缀。
- 避免直接修改全局标签样式。

---

### 4.2 脚本加载时机差异

MediaWiki 页面并不是简单静态 HTML，脚本加载机制和普通网页不同。

解决建议：

- 不要过度依赖 `window.onload`。
- 使用明确的初始化函数。
- 如果做成 Gadget，则遵循 MediaWiki 的模块加载方式。

---

### 4.3 数据文件路径问题

[`data.json`](data.json) 在独立网页中可能通过相对路径访问，但在 MediaWiki 中可能路径失效或权限受限。

解决建议：

- 内嵌数据。
- 使用远程数据地址。
- 通过模块配置传参。

---

### 4.4 MediaWiki 权限与安全策略限制

不同站点对以下能力的开放程度不同：

- `iframe`
- 原始 HTML
- 自定义 JS
- 自定义 CSS
- Gadget
- 扩展安装

因此在实施前，应先确认目标 MediaWiki 站点是否允许所选集成方式。

---

## 5. 最终建议

### 短期方案

采用：独立静态部署 + `iframe` 嵌入。

这是当前最省事、最稳妥的方案。

### 长期方案

采用：重构为容器挂载式前端组件，并封装为 MediaWiki Gadget。

这是后续最适合维护和扩展的方案。

---

## 6. 建议的实施顺序

1. 保留当前独立版页面。
2. 将项目部署为静态站点。
3. 在 MediaWiki 中先通过 `iframe` 嵌入验证可用性。
4. 后续再重构 [`main.js`](main.js) 为组件化初始化模式。
5. 将 [`styles.css`](styles.css) 做样式作用域隔离。
6. 将 [`data.json`](data.json) 改为更适合 MediaWiki 的数据加载方式。
7. 最终视需要封装为 Gadget。

---

## 7. 结论

对于当前 [`SekiroWikiCalculator`](index.html) 这类静态前端项目，最合理的策略不是一开始就深度改造，而是：

- 先用 `iframe` 快速接入 MediaWiki
- 再逐步重构为可挂载、可复用、可维护的 MediaWiki 原生嵌入版本

这样既能快速落地，也能为后续长期维护保留足够空间。
