const sharp = require('sharp');
const path = require('path');

const source = path.join(__dirname, '../assets/images/icon.png');
const outputDir = path.join(__dirname, '../public/images');

async function generateIcons() {
  await sharp(source)
    .resize(192, 192, { fit: 'contain' })
    .png()
    .toFile(path.join(outputDir, 'icon-192.png'));

  await sharp(source)
    .resize(512, 512, { fit: 'contain' })
    .png()
    .toFile(path.join(outputDir, 'icon-512.png'));

  console.log('Iconos PWA generados correctamente.');
}

generateIcons().catch((error) => {
  console.error('Error generando iconos:', error);
  process.exitCode = 1;
});
