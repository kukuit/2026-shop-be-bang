import 'server-only'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getAdminDb } from '@/lib/firebaseAdmin'

export type Reward = { id: string; name: string; coinCost: number; imageUrl: string | null; isActive: boolean; order: number }
export type Redemption = { id: string; rewardName: string; rewardImageUrl: string | null; coinCost: number; status: 'pending' | 'received' | 'cancelled'; redeemedAt: string; receivedAt: string | null; cancelledAt: string | null }
const root = () => getAdminDb().collection('shopbebangcom').doc('game')
const rewards = (userId: string) => root().collection('user_rewards').doc(userId).collection('items')
const redemptions = (userId: string) => root().collection('user_reward_redemptions').doc(userId).collection('items')
const wallet = (userId: string) => root().collection('coin_wallets').doc(userId)
const dateString = (value: unknown) => value instanceof Timestamp ? value.toDate().toISOString() : null
const currentGiftImageUrl = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  return value.replace(/^(\/games\/general\/images\/gifts\/[a-z0-9-]+)\.webp$/i, '$1.png')
}
const mapReward = (id: string, data: FirebaseFirestore.DocumentData): Reward => ({ id, name: data.name, coinCost: data.coinCost, imageUrl: currentGiftImageUrl(data.imageUrl), isActive: data.isActive === true, order: data.order ?? 0 })
const mapRedemption = (id: string, data: FirebaseFirestore.DocumentData): Redemption => ({ id, rewardName: data.rewardName, rewardImageUrl: currentGiftImageUrl(data.rewardImageUrl), coinCost: data.coinCost, status: data.status === 'received' || data.status === 'cancelled' ? data.status : 'pending', redeemedAt: dateString(data.redeemedAt) ?? new Date().toISOString(), receivedAt: dateString(data.receivedAt), cancelledAt: dateString(data.cancelledAt) })

export async function listRewards(userId: string) {
  const [items, balance] = await Promise.all([rewards(userId).orderBy('order').get(), wallet(userId).get()])
  return { rewards: items.docs.map(doc => mapReward(doc.id, doc.data())), coinBalance: balance.data()?.balance ?? 0 }
}
export async function listRedemptions(userId: string) {
  const result = await redemptions(userId).orderBy('redeemedAt', 'desc').limit(50).get()
  return result.docs.map(doc => mapRedemption(doc.id, doc.data()))
}
export async function saveReward(userId: string, input: { id?: string; name: string; coinCost: number; imageUrl?: string | null; isActive: boolean }) {
  const name = input.name.trim()
  if (!name || name.length > 80 || !Number.isSafeInteger(input.coinCost) || input.coinCost < 1) throw new Error('INVALID_REWARD')
  const imageUrl = input.imageUrl?.trim() || null
  if (imageUrl && !/^\/games\/general\/images\/gifts\/[a-z0-9-]+\.(?:png|webp|jpe?g)$/i.test(imageUrl)) throw new Error('INVALID_IMAGE')
  const collection = rewards(userId)
  const ref = input.id ? collection.doc(input.id) : collection.doc()
  const previous = input.id ? await ref.get() : null
  if (input.id && !previous?.exists) throw new Error('NOT_FOUND')
  const createdAt = previous?.data()?.createdAt ?? FieldValue.serverTimestamp()
  await ref.set({ name, coinCost: input.coinCost, imageUrl, isActive: input.isActive, order: previous?.data()?.order ?? (await collection.count().get()).data().count, createdAt, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
  return mapReward(ref.id, (await ref.get()).data()!)
}
export async function redeemReward(userId: string, rewardId: string) {
  const db = getAdminDb(), rewardRef = rewards(userId).doc(rewardId), walletRef = wallet(userId), redemptionRef = redemptions(userId).doc(), transactionRef = root().collection('coin_transactions').doc()
  return db.runTransaction(async transaction => {
    const [rewardSnapshot, walletSnapshot] = await Promise.all([transaction.get(rewardRef), transaction.get(walletRef)])
    const reward = rewardSnapshot.data(), balance = Number(walletSnapshot.data()?.balance ?? 0)
    if (!rewardSnapshot.exists || reward?.isActive !== true) throw new Error('REWARD_UNAVAILABLE')
    const cost = reward.coinCost
    if (!Number.isSafeInteger(cost) || cost < 1 || !Number.isSafeInteger(balance) || balance < cost) throw new Error(`INSUFFICIENT_BALANCE:${Number.isSafeInteger(balance) ? balance : 0}`)
    const after = balance - cost
    transaction.set(walletRef, { balance: after, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    transaction.create(redemptionRef, { userId, childId: userId, rewardId, rewardName: reward.name, rewardImageUrl: currentGiftImageUrl(reward.imageUrl), coinCost: cost, status: 'pending', redeemedAt: FieldValue.serverTimestamp(), receivedAt: null, cancelledAt: null })
    transaction.create(transactionRef, { userId, childId: userId, type: 'reward_redeem', amount: -cost, balanceBefore: balance, balanceAfter: after, referenceId: redemptionRef.id, description: `Đổi quà ${reward.name}`, createdAt: FieldValue.serverTimestamp() })
    return { id: redemptionRef.id, rewardName: reward.name, rewardImageUrl: currentGiftImageUrl(reward.imageUrl), coinCost: cost, coinBalance: after }
  })
}
export async function markReceived(userId: string, redemptionId: string) {
  const db = getAdminDb(), ref = redemptions(userId).doc(redemptionId)
  return db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref)
    if (!snapshot.exists) throw new Error('NOT_FOUND')
    if (snapshot.data()?.status === 'received') return
    if (snapshot.data()?.status !== 'pending') throw new Error('INVALID_STATUS')
    transaction.update(ref, { status: 'received', receivedAt: FieldValue.serverTimestamp() })
  })
}
export async function cancelRedemption(userId: string, redemptionId: string) {
  const db = getAdminDb(), ref = redemptions(userId).doc(redemptionId), walletRef = wallet(userId), ledgerRef = root().collection('coin_transactions').doc()
  return db.runTransaction(async transaction => {
    const [redemptionSnapshot, walletSnapshot] = await Promise.all([transaction.get(ref), transaction.get(walletRef)])
    if (!redemptionSnapshot.exists) throw new Error('NOT_FOUND')
    const redemption = redemptionSnapshot.data()!
    if (redemption.status !== 'pending') throw new Error('INVALID_STATUS')
    const before = Number(walletSnapshot.data()?.balance ?? 0), amount = Number(redemption.coinCost)
    if (!Number.isSafeInteger(before) || before < 0 || !Number.isSafeInteger(amount) || amount < 1) throw new Error('INVALID_BALANCE')
    transaction.set(walletRef, { balance: before + amount, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    transaction.update(ref, { status: 'cancelled', cancelledAt: FieldValue.serverTimestamp() })
    transaction.create(ledgerRef, { userId, childId: userId, type: 'reward_refund', amount, balanceBefore: before, balanceAfter: before + amount, referenceId: redemptionId, description: `Hoàn xu quà ${redemption.rewardName}`, createdAt: FieldValue.serverTimestamp() })
  })
}
