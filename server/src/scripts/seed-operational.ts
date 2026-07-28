import { Resident } from '../models/Core.js';
import {
  Subcategory, Need, Donation, DonationPayment, Task, Notification,
} from '../models/Operations.js';
import {
  KindDonation, CorpusFundContribution, FoodSlot, FoodSlotPricing, BankTransaction,
} from '../models/Finance.js';
import {
  SEED_RESIDENTS, EXTRA_SUBCATEGORIES, NEED_TEMPLATES, TASK_TEMPLATES,
  NOTIFICATION_TEMPLATES, KIND_DONATION_TEMPLATES, CORPUS_TEMPLATES, BANK_TRANSACTION_TEMPLATES,
} from './seed-data.js';

type IdDoc = { _id: string };
type CategoryDoc = IdDoc & { key: string };
type HomeDoc = IdDoc & { trust_id: string };

function dateStr(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
}

function userIdByEmail(users: Map<string, IdDoc>, email: string): string | undefined {
  return users.get(email)?._id;
}

export async function seedExtraSubcategories(categories: CategoryDoc[]) {
  let count = 0;
  for (const cat of categories) {
    const subs = EXTRA_SUBCATEGORIES[cat.key];
    if (!subs?.length) continue;
    const created = await Subcategory.insertMany(
      subs.map((s, i) => ({
        category_id: cat._id,
        label: s.label,
        description: s.description,
        is_active: true,
        sort_order: i,
      })),
    );
    count += created.length;
  }
  return count;
}

export async function seedResidents(homes: HomeDoc[]) {
  const docs = SEED_RESIDENTS.map((r) => ({
    home_id: homes[r.homeIndex]._id,
    name: r.name,
    age: r.age,
    gender: r.gender,
    category: r.category,
    special_needs: r.special_needs,
    status: 'active',
  }));
  const residents = await Resident.insertMany(docs);
  return residents.length;
}

export async function seedNeeds(
  homes: HomeDoc[],
  trustId: string,
  categories: CategoryDoc[],
  adminId: string,
) {
  const categoryByKey = Object.fromEntries(categories.map((c) => [c.key, c]));
  const subcategories = await Subcategory.find().lean();
  const subByLabel = Object.fromEntries(
    subcategories.map((s) => [`${s.category_id}:${s.label}`, s._id]),
  );

  const needs = await Need.insertMany(
    NEED_TEMPLATES.map((t) => {
      const category = categoryByKey[t.categoryKey];
      const subId = t.subcategoryLabel
        ? subByLabel[`${category._id}:${t.subcategoryLabel}`]
        : undefined;
      return {
        home_id: homes[t.homeIndex]._id,
        trust_id: trustId,
        category_id: category._id,
        subcategory_id: subId,
        date: dateStr(t.daysFromNow),
        quantity: t.quantity,
        unit: t.unit,
        help_mode: t.help_mode,
        description: t.description,
        status: t.status,
        donation_mode: t.donation_mode,
        required_amount: t.required_amount,
        collected_amount: t.collected_amount ?? 0,
        required_product_qty: t.required_product_qty,
        fulfilled_product_qty: t.fulfilled_product_qty ?? 0,
        product_name: t.product_name,
        product_unit: t.product_unit,
        max_sponsors_allowed: t.max_sponsors_allowed ?? 1,
        current_sponsors_count: t.current_sponsors_count ?? 0,
        approval_status: 'APPROVED',
        created_by: adminId,
      };
    }),
  );
  return needs;
}

export async function seedFoodSlots(
  homes: HomeDoc[],
  trustId: string,
  donorId: string,
  pricing: { time_slot: string; price: number }[],
) {
  const priceMap = Object.fromEntries(pricing.map((p) => [p.time_slot, p.price]));
  const timeSlots = ['MORNING', 'AFTERNOON', 'EVENING'] as const;
  const slots: Record<string, unknown>[] = [];

  for (const home of homes) {
    for (let day = 1; day <= 21; day++) {
      const date = dateStr(day);
      for (const timeSlot of timeSlots) {
        let status = 'NEED';
        let donor_id: string | undefined;
        let amount = priceMap[timeSlot] ?? 50;

        // Sprinkle booked and paid slots for demo variety
        const seed = day + timeSlot.length + home._id.length;
        if (seed % 11 === 0) {
          status = 'PAID';
          donor_id = donorId;
        } else if (seed % 7 === 0) {
          status = 'BOOKED';
          donor_id = donorId;
        }

        slots.push({
          home_id: home._id,
          trust_id: trustId,
          date,
          time_slot: timeSlot,
          status,
          amount,
          donor_id,
          meal_type: timeSlot === 'MORNING' ? 'Breakfast' : timeSlot === 'AFTERNOON' ? 'Lunch' : 'Dinner',
        });
      }
    }
  }

  const created = await FoodSlot.insertMany(slots);
  return created.length;
}

export async function seedDonations(
  needs: IdDoc[],
  homes: HomeDoc[],
  trustId: string,
  users: Map<string, IdDoc>,
) {
  const donor = users.get('donor@chellamuthu.local')!;
  const donor2 = users.get('donor2@chellamuthu.local')!;
  const openNeeds = needs.slice(0, 4);

  const donations = await Donation.insertMany([
    {
      donor_id: donor._id,
      need_id: openNeeds[0]?._id,
      trust_id: trustId,
      home_id: homes[0]._id,
      sponsorship_type: 'ONE_TIME',
      amount_pledged: 5000,
      payment_mode: 'online',
      start_date: dateStr(-10),
      status: 'ACTIVE',
      occasion_type: 'birthday',
      occasion_note: 'Birthday sponsorship',
    },
    {
      donor_id: donor._id,
      need_id: openNeeds[1]?._id,
      trust_id: trustId,
      home_id: homes[0]._id,
      sponsorship_type: 'RECURRING',
      amount_pledged: 2500,
      payment_mode: 'online',
      start_date: dateStr(-60),
      next_due_date: dateStr(5),
      last_paid_date: dateStr(-5),
      status: 'ACTIVE',
    },
    {
      donor_id: donor2._id,
      need_id: openNeeds[2]?._id,
      trust_id: trustId,
      home_id: homes[1]._id,
      sponsorship_type: 'ONE_TIME',
      amount_pledged: 10000,
      payment_mode: 'bank_transfer',
      start_date: dateStr(-30),
      last_paid_date: dateStr(-30),
      status: 'COMPLETED',
    },
    {
      donor_id: donor._id,
      trust_id: trustId,
      home_id: homes[0]._id,
      sponsorship_type: 'ONE_TIME',
      amount_pledged: 1500,
      payment_mode: 'cash',
      start_date: dateStr(-3),
      status: 'PLEDGED',
      occasion_type: 'festival',
      occasion_note: 'Pongal feast contribution',
    },
  ]);

  await DonationPayment.insertMany([
    {
      donation_id: donations[0]._id,
      amount: 5000,
      payment_date: dateStr(-10),
      payment_reference: 'RZP-SEED-001',
      notes: 'Razorpay payment',
    },
    {
      donation_id: donations[1]._id,
      amount: 2500,
      payment_date: dateStr(-5),
      payment_reference: 'RZP-SEED-002',
    },
    {
      donation_id: donations[2]._id,
      amount: 10000,
      payment_date: dateStr(-30),
      payment_reference: 'NEFT-SEED-003',
    },
  ]);

  return donations.length;
}

export async function seedTasks(
  homes: HomeDoc[],
  trustId: string,
  users: Map<string, IdDoc>,
) {
  const admin = users.get('admin@chellamuthu.local')!;

  const tasks = await Task.insertMany(
    TASK_TEMPLATES.map((t) => {
      const assignee = users.get(t.assigneeEmail);
      if (!assignee) throw new Error(`Missing user for task: ${t.assigneeEmail}`);
      return {
        title: t.title,
        description: t.description,
        assigned_by: admin._id,
        assigned_to: assignee._id,
        trust_id: trustId,
        home_id: t.homeIndex !== undefined ? homes[t.homeIndex]._id : undefined,
        priority: t.priority,
        status: t.status,
        due_date: dateStr(t.daysUntilDue),
        completed_at: t.status === 'COMPLETED' ? new Date() : undefined,
      };
    }),
  );
  return tasks.length;
}

export async function seedNotifications(users: Map<string, IdDoc>) {
  const docs = NOTIFICATION_TEMPLATES.map((n) => {
    const user = users.get(n.donorEmail);
    if (!user) throw new Error(`Missing donor: ${n.donorEmail}`);
    return {
      user_id: user._id,
      type: n.type,
      title: n.title,
      message: n.message,
      is_read: n.is_read,
    };
  });
  const notifications = await Notification.insertMany(docs);
  return notifications.length;
}

export async function seedKindDonations(
  homes: HomeDoc[],
  trustId: string,
  users: Map<string, IdDoc>,
) {
  const docs = KIND_DONATION_TEMPLATES.map((k) => ({
    donor_id: k.donorEmail ? userIdByEmail(users, k.donorEmail) : undefined,
    donor_name: k.donor_name,
    trust_id: trustId,
    home_id: homes[k.homeIndex]._id,
    item_type: k.item_type,
    item_description: k.item_description,
    quantity: k.quantity,
    estimated_value: k.estimated_value,
    received_date: dateStr(-k.daysAgo),
  }));
  const items = await KindDonation.insertMany(docs);
  return items.length;
}

export async function seedCorpusFund(trustId: string, users: Map<string, IdDoc>) {
  const docs = CORPUS_TEMPLATES.map((c) => ({
    donor_id: c.donorEmail ? userIdByEmail(users, c.donorEmail) : undefined,
    donor_name: c.donor_name,
    trust_id: trustId,
    amount: c.amount,
    contribution_date: dateStr(-c.daysAgo),
    purpose: c.purpose,
  }));
  const items = await CorpusFundContribution.insertMany(docs);
  return items.length;
}

export async function seedBankTransactions(
  trustId: string,
  users: Map<string, IdDoc>,
  categories: CategoryDoc[],
) {
  const medicalCat = categories.find((c) => c.key === 'medical');
  const docs = BANK_TRANSACTION_TEMPLATES.map((t) => ({
    trust_id: trustId,
    transaction_date: dateStr(-t.daysAgo),
    description: t.description,
    amount: t.amount,
    transaction_type: t.type,
    reference_number: `TXN-SEED-${Math.abs(t.daysAgo)}`,
    assigned_donor_id: t.donorEmail ? userIdByEmail(users, t.donorEmail) : undefined,
    assigned_category_id: t.type === 'debit' && t.description.includes('Electricity')
      ? medicalCat?._id
      : undefined,
    reconciliation_status: t.status,
  }));
  const items = await BankTransaction.insertMany(docs);
  return items.length;
}
