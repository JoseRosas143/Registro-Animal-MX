import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

function maskIp(ip: string | undefined) {
  if (!ip) return '0.0.x.x'
  const parts = ip.split('.')
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.x.x`
  return ip
}

export const onWaClick = functions.region('us-central1').https.onCall(async (data, ctx) => {
  const microchip: string = data?.microchip
  const origin: 'rescue'|'lost_mode' = data?.origin || 'rescue'
  const ua: string = data?.ua || ''
  const ip = maskIp((ctx.rawRequest.headers['x-forwarded-for'] as string)?.split(',')[0] || ctx.rawRequest.ip)
  if (!microchip) throw new functions.https.HttpsError('invalid-argument','microchip requerido')

  const db = admin.firestore()
  const petsRef = db.collection('pets')
  const snap = await petsRef.where('microchip','==', microchip).limit(1).get()
  if (snap.empty) throw new functions.https.HttpsError('not-found','Mascota no encontrada')
  const petDoc = snap.docs[0].ref

  await petDoc.update({
    contactsWa: admin.firestore.FieldValue.arrayUnion({
      at: admin.firestore.FieldValue.serverTimestamp(),
      ipMasked: ip,
      ua,
      origin
    })
  })

  // stats_daily increment
  const tz = new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' })
  const d = new Date(tz)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth()+1).padStart(2,'0')
  const dd = String(d.getDate()).padStart(2,'0')
  const key = `${yyyy}-${mm}-${dd}`
  const statRef = db.collection('stats_daily').doc(key)
  await statRef.set({ date: key }, { merge: true })
  await statRef.update({ waClicks: admin.firestore.FieldValue.increment(1) })

  return { ok: true }
})
