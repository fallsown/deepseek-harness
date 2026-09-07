# Agent Note: 视觉输入模型的图片 wire 形态走 base64 内联

Status: implemented

## 问题

`llm-deepseek` 的图片序列化默认先走 DeepSeek Files API：上传图片拿 `file_id`，请求里发 `{type:'file', file_id}` part；Files API 失败才回退 base64 `image_url`。对声明了 image 输入能力的实验视觉模型（`deepseek-v4-flash-vision-exp`）实测：`file` 引用不产生画面内容——模型只能看到文件引用文本（自述"只能看到校验码/图片已被省略"），而同一张图以 `image_url: data:<mime>;base64,...` 内联时模型能完整读出文字与颜色（DeepSeek 官方 API 直连验证）。

Files API 上传本身成功，因此现有的 `FileResolutionFailure → base64` 回退永不触发，图片静默退化。

## 决策

`adapter.ts` 的 representation 初值按 catalog 模型能力推导：`inputModalities` 含 `'image'` 的模型直接以 base64 内联（跳过 Files API 尝试），其余模型维持 file-first 不变。选择依据是 catalog 已声明的事实（wire 正确性接线），不是部署调参，故不加 Config 字段。

## 验证

- 官方 API 直连：同一张图 base64 `image_url` 模型准确读出文字/颜色（file 引用则读不到）。
- credit-pass 侧端到端（im-server → solo-sales-agent TS → dsh SDK image block → 本 adapter）：H5 发图，回复准确描述图片文字与配色。

## 已知限制

- 请求级快照覆盖（recorded-session）未随本 fork 内联改动更新，回流上游时补齐。
- `file` 路径仍是非视觉模型的默认；若未来视觉模型支持 Files API file 引用，需重新评估推导条件。
