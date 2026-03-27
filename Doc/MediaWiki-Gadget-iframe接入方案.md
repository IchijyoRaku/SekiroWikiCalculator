# MediaWiki Gadget / Common.js 接入 iframe 方案

已确认目标站点支持 `MediaWiki:Common.js` 和 Gadget，因此可以不直接在普通页面里写原始 `<iframe>`，而是通过站点脚本动态插入。

这可以绕开“普通页面不解析原始 HTML”的限制。

---

## 1. 推荐思路

采用如下方式接入：

1. 在普通 Wiki 页面中只写一个占位容器。
2. 在 `MediaWiki:Common.js` 或 Gadget 脚本里动态创建 `iframe`。
3. 可选地在 `MediaWiki:Common.css` 或 Gadget CSS 中设置容器样式。

这样普通页面不需要直接写原始 HTML 标签源码，兼容性更高。

---

## 2. 页面中写入的内容

在你要嵌入的 Wiki 页面正文中，只放一个普通容器：

```html
<div id="sekiro-calculator-embed"></div>
```

如果普通页面也不允许原始 HTML，可以改为使用 wiki 语法能输出带 id 的容器；如果站点支持模板或扩展标签，也可以让管理员提供固定挂载点。

如果当前页面确实允许这类基础块级标签，那么上面这段就足够。

---

## 3. Common.js 版本示例

将下面代码加入 `MediaWiki:Common.js`：

```js
mw.loader.using(['mediawiki.util']).then(function () {
  var container = document.getElementById('sekiro-calculator-embed');
  if (!container) {
    return;
  }

  var iframe = document.createElement('iframe');
  iframe.src = 'https://ichijyoraku.github.io/SekiroWikiCalculator/';
  iframe.width = '100%';
  iframe.height = '950';
  iframe.style.border = '1px solid #a2a9b1';
  iframe.style.background = '#fff';

  container.style.maxWidth = '1400px';
  container.style.margin = '0 auto';

  container.appendChild(iframe);
});
```

### 作用

这段代码会在页面加载后：
- 查找 `#sekiro-calculator-embed`
- 动态创建一个 `iframe`
- 将你的页面地址 `https://ichijyoraku.github.io/SekiroWikiCalculator/` 插入进去

---

## 4. 更稳妥的页面识别方式

如果你不希望所有带同名容器的页面都自动加载，也可以限制到某个页面标题。

示例：

```js
mw.loader.using(['mediawiki.util']).then(function () {
  if (mw.config.get('wgPageName') !== '只狼敌人数值计算器') {
    return;
  }

  var container = document.getElementById('sekiro-calculator-embed');
  if (!container) {
    return;
  }

  var iframe = document.createElement('iframe');
  iframe.src = 'https://ichijyoraku.github.io/SekiroWikiCalculator/';
  iframe.width = '100%';
  iframe.height = '950';
  iframe.style.border = '1px solid #a2a9b1';
  iframe.style.background = '#fff';

  container.style.maxWidth = '1400px';
  container.style.margin = '0 auto';

  container.appendChild(iframe);
});
```

这样只有页面名等于指定值时才会加载。

---

## 5. Gadget 方案示例

如果你更希望正式一点，建议做成 Gadget。

### Gadget JS
可创建一个对应 Gadget 脚本，内容与 `Common.js` 基本一致，例如：

```js
mw.loader.using(['mediawiki.util']).then(function () {
  var container = document.getElementById('sekiro-calculator-embed');
  if (!container) {
    return;
  }

  var iframe = document.createElement('iframe');
  iframe.src = 'https://ichijyoraku.github.io/SekiroWikiCalculator/';
  iframe.width = '100%';
  iframe.height = '950';
  iframe.style.border = '1px solid #a2a9b1';
  iframe.style.background = '#fff';

  container.className += ' sekiro-calculator-embed-wrapper';
  container.appendChild(iframe);
});
```

### Gadget CSS
可配套加入样式：

```css
.sekiro-calculator-embed-wrapper {
  max-width: 1400px;
  margin: 0 auto;
}

.sekiro-calculator-embed-wrapper iframe {
  display: block;
  width: 100%;
  min-height: 950px;
  border: 1px solid #a2a9b1;
  background: #fff;
}
```

这样结构更清晰，也方便后续维护。

---

## 6. 如果页面里连 div 也不能直接写怎么办

如果普通页面不能直接写：

```html
<div id="sekiro-calculator-embed"></div>
```

那就需要改用以下方式之一：

1. 管理员提供模板，模板输出一个固定容器。
2. 使用某个已启用的扩展标签。
3. 由 `Common.js` 根据页面标题，直接在内容区动态插入容器。

例如直接插入到正文区域：

```js
mw.loader.using(['mediawiki.util']).then(function () {
  if (mw.config.get('wgPageName') !== '只狼敌人数值计算器') {
    return;
  }

  var content = document.getElementById('mw-content-text');
  if (!content) {
    return;
  }

  var wrapper = document.createElement('div');
  wrapper.style.maxWidth = '1400px';
  wrapper.style.margin = '0 auto';

  var iframe = document.createElement('iframe');
  iframe.src = 'https://ichijyoraku.github.io/SekiroWikiCalculator/';
  iframe.width = '100%';
  iframe.height = '950';
  iframe.style.border = '1px solid #a2a9b1';
  iframe.style.background = '#fff';

  wrapper.appendChild(iframe);
  content.appendChild(wrapper);
});
```

这种写法甚至不需要你在页面正文里手动放容器。

---

## 7. 推荐使用顺序

建议按下面顺序尝试：

1. 先在目标页面正文里放一个挂载点：
   ```html
   <div id="sekiro-calculator-embed"></div>
   ```
2. 在 `MediaWiki:Common.js` 中加入动态插入 `iframe` 的脚本。
3. 如果需要，再把样式挪到 `MediaWiki:Common.css` 或 Gadget CSS。
4. 如果后续要长期维护，再正式改造成 Gadget。

---

## 8. 当前最推荐的最小可用方案

### 页面正文

```html
<div id="sekiro-calculator-embed"></div>
```

### `MediaWiki:Common.js`

```js
mw.loader.using(['mediawiki.util']).then(function () {
  var container = document.getElementById('sekiro-calculator-embed');
  if (!container) {
    return;
  }

  var iframe = document.createElement('iframe');
  iframe.src = 'https://ichijyoraku.github.io/SekiroWikiCalculator/';
  iframe.width = '100%';
  iframe.height = '950';
  iframe.style.border = '1px solid #a2a9b1';
  iframe.style.background = '#fff';

  container.style.maxWidth = '1400px';
  container.style.margin = '0 auto';
  container.appendChild(iframe);
});
```

这套方案最适合先验证站点是否能通过脚本方式成功嵌入。 

---

## 9. 结论

既然站点支持 `MediaWiki:Common.js` 和 Gadget，那么当前最合理的办法不是继续在普通页面里硬写 `iframe`，而是：

- 在页面中放占位容器
- 用 `Common.js` 或 Gadget 动态创建 `iframe`

这通常可以绕开普通 Wiki 页面不解析原始 HTML 的问题，并且更适合后续维护。