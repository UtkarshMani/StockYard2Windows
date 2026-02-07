# Icon Placeholder

This directory should contain the following icon files for Windows installer:

- `icon.ico` - Application icon (256x256 or multi-size .ico file)
- `icon.png` - Application icon PNG (512x512 recommended)
- `installerHeader.bmp` - NSIS installer header (150x57 pixels)
- `installerSidebar.bmp` - NSIS installer sidebar (164x314 pixels)
- `uninstallerSidebar.bmp` - NSIS uninstaller sidebar (164x314 pixels)

## How to Create Icons:

### Online Tools:
- **ICO Converter**: https://www.icoconverter.com/
- **Favicon Generator**: https://realfavicongenerator.net/

### Manual Creation:
1. Create a 512x512 PNG logo for your application
2. Use an online converter to generate .ico file
3. Create BMP files for installer graphics
4. Place all files in this directory

### Temporary Solution:
For testing, you can skip icon creation. The build will work without them, but the installer will use default Windows icons.

## Note:
Icon files are not included in version control. Add them before building the Windows installer.
