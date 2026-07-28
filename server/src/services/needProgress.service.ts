import { Need, Donation } from '../models/Operations.js';
import { KindDonation } from '../models/Finance.js';

/**
 * Recompute need progress from donations + kind donations linked to the need.
 * Updates collected_amount, fulfilled_product_qty, current_sponsors_count, and status.
 */
export async function recalculateNeedProgress(needId: string) {
  const need = await Need.findById(needId);
  if (!need) return null;

  const donations = await Donation.find({
    need_id: needId,
    status: { $in: ['PLEDGED', 'ACTIVE', 'COMPLETED'] },
  }).lean();

  const kindRows = await KindDonation.find({ need_id: needId }).lean();

  const collectedAmount = donations.reduce((sum, d) => sum + (Number(d.amount_pledged) || 0), 0);
  const fulfilledProductQty = kindRows.reduce((sum, k) => sum + (Number(k.quantity) || 0), 0);
  const sponsorsCount = new Set(
    [...donations.map((d) => d.donor_id), ...kindRows.map((k) => k.donor_id)].filter(Boolean),
  ).size;

  need.collected_amount = collectedAmount;
  need.fulfilled_product_qty = fulfilledProductQty;
  need.current_sponsors_count = Math.max(sponsorsCount, need.current_sponsors_count || 0);

  const mode = String(need.donation_mode || 'MONEY_ONLY').toUpperCase();
  const requiredAmount = Number(need.required_amount) || 0;
  const requiredQty = Number(need.required_product_qty) || 0;
  const maxSponsors = Number(need.max_sponsors_allowed) || 0;

  let fullySponsored = false;
  if (mode === 'MONEY_ONLY') {
    fullySponsored = requiredAmount > 0 && collectedAmount >= requiredAmount;
  } else if (mode === 'PRODUCT_ONLY') {
    fullySponsored = requiredQty > 0 && fulfilledProductQty >= requiredQty;
  } else {
    const moneyDone = requiredAmount <= 0 || collectedAmount >= requiredAmount;
    const productDone = requiredQty <= 0 || fulfilledProductQty >= requiredQty;
    fullySponsored = moneyDone && productDone && (requiredAmount > 0 || requiredQty > 0);
  }

  if (!fullySponsored && maxSponsors > 0 && need.current_sponsors_count >= maxSponsors) {
    fullySponsored = true;
  }

  const hasProgress =
    collectedAmount > 0 || fulfilledProductQty > 0 || (need.current_sponsors_count || 0) > 0;

  if (need.status !== 'COMPLETED' && need.status !== 'CANCELLED') {
    if (fullySponsored) need.status = 'FULLY_SPONSORED';
    else if (hasProgress) need.status = 'PARTIAL';
    else need.status = 'OPEN';
  }

  await need.save();
  return need;
}
