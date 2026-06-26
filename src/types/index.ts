export type UserRole = 'super_admin' | 'admin' | 'employee' | 'warden' | 'donor' | 'finance';
export type UserStatus = 'active' | 'inactive';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Trust {
  id: string;
  name: string;
  registration_number?: string;
  description: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  contact_phone: string;
  contact_email: string;
  image_url?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type HomeType = 'children_home' | 'old_age_home' | 'mixed' | 'others' | 'special_children';

export interface Home {
  id: string;
  trust_id: string;
  trust?: Trust;
  name: string;
  type: HomeType;
  description: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  capacity_children_male?: number;
  capacity_children_female?: number;
  capacity_elderly_male?: number;
  capacity_elderly_female?: number;
  primary_warden_id?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export type ResidentCategory = 'child' | 'old_age' | 'others';
export type ResidentStatus = 'active' | 'moved_out' | 'deceased';

export interface Resident {
  id: string;
  home_id: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  category: ResidentCategory;
  special_needs?: string;
  photo_url?: string;
  status: ResidentStatus;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  key: string;
  label: string;
  description: string;
  icon?: string;
}

export interface Subcategory {
  id: string;
  category_id: string;
  label: string;
  description?: string;
  is_active: boolean;
}

export type NeedStatus = 'OPEN' | 'PARTIAL' | 'FULLY_SPONSORED' | 'COMPLETED' | 'CANCELLED';
export type HelpMode = 'ONE_TIME' | 'RECURRING';
export type RecurringFrequency = 'monthly' | 'quarterly' | 'yearly' | 'none';

export interface Need {
  id: string;
  home_id: string;
  home?: Home;
  trust_id: string;
  trust?: Trust;
  category_id: string;
  category?: Category;
  subcategory_id?: string;
  subcategory?: Subcategory;
  date: string;
  quantity: number;
  unit: string;
  help_mode: HelpMode;
  recurring_frequency: RecurringFrequency;
  recurring_end_date?: string;
  description: string;
  max_sponsors_allowed: number;
  current_sponsors_count: number;
  status: NeedStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type DonationType = 'ONE_TIME' | 'RECURRING';
export type PaymentMode = 'online' | 'offline' | 'in_kind';
export type DonationStatus = 'PLEDGED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE';
export type OccasionType = 'birthday' | 'ancestor_remembrance' | 'festival' | 'other';

export interface Donation {
  id: string;
  donor_id: string;
  donor?: User;
  need_id: string;
  need?: Need;
  trust_id: string;
  home_id: string;
  sponsorship_type: DonationType;
  amount_pledged: number;
  payment_mode: PaymentMode;
  in_kind_details?: string;
  start_date: string;
  next_due_date?: string;
  last_paid_date?: string;
  status: DonationStatus;
  occasion_type?: OccasionType;
  occasion_note?: string;
  created_at: string;
  updated_at: string;
}

export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Task {
  id: string;
  title: string;
  description: string;
  assigned_by: string;
  assigned_to: string;
  trust_id?: string;
  home_id?: string;
  related_need_id?: string;
  related_donor_id?: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskActivity {
  id: string;
  task_id: string;
  task_title: string;
  user_id: string;
  user_name: string;
  action: 'created' | 'started' | 'completed' | 'cancelled' | 'reassigned' | 'updated';
  old_status?: TaskStatus;
  new_status?: TaskStatus;
  timestamp: string;
}

export interface EmployeeStats {
  user_id: string;
  user_name: string;
  user_role: UserRole;
  avatar_url?: string;
  total_assigned: number;
  completed: number;
  in_progress: number;
  overdue: number;
  on_time_completions: number;
  avg_completion_time_hours: number;
  efficiency_score: number;
  current_workload: number;
  trend: number[];
}

export type NotificationType = 
  | 'donation_reminder' 
  | 'new_need_posted' 
  | 'task_assigned' 
  | 'task_due' 
  | 'recurring_payment_due';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}