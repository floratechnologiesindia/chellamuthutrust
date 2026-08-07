/** Food slots with event media must use the approval workflow, not legacy Send to Donor. */
export function isFoodSlotLegacySendBlocked(item: {
  type?: string;
  completion_photos?: string[] | null;
  completion_videos?: string[] | null;
  event_media_status?: string | null;
}): boolean {
  if (item.type && item.type !== 'food_slot') return false;
  const photoCount = item.completion_photos?.length || 0;
  const videoCount = item.completion_videos?.length || 0;
  if (photoCount + videoCount > 0) return true;
  if (item.event_media_status) return true;
  return false;
}

export function foodSlotLegacySendBlockReason(): string {
  return 'Food event photos/videos must be sent via the Event Media review panel (Reports → Work Done).';
}

export function defaultFoodEventDonorMessage(params: {
  donorName: string;
  mealLabel: string;
  homeName: string;
  date: string;
}): string {
  return `Dear ${params.donorName},\n\nThank you for sponsoring ${params.mealLabel.toLowerCase()} at ${params.homeName} on ${params.date}. We are delighted to share these memories from the day with you.\n\nWith warm regards,\nM.S. Chellamuthu Trust & Research Foundation`;
}
