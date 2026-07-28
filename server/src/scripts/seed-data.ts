/** Reference and bootstrap data for MongoDB seeding */

export const SEED_PASSWORD = 'Chellamuthu@2026';

export const CATEGORIES = [
  { key: 'food', label: 'Food & Nutrition', description: 'Daily meals, special dietary needs, groceries', icon: 'utensils' },
  { key: 'education', label: 'Education', description: 'School fees, books, supplies, tutoring', icon: 'graduation-cap' },
  { key: 'medical', label: 'Medical & Health', description: 'Healthcare, medicines, medical equipment', icon: 'heart-pulse' },
  { key: 'clothing', label: 'Clothing', description: 'Clothes, footwear, uniforms', icon: 'shirt' },
  { key: 'infrastructure', label: 'Infrastructure', description: 'Building repairs, furniture, equipment', icon: 'building' },
  { key: 'utilities', label: 'Utilities', description: 'Electricity, water, internet bills', icon: 'zap' },
  { key: 'recreation', label: 'Recreation', description: 'Sports, entertainment, celebrations', icon: 'gamepad-2' },
  { key: 'other', label: 'Other', description: 'Miscellaneous needs', icon: 'more-horizontal' },
] as const;

export const FOOD_SUBCATEGORIES = [
  { label: 'Breakfast', description: 'Morning meal sponsorship' },
  { label: 'Lunch', description: 'Afternoon meal sponsorship' },
  { label: 'Dinner', description: 'Evening meal sponsorship' },
  { label: 'Snacks & Refreshments', description: 'Snacks and refreshments' },
];

export const HOME_TYPES = [
  { key: 'children_home', label: 'Children Home', description: 'Home for children', icon: 'Baby' },
  { key: 'old_age_home', label: 'Old Age Home', description: 'Home for elderly residents', icon: 'Heart' },
  { key: 'mixed', label: 'Mixed', description: 'Home for both children and elderly', icon: 'Users' },
  { key: 'special_children', label: 'Special Children', description: 'Home for children with special needs', icon: 'Heart' },
  { key: 'others', label: 'Others', description: 'Other types of homes', icon: 'Home' },
];

export const DONOR_CATEGORIES = [
  { key: 'monthly', label: 'Monthly Donor', description: 'Donors who contribute on a monthly basis', color: 'green' },
  { key: 'yearly', label: 'Yearly Donor', description: 'Donors who contribute annually', color: 'purple' },
  { key: 'public', label: 'Public Donor', description: 'General public donors', color: 'orange' },
  { key: 'csr', label: 'CSR', description: 'Corporate Social Responsibility donors', color: 'red' },
];

export const RELIGIONS = [
  { key: 'hinduism', label: 'Hinduism' },
  { key: 'islam', label: 'Islam' },
  { key: 'christianity', label: 'Christianity' },
  { key: 'sikhism', label: 'Sikhism' },
  { key: 'buddhism', label: 'Buddhism' },
  { key: 'jainism', label: 'Jainism' },
  { key: 'other', label: 'Other' },
];

export const FOOD_SLOT_PRICING = [
  { time_slot: 'MORNING', label: 'Breakfast', price: 50, description: 'Morning breakfast sponsorship' },
  { time_slot: 'AFTERNOON', label: 'Lunch', price: 75, description: 'Afternoon lunch sponsorship' },
  { time_slot: 'EVENING', label: 'Dinner', price: 75, description: 'Evening dinner sponsorship' },
  { time_slot: 'REFRESHMENTS', label: 'Refreshments', price: 30, description: 'Refreshments and snacks sponsorship' },
  { time_slot: 'OUTSIDE_FOOD', label: 'Outside Food', price: 0, description: 'Donor brings and serves food directly (tracked, no fee)' },
];

export const TRUST = {
  name: 'M.S. Chellamuthu Trust & Research Foundation',
  registration_number: 'TN/Trust/1983',
  description: 'Promoting mental health and supporting children\'s homes and old age care through donations and sponsorships since 1983.',
  address: '16-17, Kennet Cross Road, Simmakkal',
  city: 'Madurai',
  state: 'Tamil Nadu',
  country: 'India',
  pincode: '625001',
  contact_phone: '0452-2530851',
  contact_email: 'mschellamuthutrust@gmail.com',
};

export const HOMES = [
  {
    name: 'Sunshine Children Home',
    type: 'children_home',
    description: 'A nurturing home providing care, education, and support for children in need.',
    address: 'Madurai',
    city: 'Madurai',
    state: 'Tamil Nadu',
    pincode: '625001',
    capacity_children_male: 25,
    capacity_children_female: 25,
    year_established: 1995,
  },
  {
    name: 'Home for Mentally Ill - Madurai',
    type: 'others',
    description: 'Residential care and rehabilitation for adults with mental illness.',
    address: 'Madurai',
    city: 'Madurai',
    state: 'Tamil Nadu',
    pincode: '625001',
    capacity_elderly_male: 30,
    capacity_elderly_female: 20,
    year_established: 1983,
  },
  {
    name: 'AAKAASH - Special School',
    type: 'special_children',
    description: 'Special education and care for children with developmental needs.',
    address: 'Madurai',
    city: 'Madurai',
    state: 'Tamil Nadu',
    pincode: '625001',
    capacity_children_male: 15,
    capacity_children_female: 15,
    year_established: 2005,
  },
] as const;

/** Dev/staging accounts — change passwords before production */
export const SEED_USERS = [
  { email: 'superadmin@chellamuthu.local', name: 'Super Admin', role: 'super_admin' as const },
  { email: 'admin@chellamuthu.local', name: 'Trust Admin', role: 'admin' as const, assignTrust: true },
  { email: 'finance@chellamuthu.local', name: 'Finance Officer', role: 'finance' as const, assignTrust: true },
  { email: 'employee@chellamuthu.local', name: 'Staff Member', role: 'employee' as const, assignTrust: true },
  { email: 'warden@chellamuthu.local', name: 'Priya Lakshmi', role: 'warden' as const, assignHome: 0 },
  {
    email: 'donor@chellamuthu.local',
    name: 'Sample Donor',
    role: 'donor' as const,
    phone: '9876543210',
    donor_category: 'monthly' as const,
    city: 'Madurai',
    state: 'Tamil Nadu',
  },
  {
    email: 'donor2@chellamuthu.local',
    name: 'Priya Krishnan',
    role: 'donor' as const,
    phone: '9876543211',
    donor_category: 'yearly' as const,
    city: 'Chennai',
    state: 'Tamil Nadu',
  },
  {
    email: 'donor3@chellamuthu.local',
    name: 'Rajesh Kumar',
    role: 'donor' as const,
    phone: '9876543212',
    donor_category: 'csr' as const,
    organization: 'TechCorp India Pvt Ltd',
    city: 'Bengaluru',
    state: 'Karnataka',
  },
];

export const EXTRA_SUBCATEGORIES: Record<string, { label: string; description?: string }[]> = {
  education: [
    { label: 'School Fees', description: 'Tuition and school fees' },
    { label: 'Books & Supplies', description: 'Textbooks and stationery' },
    { label: 'Tutoring', description: 'Extra coaching and tutoring' },
  ],
  medical: [
    { label: 'Medicines', description: 'Prescription and OTC medicines' },
    { label: 'Medical Equipment', description: 'Wheelchairs, hearing aids, etc.' },
    { label: 'Health Check-ups', description: 'Routine and specialist visits' },
  ],
  clothing: [
    { label: 'Uniforms', description: 'School and home uniforms' },
    { label: 'Seasonal Clothing', description: 'Winter wear and rain gear' },
  ],
  infrastructure: [
    { label: 'Building Repairs', description: 'Roof, plumbing, electrical repairs' },
    { label: 'Furniture', description: 'Beds, tables, chairs' },
  ],
  utilities: [
    { label: 'Electricity', description: 'Power bills' },
    { label: 'Water', description: 'Water supply bills' },
  ],
  recreation: [
    { label: 'Sports Equipment', description: 'Balls, nets, indoor games' },
    { label: 'Celebrations', description: 'Festival and birthday events' },
  ],
  other: [
    { label: 'General', description: 'Miscellaneous needs' },
  ],
};

export const SEED_RESIDENTS = [
  { homeIndex: 0, name: 'Arun Kumar', age: 12, gender: 'male', category: 'child' },
  { homeIndex: 0, name: 'Meena Devi', age: 10, gender: 'female', category: 'child' },
  { homeIndex: 0, name: 'Karthik S', age: 14, gender: 'male', category: 'child', special_needs: 'Mild learning difficulty' },
  { homeIndex: 0, name: 'Lakshmi P', age: 9, gender: 'female', category: 'child' },
  { homeIndex: 0, name: 'Suresh R', age: 11, gender: 'male', category: 'child' },
  { homeIndex: 0, name: 'Divya M', age: 13, gender: 'female', category: 'child' },
  { homeIndex: 1, name: 'Ramasamy', age: 58, gender: 'male', category: 'elderly' },
  { homeIndex: 1, name: 'Kamala', age: 62, gender: 'female', category: 'elderly' },
  { homeIndex: 1, name: 'Murugan', age: 45, gender: 'male', category: 'adult', special_needs: 'Schizophrenia — stable' },
  { homeIndex: 1, name: 'Selvi', age: 50, gender: 'female', category: 'adult' },
  { homeIndex: 1, name: 'Palanisamy', age: 55, gender: 'male', category: 'elderly' },
  { homeIndex: 2, name: 'Vignesh', age: 8, gender: 'male', category: 'special_child', special_needs: 'Autism spectrum' },
  { homeIndex: 2, name: 'Anitha', age: 10, gender: 'female', category: 'special_child', special_needs: 'Down syndrome' },
  { homeIndex: 2, name: 'Bala', age: 7, gender: 'male', category: 'special_child' },
  { homeIndex: 2, name: 'Deepa', age: 9, gender: 'female', category: 'special_child' },
];

export type NeedSeedTemplate = {
  homeIndex: number;
  categoryKey: string;
  subcategoryLabel?: string;
  daysFromNow: number;
  quantity: number;
  unit: string;
  help_mode: 'ONE_TIME' | 'RECURRING';
  description: string;
  status: 'OPEN' | 'PARTIAL' | 'FULLY_SPONSORED';
  donation_mode: 'MONEY_ONLY' | 'PRODUCT_ONLY' | 'BOTH';
  required_amount?: number;
  collected_amount?: number;
  required_product_qty?: number;
  fulfilled_product_qty?: number;
  product_name?: string;
  product_unit?: string;
  max_sponsors_allowed?: number;
  current_sponsors_count?: number;
};

export const NEED_TEMPLATES: NeedSeedTemplate[] = [
  {
    homeIndex: 0, categoryKey: 'education', subcategoryLabel: 'Books & Supplies', daysFromNow: 7,
    quantity: 25, unit: 'sets', help_mode: 'ONE_TIME',
    description: 'Notebooks, pens, and geometry sets for the new academic term.',
    status: 'OPEN', donation_mode: 'PRODUCT_ONLY', required_product_qty: 25, fulfilled_product_qty: 0,
    product_name: 'School supply kit', product_unit: 'set',
  },
  {
    homeIndex: 0, categoryKey: 'medical', subcategoryLabel: 'Medicines', daysFromNow: 10,
    quantity: 1, unit: 'month supply', help_mode: 'RECURRING',
    description: 'Monthly psychiatric medicines for residents under care.',
    status: 'PARTIAL', donation_mode: 'MONEY_ONLY', required_amount: 15000, collected_amount: 7500,
    max_sponsors_allowed: 2, current_sponsors_count: 1,
  },
  {
    homeIndex: 0, categoryKey: 'clothing', subcategoryLabel: 'Uniforms', daysFromNow: 14,
    quantity: 30, unit: 'sets', help_mode: 'ONE_TIME',
    description: 'School uniforms for children ahead of the new term.',
    status: 'OPEN', donation_mode: 'BOTH', required_amount: 12000, collected_amount: 0,
    required_product_qty: 30, fulfilled_product_qty: 0, product_name: 'School uniform', product_unit: 'set',
  },
  {
    homeIndex: 1, categoryKey: 'medical', subcategoryLabel: 'Health Check-ups', daysFromNow: 5,
    quantity: 50, unit: 'residents', help_mode: 'ONE_TIME',
    description: 'Annual health screening camp for all residents.',
    status: 'OPEN', donation_mode: 'MONEY_ONLY', required_amount: 25000, collected_amount: 0,
  },
  {
    homeIndex: 1, categoryKey: 'infrastructure', subcategoryLabel: 'Building Repairs', daysFromNow: 21,
    quantity: 1, unit: 'project', help_mode: 'ONE_TIME',
    description: 'Repair leaking roof in the west wing dormitory.',
    status: 'OPEN', donation_mode: 'MONEY_ONLY', required_amount: 85000, collected_amount: 0,
  },
  {
    homeIndex: 1, categoryKey: 'utilities', subcategoryLabel: 'Electricity', daysFromNow: 3,
    quantity: 1, unit: 'bill', help_mode: 'ONE_TIME',
    description: 'Monthly electricity bill for the Madurai residential facility.',
    status: 'PARTIAL', donation_mode: 'MONEY_ONLY', required_amount: 18000, collected_amount: 10000,
  },
  {
    homeIndex: 2, categoryKey: 'education', subcategoryLabel: 'Tutoring', daysFromNow: 12,
    quantity: 15, unit: 'children', help_mode: 'RECURRING',
    description: 'Special education tutoring sessions for AAKAASH students.',
    status: 'OPEN', donation_mode: 'MONEY_ONLY', required_amount: 20000, collected_amount: 0,
  },
  {
    homeIndex: 2, categoryKey: 'recreation', subcategoryLabel: 'Sports Equipment', daysFromNow: 18,
    quantity: 1, unit: 'set', help_mode: 'ONE_TIME',
    description: 'Indoor sensory play equipment for the therapy room.',
    status: 'OPEN', donation_mode: 'PRODUCT_ONLY', required_product_qty: 1, fulfilled_product_qty: 0,
    product_name: 'Sensory play kit', product_unit: 'set',
  },
  {
    homeIndex: 0, categoryKey: 'food', subcategoryLabel: 'Lunch', daysFromNow: 8,
    quantity: 50, unit: 'meals', help_mode: 'ONE_TIME',
    description: 'Special feast lunch for Pongal celebration.',
    status: 'OPEN', donation_mode: 'MONEY_ONLY', required_amount: 5000, collected_amount: 0,
  },
  {
    homeIndex: 2, categoryKey: 'other', subcategoryLabel: 'General', daysFromNow: 30,
    quantity: 1, unit: 'project', help_mode: 'ONE_TIME',
    description: 'Transportation for educational field trip to Gandhi Museum.',
    status: 'OPEN', donation_mode: 'MONEY_ONLY', required_amount: 6000, collected_amount: 0,
  },
  {
    homeIndex: 1, categoryKey: 'clothing', subcategoryLabel: 'Seasonal Clothing', daysFromNow: 25,
    quantity: 40, unit: 'pieces', help_mode: 'ONE_TIME',
    description: 'Winter blankets and shawls for elderly residents.',
    status: 'FULLY_SPONSORED', donation_mode: 'PRODUCT_ONLY', required_product_qty: 40, fulfilled_product_qty: 40,
    product_name: 'Blanket', product_unit: 'piece', max_sponsors_allowed: 1, current_sponsors_count: 1,
  },
];

export const TASK_TEMPLATES = [
  {
    title: 'Prepare monthly donor report',
    description: 'Compile donation summary for Sunshine Children Home and send to admin.',
    assigneeEmail: 'employee@chellamuthu.local',
    daysUntilDue: 5,
    priority: 'high',
    status: 'OPEN',
    homeIndex: 0,
  },
  {
    title: 'Verify food sponsorship deliveries',
    description: 'Confirm booked meal slots for the upcoming week and update completion status.',
    assigneeEmail: 'warden@chellamuthu.local',
    daysUntilDue: 2,
    priority: 'medium',
    status: 'IN_PROGRESS',
    homeIndex: 0,
  },
  {
    title: 'Review pending need approvals',
    description: 'Approve infrastructure repair need submitted by social worker.',
    assigneeEmail: 'admin@chellamuthu.local',
    daysUntilDue: -1,
    priority: 'high',
    status: 'OPEN',
  },
  {
    title: 'Reconcile bank transactions',
    description: 'Match last week UPI credits with donor pledges.',
    assigneeEmail: 'finance@chellamuthu.local',
    daysUntilDue: 3,
    priority: 'medium',
    status: 'IN_PROGRESS',
  },
  {
    title: 'Upload completion photos for clothing drive',
    description: 'Add photos from blanket distribution to the need record.',
    assigneeEmail: 'warden@chellamuthu.local',
    daysUntilDue: -3,
    priority: 'low',
    status: 'COMPLETED',
    homeIndex: 1,
  },
];

export const NOTIFICATION_TEMPLATES = [
  {
    donorEmail: 'donor@chellamuthu.local',
    type: 'donation',
    title: 'Thank you for your sponsorship',
    message: 'Your lunch sponsorship for Sunshine Children Home on the 15th has been confirmed.',
    is_read: false,
  },
  {
    donorEmail: 'donor@chellamuthu.local',
    type: 'reminder',
    title: 'Upcoming recurring donation',
    message: 'Your monthly medical fund contribution of ₹2,500 is due in 5 days.',
    is_read: false,
  },
  {
    donorEmail: 'donor@chellamuthu.local',
    type: 'update',
    title: 'Need fulfilled — thank you!',
    message: 'The school supplies need you sponsored has been fully delivered to the home.',
    is_read: true,
  },
];

export const KIND_DONATION_TEMPLATES = [
  {
    homeIndex: 0,
    donorEmail: 'donor2@chellamuthu.local',
    item_type: 'Books',
    item_description: '50 storybooks and picture books for the children library',
    quantity: 50,
    estimated_value: 8000,
    daysAgo: 14,
  },
  {
    homeIndex: 1,
    donor_name: 'Local Rotary Club',
    item_type: 'Medical Supplies',
    item_description: 'First aid kits and hygiene supplies',
    quantity: 10,
    estimated_value: 12000,
    daysAgo: 7,
  },
  {
    homeIndex: 2,
    donorEmail: 'donor3@chellamuthu.local',
    item_type: 'Therapy Equipment',
    item_description: 'Sensory balls and therapy mats',
    quantity: 5,
    estimated_value: 15000,
    daysAgo: 21,
  },
  {
    homeIndex: 0,
    donor_name: 'Walk-in Donor',
    item_type: 'Groceries',
    item_description: 'Rice, dal, oil, and vegetables for one week',
    quantity: 1,
    estimated_value: 6000,
    daysAgo: 3,
  },
];

export const CORPUS_TEMPLATES = [
  {
    donorEmail: 'donor3@chellamuthu.local',
    amount: 100000,
    purpose: 'General corpus fund — infrastructure reserve',
    daysAgo: 45,
  },
  {
    donorEmail: 'donor2@chellamuthu.local',
    amount: 50000,
    purpose: 'Education endowment',
    daysAgo: 90,
  },
  {
    donor_name: 'Anonymous Benefactor',
    amount: 250000,
    purpose: 'Medical care corpus',
    daysAgo: 120,
  },
];

export const BANK_TRANSACTION_TEMPLATES = [
  { daysAgo: 1, description: 'UPI/RAZORPAY — Sample Donor', amount: 2500, type: 'credit', status: 'pending' },
  { daysAgo: 2, description: 'NEFT — Priya Krishnan', amount: 10000, type: 'credit', status: 'pending' },
  { daysAgo: 3, description: 'UPI — Rajesh Kumar CSR', amount: 50000, type: 'credit', status: 'reconciled', donorEmail: 'donor3@chellamuthu.local' },
  { daysAgo: 5, description: 'ATM Withdrawal — Petty cash', amount: 5000, type: 'debit', status: 'reconciled' },
  { daysAgo: 7, description: 'NEFT — TechCorp India', amount: 75000, type: 'credit', status: 'reconciled', donorEmail: 'donor3@chellamuthu.local' },
  { daysAgo: 10, description: 'UPI — Sample Donor', amount: 1500, type: 'credit', status: 'reconciled', donorEmail: 'donor@chellamuthu.local' },
  { daysAgo: 12, description: 'Cheque deposit — Walk-in', amount: 3000, type: 'credit', status: 'pending' },
  { daysAgo: 15, description: 'Electricity bill payment', amount: 18000, type: 'debit', status: 'reconciled' },
];
