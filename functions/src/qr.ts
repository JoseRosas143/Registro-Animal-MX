import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import QRCode from 'qrcode'

export const generateQr = functions.region('us-central1').https.onCall(async (data) => {
  const microchip: string = data?.microchip
  if (!microchip) throw new functions.https.HttpsError('invalid-argument','microchip requerido')
  const bucket = admin.storage().bucket()
  const pngPath = `qr/${microchip}.png`
  const svgPath = `qr/${microchip}.svg`
  // Render PNG
  const pngBuffer = await QRCode.toBuffer(`${process.env.PUBLIC_BASE_URL || 'https://registroanimalmx.web.app'}/r/${microchip}`, { width: 512 })
  await bucket.file(pngPath).save(pngBuffer, { contentType: 'image/png', public: true, resumable: false })
  // Render SVG
  const svg = await QRCode.toString(`${process.env.PUBLIC_BASE_URL || 'https://registroanimalmx.web.app'}/r/${microchip}`, { type: 'svg', width: 512 })
  await bucket.file(svgPath).save(Buffer.from(svg), { contentType: 'image/svg+xml', public: true, resumable: false })
  const [pngUrl] = await bucket.file(pngPath).getSignedUrl({ action: 'read', expires: Date.now() + 1000*60*60*24*30 })
  const [svgUrl] = await bucket.file(svgPath).getSignedUrl({ action: 'read', expires: Date.now() + 1000*60*60*24*30 })
  return { pngUrl, svgUrl }
})
