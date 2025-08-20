import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

export const migrateArraysToSubcollections = functions.region('us-central1').https.onCall(async (data, ctx) => {
  const dryRun: boolean = !!data?.dryRun
  const db = admin.firestore()
  const pets = await db.collection('pets').get()
  let moved = 0
  for (const doc of pets.docs) {
    const d = doc.data() as any
    const vax = d.vaccines || []
    const deworm = d.deworm || []
    const history = d.history || []
    const docs = d.docs || []
    if (!dryRun) {
      for (const v of vax) await doc.ref.collection('vaccines').add(v)
      for (const w of deworm) await doc.ref.collection('deworm').add(w)
      for (const h of history) await doc.ref.collection('history').add(h)
      for (const k of docs) await doc.ref.collection('docs').add(k)
      await doc.ref.update({ vaccines: admin.firestore.FieldValue.delete(), deworm: admin.firestore.FieldValue.delete(), history: admin.firestore.FieldValue.delete(), docs: admin.firestore.FieldValue.delete() })
    }
    moved++
  }
  return { pets: pets.size, moved, dryRun }
})
