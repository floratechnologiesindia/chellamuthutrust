import { FoodTimeSlot } from '@/hooks/useFoodSlots';

export interface FoodSlotRazorpayPayRequest {
  amount: number;
  food_slot_id?: string;
  home_id: string;
  trust_id: string;
  date: string;
  time_slot: FoodTimeSlot;
  donorName: string;
  donorEmail: string;
  donorPhone?: string;
  slotLabel: string;
  homeName: string;
  occasion_type?: string;
  occasion_note?: string;
  pan_number?: string;
  address?: string;
  recurring_frequency?: string;
  donation_for?: string;
  event_date?: string;
  donor_board_name?: string;
  meal_type?: string;
  reason?: string;
  sponsor_for?: string;
  donate_on_behalf_of?: string;
  include_refreshment?: boolean;
}
