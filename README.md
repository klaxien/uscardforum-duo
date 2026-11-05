# 美卡论坛 Duo 内屏竖屏手机布局

让美卡论坛在 iPhone Duo 内屏竖屏时使用原生手机首页和 bottom sheet，保留正常字号与缩放。内容区左右各留白 32px；横屏、外屏保持原布局。

## 安装

需要 iOS Safari 的 [Userscripts](https://github.com/quoid/userscripts) 扩展。

1. 安装并启用扩展，选择存放脚本的文件夹。
2. 用 Safari 打开 [安装脚本](https://raw.githubusercontent.com/klaxien/uscardforum-duo/main/uscardforum-duo-mobile.user.js)。
3. 打开 Userscripts 扩展菜单，选择安装，并允许访问美卡论坛。
4. 禁用或删除旧版脚本，刷新论坛。不要同时启用多份。

**仓库若为私有，以上链接不能用于向普通用户公开分发。** 需要将仓库公开，或改用公开托管地址；不要在更新 URL 中放 token。

## 更新

脚本已配置固定的 `@updateURL` 和 `@downloadURL`。在 Userscripts 扩展菜单检查更新即可；自动检查是否可用取决于扩展版本。以前手动安装、未包含更新地址的版本，需要手动替换一次。

## 原理与范围

- 匹配本次实测设备：iPhone UA、DPR 3、screen 466×678。
- 仅真实视口宽度为 669 CSS px 时，将 40rem / 640px 的手机分界改为 44rem / 704px。
- JS 改写对应 `matchMedia` 查询，仍返回原生 MediaQueryList，由浏览器发送方向变化事件。
- CSS 只改变同一分界的媒体查询条件，保留样式声明和层叠顺序。论坛 CDN 样式通过本地副本应用。
- 不改 viewport、zoom、组件实现或帖子 DOM 顺序；额外留白只作用于现有内容容器。

`CONTENT_SIDE_PADDING_PX` 可调整留白，默认 32。更改设备显示缩放、页面缩放或分屏后，视口可能不再是 669px，此时不会触发。

## 开发

Node.js 22+，没有第三方依赖，不需要 npm install，也不发布 npm 包。package.json 仅提供开发命令。

```sh
npm run check
npm test
npm run build
```

发布新版本：修改 `.user.js`，同步更新其 `@version` 与 package.json 的版本号，运行 `npm run build` 生成 `.meta.js`，再执行检查和测试，将两个文件一起提交。

测试覆盖设备范围、669px 与其他宽度的判断、原生 MediaQueryList 返回、CSS 资源路径保留、网络失败以及更新元数据一致性。它不替代 Safari 真机测试。

Chrome 模拟验证过 669×867、951×585、382×590、594×378 的切换及 100% 缩放；用户已确认手机使用效果。更新后仍建议真机展开、旋转、合上各检查一次。

## 限制

依赖论坛现有 matchMedia 与断点机制；论坛升级更换机制后可能需要调整。仅处理论坛 `/stylesheets/` 下的外链 CSS。CSS 副本异步加载，初次打开可能短暂显示原布局；网络、CORS 或 CSP 失败时保留原 CSS 并在控制台警告，此时 JS/CSS 可能不一致。

脚本必须在页面初始化前执行（`document-start`、页面上下文），不支持加载完成后直接粘贴执行作为完整安装。

## License

MIT
