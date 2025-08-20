import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

export const dailyReminders = functions.region('us-central1').pubsub
  .schedule('0 9 * * *')
  .timeZone('America/Mexico_City')
  .onRun(async () => {
    const db = admin.firestore()
    const settings = (await db.doc('settings/app').get()).data() || {}
    if (settings.remindersEnabled === false) return null
    const reminderDays: number = settings.reminderDays ?? 7

    const now = new Date()
    const soon = new Date(now.getTime() + reminderDays*24*60*60*1000)

    // Buscar mascotas con vacunas o desparasitación próximas (simplificado: scan general)
    const petsSnap = await db.collection('pets').get()
    const mail = db.collection('mail')

    for (const pet of petsSnap.docs) {
      const d = pet.data() as any
      const ownerId = d.ownerId
      if (!ownerId) continue
      const userDoc = await db.doc(`users/${ownerId}`).get()
      const user = userDoc.data() as any
      if (!user?.notify) continue

      const dueVaccines = (d.vaccines || []).filter((v:any)=> v?.date && new Date(v.date.toDate ? v.date.toDate() : v.date) <= soon)
      const dueDeworm = (d.deworm || []).filter((x:any)=> x?.coverUntil && new Date(x.coverUntil.toDate ? x.coverUntil.toDate() : x.coverUntil) <= soon)
      if (dueVaccines.length === 0 && dueDeworm.length === 0) continue

      const to = user.email
      if (!to) continue
      await mail.add({
        to,
        message: {
          subject: `Recordatorio de ${d.name}`,
          text: `Hola ${user.displayName || ''},

Tienes próximos eventos de salud de ${d.name}.
Vacunas próximas: ${dueVaccines.length}
Desparasitación próxima: ${dueDeworm.length}

Ingresa: ${process.env.PUBLIC_BASE_URL || 'https://registroanimalmx.web.app'}/app/dashboard
`
        }
      })
    }
    return null
  })
