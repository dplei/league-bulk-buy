# 应用资源文件

## 图标文件

请在此目录放置应用图标：

- **icon.ico** - Windows 应用图标（推荐 256x256）

### 生成图标

可以使用在线工具生成 .ico 文件，或使用以下工具：

1. **ImageMagick**
   ```bash
   convert icon.png icon.ico
   ```

2. **在线工具**
   - https://convertio.co/png-ico/
   - https://icoconvert.com/

3. **Electron 推荐**
   使用 PNG 转换为 ICO，分辨率为 256×256 像素或更大。

## 当前状态

暂时使用系统默认图标。打包前请添加自定义 icon.ico 文件。
