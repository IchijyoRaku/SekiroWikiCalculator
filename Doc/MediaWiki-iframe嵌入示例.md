# MediaWiki iframe 嵌入示例

以下内容可直接用于在 MediaWiki 页面中测试嵌入 [`SekiroWikiCalculator`](https://ichijyoraku.github.io/SekiroWikiCalculator/)。

## 1. 最简版本

```html
<iframe
  src="https://ichijyoraku.github.io/SekiroWikiCalculator/"
  width="100%"
  height="900"
  style="border:0;">
</iframe>
```

---

## 2. 带标题和说明的版本

```html
<div style="margin: 1em 0;">
  <p><strong>只狼敌人数值计算器</strong></p>
  <iframe
    src="https://ichijyoraku.github.io/SekiroWikiCalculator/"
    width="100%"
    height="900"
    style="border: 1px solid #ccc; background: #fff;">
  </iframe>
</div>
```

---

## 3. 更适合页面展示的版本

```html
<div style="max-width: 1400px; margin: 0 auto;">
  <iframe
    src="https://ichijyoraku.github.io/SekiroWikiCalculator/"
    width="100%"
    height="950"
    style="border: 1px solid #a2a9b1; border-radius: 4px; background: #fff;">
  </iframe>
</div>
```

---

## 4. 使用说明

### 如果页面允许原始 HTML
可直接将以上 `iframe` 代码粘贴到对应 MediaWiki 页面中测试。

### 如果页面不允许原始 HTML
则需要确认站点是否：

- 开启了相关 HTML 扩展
- 允许 `iframe`
- 允许通过模板、Gadget 或扩展插入嵌入内容

---

## 5. 注意事项

### 1. 高度可能需要继续调整
当前建议高度：`900` 或 `950`。如果页面内容显示不完整，可继续增大。

### 2. 某些 MediaWiki 站点可能限制 iframe
如果嵌入后不显示，常见原因包括：

- 站点禁用了原始 HTML
- 安全策略限制了 `iframe`
- 页面编辑权限不足

### 3. GitHub Pages 地址建议使用目录根路径
当前地址：

- `https://ichijyoraku.github.io/SekiroWikiCalculator/`

建议优先使用这个地址，而不是手动写死 [`index.html`](index.html) 路径，这样更稳妥。

---

## 6. 推荐测试代码

优先建议先使用下面这段：

```html
<div style="max-width: 1400px; margin: 0 auto;">
  <iframe
    src="https://ichijyoraku.github.io/SekiroWikiCalculator/"
    width="100%"
    height="950"
    style="border: 1px solid #a2a9b1; background: #fff;">
  </iframe>
</div>
```

这段代码适合先在 MediaWiki 中验证是否可以正常加载。