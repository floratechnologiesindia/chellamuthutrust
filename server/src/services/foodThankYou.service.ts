import { FoodSlot } from '../models/Finance.js';
import { Home } from '../models/Core.js';
import { User } from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';
import { sendDonorEmail } from './integrations.service.js';
import { notifyDonor } from './donorNotification.service.js';
import { DONOR_NOTIFICATION_TYPES } from './donorNotification.service.js';
import { env } from '../config/env.js';

const TIME_LABELS: Record<string, string> = {
  MORNING: 'Breakfast',
  AFTERNOON: 'Lunch',
  EVENING: 'Dinner',
  REFRESHMENTS: 'Refreshments',
  OUTSIDE_FOOD: 'Outside Food',
};

/** Send a thank-you letter email for a completed food sponsorship. */
export async function sendFoodThankYouLetter(slotId: string) {
  const slot = await FoodSlot.findById(slotId);
  if (!slot) throw new AppError('Food slot not found', 404);
  if (!slot.donor_id) throw new AppError('No donor on this booking', 400);

  const [donor, home] = await Promise.all([
    User.findById(slot.donor_id).lean(),
    Home.findById(slot.home_id).lean(),
  ]);
  if (!donor) throw new AppError('Donor not found', 404);

  const meal = TIME_LABELS[String(slot.time_slot).toUpperCase()] || slot.time_slot;
  const homeName = home?.name || 'our home';
  const subject = `Thank you for sponsoring ${meal} at ${homeName}`;
  const html = `
    <div style="font-family: Rubik, Arial, sans-serif; color: #333; max-width: 560px;">
      <h2 style="color: #ff6633;">Thank you, ${donor.name}!</h2>
      <p>We are grateful for your generous ${meal.toLowerCase()} sponsorship at <strong>${homeName}</strong> on <strong>${slot.date}</strong>.</p>
      <p>Your kindness nourished our residents and brought joy to our home. We look forward to sharing photographs from the day with you.</p>
      <p style="margin-top: 24px;">With warm regards,<br/>M.S. Chellamuthu Trust &amp; Research Foundation</p>
    </div>
  `;
  const text = `Thank you, ${donor.name}! Your ${meal} sponsorship at ${homeName} on ${slot.date} meant a great deal to our residents.`;

  if (donor.email && !String(donor.email).endsWith('@walkin.local')) {
    await sendDonorEmail(donor.email, subject, html, text);
  }

  await notifyDonor({
    userId: slot.donor_id,
    type: DONOR_NOTIFICATION_TYPES.WORK_COMPLETED,
    title: 'Thank you for your food sponsorship',
    message: `Thank you for sponsoring ${meal.toLowerCase()} at ${homeName} on ${slot.date}.`,
    dedupeKey: `food_thank_you:${slotId}`,
  });

  slot.report_sent_at = new Date().toISOString();
  await slot.save();
  return { success: true };
}

/** Notify donor that event photographs are ready (and email if possible). */
export async function shareFoodEventPhotos(slotId: string) {
  const slot = await FoodSlot.findById(slotId);
  if (!slot) throw new AppError('Food slot not found', 404);
  if (!slot.donor_id) throw new AppError('No donor on this booking', 400);
  const photos = slot.completion_photos || [];
  if (!photos.length) throw new AppError('No photographs uploaded yet', 400);

  const [donor, home] = await Promise.all([
    User.findById(slot.donor_id).lean(),
    Home.findById(slot.home_id).lean(),
  ]);
  if (!donor) throw new AppError('Donor not found', 404);

  const meal = TIME_LABELS[String(slot.time_slot).toUpperCase()] || slot.time_slot;
  const homeName = home?.name || 'our home';
  const portal = (env.clientUrl || '').split(',')[0]?.trim() || 'https://donor.msctrustcrm.com';
  const subject = `Photographs from your ${meal} sponsorship at ${homeName}`;
  const photoList = photos
    .map((url, i) => `<li><a href="${url}">Photo ${i + 1}</a></li>`)
    .join('');
  const html = `
    <div style="font-family: Rubik, Arial, sans-serif; color: #333; max-width: 560px;">
      <h2 style="color: #ff6633;">Memories from ${homeName}</h2>
      <p>Dear ${donor.name},</p>
      <p>Here are photographs from the ${meal.toLowerCase()} you sponsored on ${slot.date}.</p>
      <ul>${photoList}</ul>
      <p>You can also view your sponsorship history in the <a href="${portal}">donor portal</a>.</p>
    </div>
  `;

  if (donor.email && !String(donor.email).endsWith('@walkin.local')) {
    await sendDonorEmail(donor.email, subject, html, `Photographs from your ${meal} sponsorship are ready.`);
  }

  await notifyDonor({
    userId: slot.donor_id,
    type: DONOR_NOTIFICATION_TYPES.WORK_COMPLETED,
    title: 'Event photographs shared',
    message: `Photographs from your ${meal.toLowerCase()} at ${homeName} on ${slot.date} are ready.`,
    dedupeKey: `food_photos_shared:${slotId}:${photos.length}`,
  });

  return { success: true, photo_count: photos.length };
}
