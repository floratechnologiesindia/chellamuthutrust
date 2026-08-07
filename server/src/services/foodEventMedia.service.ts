import { FoodSlot, IFoodSlot } from '../models/Finance.js';
import { Home } from '../models/Core.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Operations.js';
import { AppError } from '../middleware/errorHandler.js';
import { sendDonorEmail, sendWhatsApp } from './integrations.service.js';
import { notifyDonor, DONOR_NOTIFICATION_TYPES, timeSlotLabel } from './donorNotification.service.js';
import { env } from '../config/env.js';

export const FOOD_EVENT_MEDIA_NOTIFY_TYPE = 'food_event_media_review';

const TIME_LABELS: Record<string, string> = {
  MORNING: 'Breakfast',
  AFTERNOON: 'Lunch',
  EVENING: 'Dinner',
  REFRESHMENTS: 'Refreshments',
  OUTSIDE_FOOD: 'Outside Food',
};

function mealLabel(slot: IFoodSlot): string {
  const base = TIME_LABELS[String(slot.time_slot).toUpperCase()] || timeSlotLabel(slot.time_slot, slot.meal_type);
  if (slot.time_slot === 'OUTSIDE_FOOD' && slot.meal_type) {
    return `${base} (${slot.meal_type})`;
  }
  return base;
}

async function getTrustAdminIds(trustId: string): Promise<string[]> {
  const admins = await User.find({
    role: { $in: ['admin', 'super_admin'] },
    $or: [{ trust_id: trustId }, { role: 'super_admin' }],
    status: 'active',
  }).select('_id');
  return admins.map((u) => u._id);
}

async function notifyAdminsOfMediaSubmission(slot: IFoodSlot, submitterName: string) {
  const home = await Home.findById(slot.home_id).select('name').lean();
  const homeName = home?.name || 'a project';
  const meal = mealLabel(slot);
  const adminIds = await getTrustAdminIds(slot.trust_id);
  if (!adminIds.length) return;

  const title = 'Event media awaiting review';
  const message = `${submitterName} submitted photos/videos for ${meal} on ${slot.date} at ${homeName}. Review and send to the donor from Reports.`;
  const dedupeKey = `food_event_media_pending:${slot._id}`;

  await Promise.all(
    adminIds.map(async (userId) => {
      const existing = await Notification.findOne({ user_id: userId, dedupe_key: dedupeKey }).lean();
      if (existing) return;
      await Notification.create({
        user_id: userId,
        type: FOOD_EVENT_MEDIA_NOTIFY_TYPE,
        title,
        message,
        dedupe_key: dedupeKey,
        is_read: false,
      });
    }),
  );
}

export async function submitFoodEventMedia(
  slotId: string,
  params: {
    photos: string[];
    videos?: string[];
    notes?: string;
    submittedByUserId: string;
    submittedByName?: string;
  },
) {
  const slot = await FoodSlot.findById(slotId);
  if (!slot) throw new AppError('Food slot not found', 404);
  if (!slot.donor_id) throw new AppError('No donor on this booking', 400);

  const photos = (params.photos || []).filter(Boolean);
  const videos = (params.videos || []).filter(Boolean);
  if (!photos.length && !videos.length) {
    throw new AppError('Upload at least one photo or video', 400);
  }

  slot.completion_photos = photos;
  slot.completion_videos = videos;
  slot.completion_notes = params.notes?.trim() || slot.completion_notes || '';
  slot.completion_status = 'COMPLETED';
  slot.event_media_status = 'PENDING';
  slot.event_media_submitted_at = new Date().toISOString();
  slot.event_media_approved_at = undefined;
  slot.event_media_approved_by = undefined;
  slot.event_media_rejection_notes = undefined;
  await slot.save();

  await notifyAdminsOfMediaSubmission(slot, params.submittedByName || 'Social Worker');

  return {
    success: true,
    event_media_status: slot.event_media_status,
    photo_count: photos.length,
    video_count: videos.length,
  };
}

export async function approveFoodEventMedia(slotId: string, approvedByUserId: string) {
  const slot = await FoodSlot.findById(slotId);
  if (!slot) throw new AppError('Food slot not found', 404);

  const hasMedia = (slot.completion_photos?.length || 0) + (slot.completion_videos?.length || 0) > 0;
  if (!hasMedia) throw new AppError('No event media uploaded', 400);

  if (slot.event_media_status !== 'PENDING') {
    const isLegacyPending =
      !slot.event_media_status &&
      !slot.photos_shared_at &&
      hasMedia;
    if (!isLegacyPending) {
      throw new AppError('Only pending event media can be approved', 400);
    }
    slot.event_media_status = 'PENDING';
    if (!slot.event_media_submitted_at) {
      slot.event_media_submitted_at =
        slot.updated_at?.toISOString?.() || new Date().toISOString();
    }
  }

  slot.event_media_status = 'APPROVED';
  slot.event_media_approved_at = new Date().toISOString();
  slot.event_media_approved_by = approvedByUserId;
  slot.event_media_rejection_notes = undefined;
  await slot.save();

  const home = await Home.findById(slot.home_id).select('name').lean();
  const meal = mealLabel(slot);
  const adminIds = await getTrustAdminIds(slot.trust_id);
  const dedupeKey = `food_event_media_approved:${slot._id}`;
  await Promise.all(
    adminIds.map(async (userId) => {
      const existing = await Notification.findOne({ user_id: userId, dedupe_key: dedupeKey }).lean();
      if (existing) return;
      await Notification.create({
        user_id: userId,
        type: FOOD_EVENT_MEDIA_NOTIFY_TYPE,
        title: 'Event media approved — ready to send',
        message: `Approved media for ${meal} on ${slot.date} at ${home?.name || 'a project'} (${slot.donor_name || 'donor'}). Send to the donor from Reports.`,
        dedupe_key: dedupeKey,
        is_read: false,
      });
    }),
  );

  return { success: true, event_media_status: 'APPROVED' };
}

export async function rejectFoodEventMedia(
  slotId: string,
  params: { rejectedByUserId: string; notes?: string },
) {
  const slot = await FoodSlot.findById(slotId);
  if (!slot) throw new AppError('Food slot not found', 404);

  const hasMedia = (slot.completion_photos?.length || 0) + (slot.completion_videos?.length || 0) > 0;
  if (slot.event_media_status !== 'PENDING') {
    const isLegacyPending = !slot.event_media_status && !slot.photos_shared_at && hasMedia;
    if (!isLegacyPending) {
      throw new AppError('Only pending event media can be rejected', 400);
    }
    slot.event_media_status = 'PENDING';
    if (!slot.event_media_submitted_at) {
      slot.event_media_submitted_at =
        slot.updated_at?.toISOString?.() || new Date().toISOString();
    }
  }

  slot.event_media_status = 'REJECTED';
  slot.event_media_rejection_notes = params.notes?.trim() || 'Please re-upload clearer photos or videos.';
  slot.event_media_approved_at = undefined;
  slot.event_media_approved_by = undefined;
  await slot.save();

  const { getSocialWorkerIdsForHome } = await import('./projectAssignment.service.js');
  const workerIds = await getSocialWorkerIdsForHome(slot.home_id);
  const home = await Home.findById(slot.home_id).select('name').lean();
  const meal = mealLabel(slot);
  const message = `Event media for ${meal} on ${slot.date} at ${home?.name || 'your project'} was rejected. ${slot.event_media_rejection_notes}`;
  await Promise.all(
    workerIds.map(async (userId) => {
      await Notification.create({
        user_id: userId,
        type: 'food_event_media_rejected',
        title: 'Event media needs re-upload',
        message,
        is_read: false,
      });
    }),
  );

  return { success: true, event_media_status: 'REJECTED' };
}

export async function listPendingFoodEventMedia(trustId?: string) {
  const trustFilter = trustId ? { trust_id: trustId } : {};
  const slots = await FoodSlot.find({
    ...trustFilter,
    $or: [{ photos_shared_at: { $exists: false } }, { photos_shared_at: null }],
    $and: [
      {
        $or: [
          { event_media_status: 'PENDING' },
          {
            $and: [
              {
                $or: [
                  { event_media_status: { $exists: false } },
                  { event_media_status: null },
                ],
              },
              { completion_photos: { $exists: true, $not: { $size: 0 } } },
            ],
          },
        ],
      },
    ],
  })
    .sort({ event_media_submitted_at: -1, updated_at: -1 })
    .limit(100)
    .lean();
  const homeIds = [...new Set(slots.map((s) => s.home_id))];
  const homes = await Home.find({ _id: { $in: homeIds } }).select('name').lean();
  const homeMap = Object.fromEntries(homes.map((h) => [h._id, h.name]));

  return slots.map((slot) => ({
    id: slot._id,
    date: slot.date,
    time_slot: slot.time_slot,
    meal_type: slot.meal_type,
    donor_id: slot.donor_id,
    donor_name: slot.donor_name,
    home_id: slot.home_id,
    home_name: homeMap[slot.home_id] || 'Unknown',
    completion_photos: slot.completion_photos || [],
    completion_videos: slot.completion_videos || [],
    completion_notes: slot.completion_notes,
    event_media_submitted_at: slot.event_media_submitted_at,
  }));
}

export async function listApprovedFoodEventMediaAwaitingSend(trustId?: string) {
  const filter: Record<string, unknown> = {
    event_media_status: 'APPROVED',
    $or: [{ photos_shared_at: { $exists: false } }, { photos_shared_at: null }],
  };
  if (trustId) filter.trust_id = trustId;

  const slots = await FoodSlot.find(filter).sort({ event_media_approved_at: -1 }).limit(100).lean();
  const homeIds = [...new Set(slots.map((s) => s.home_id))];
  const homes = await Home.find({ _id: { $in: homeIds } }).select('name').lean();
  const homeMap = Object.fromEntries(homes.map((h) => [h._id, h.name]));

  return slots.map((slot) => ({
    id: slot._id,
    date: slot.date,
    time_slot: slot.time_slot,
    meal_type: slot.meal_type,
    donor_id: slot.donor_id,
    donor_name: slot.donor_name,
    home_id: slot.home_id,
    home_name: homeMap[slot.home_id] || 'Unknown',
    completion_photos: slot.completion_photos || [],
    completion_videos: slot.completion_videos || [],
    completion_notes: slot.completion_notes,
    event_media_approved_at: slot.event_media_approved_at,
  }));
}

function buildDefaultDonorMessage(donorName: string, meal: string, homeName: string, date: string): string {
  return `Dear ${donorName},\n\nThank you for sponsoring ${meal.toLowerCase()} at ${homeName} on ${date}. We are delighted to share these memories from the day with you.\n\nWith warm regards,\nM.S. Chellamuthu Trust & Research Foundation`;
}

/** Send approved event photos/videos to donor (email + WhatsApp). */
export async function sendFoodEventMediaToDonor(
  slotId: string,
  options?: { customMessage?: string },
) {
  const slot = await FoodSlot.findById(slotId);
  if (!slot) throw new AppError('Food slot not found', 404);
  if (!slot.donor_id) throw new AppError('No donor on this booking', 400);
  if (slot.event_media_status !== 'APPROVED') {
    throw new AppError('Event media must be approved before sending to the donor', 400);
  }
  if (slot.photos_shared_at) {
    throw new AppError('Event media was already sent to the donor', 400);
  }

  const photos = slot.completion_photos || [];
  const videos = slot.completion_videos || [];
  if (!photos.length && !videos.length) {
    throw new AppError('No photographs or videos to share', 400);
  }

  const [donor, home] = await Promise.all([
    User.findById(slot.donor_id).lean(),
    Home.findById(slot.home_id).lean(),
  ]);
  if (!donor) throw new AppError('Donor not found', 404);

  const meal = mealLabel(slot);
  const homeName = home?.name || 'our home';
  const portal = (env.clientUrl || '').split(',')[0]?.trim() || 'https://donor.msctrustcrm.com';
  const donorName = donor.name || 'Donor';
  const customMessage =
    options?.customMessage?.trim() ||
    buildDefaultDonorMessage(donorName, meal, homeName, slot.date);
  const customMessageHtml = customMessage
    .split('\n')
    .map((line) => (line.trim() ? `<p>${line.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>` : '<br/>'))
    .join('');

  const photoList = photos
    .map((url, i) => `<li><a href="${url}">Photo ${i + 1}</a></li>`)
    .join('');
  const videoList = videos
    .map((url, i) => `<li><a href="${url}">Video ${i + 1}</a></li>`)
    .join('');
  const mediaSections = [
    photos.length ? `<p><strong>Photos</strong></p><ul>${photoList}</ul>` : '',
    videos.length ? `<p><strong>Videos</strong></p><ul>${videoList}</ul>` : '',
  ].join('');

  const subject = `Memories from your ${meal} sponsorship at ${homeName}`;
  const html = `
    <div style="font-family: Rubik, Arial, sans-serif; color: #333; max-width: 560px;">
      <h2 style="color: #ff6633;">Memories from ${homeName}</h2>
      ${customMessageHtml}
      ${mediaSections}
      ${slot.completion_notes ? `<p><em>${slot.completion_notes}</em></p>` : ''}
      <p>You can also view your sponsorship history in the <a href="${portal}">donor portal</a>.</p>
    </div>
  `;

  const linkLines = [
    ...photos.map((url, i) => `Photo ${i + 1}: ${url}`),
    ...videos.map((url, i) => `Video ${i + 1}: ${url}`),
  ].join('\n');
  const text = `${customMessage}\n\n${linkLines}\n\nView in donor portal: ${portal}`;

  if (donor.email && !String(donor.email).endsWith('@walkin.local')) {
    try {
      await sendDonorEmail(donor.email, subject, html, text);
    } catch (err) {
      console.error('[food-event-media] email failed:', err);
    }
  }

  if (donor.phone) {
    const whatsappMessage = `${customMessage}\n\n${linkLines}\n\nView in donor portal: ${portal}`;
    try {
      await sendWhatsApp(donor.phone, whatsappMessage);
    } catch (err) {
      console.error('[food-event-media] WhatsApp failed:', err);
    }
  }

  await notifyDonor({
    userId: slot.donor_id,
    type: DONOR_NOTIFICATION_TYPES.WORK_COMPLETED,
    title: 'Event photos & videos shared',
    message: customMessage.split('\n').find((l) => l.trim())?.slice(0, 200) ||
      `Photos and videos from your ${meal.toLowerCase()} at ${homeName} on ${slot.date} are ready to view.`,
    dedupeKey: `food_event_media_shared:${slotId}`,
  });

  slot.photos_shared_at = new Date().toISOString();
  if (!slot.report_sent_at) {
    slot.report_sent_at = slot.photos_shared_at;
  }
  await slot.save();

  return {
    success: true,
    photo_count: photos.length,
    video_count: videos.length,
    photos_shared_at: slot.photos_shared_at,
  };
}
