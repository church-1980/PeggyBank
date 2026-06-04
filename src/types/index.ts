export type Category =
  | 'groceries'
  | 'gas'
  | 'restaurant'
  | 'shopping'
  | 'health'
  | 'kids'
  | 'fun'
  | 'gifts'
  | 'pets'
  | 'home'
  | 'travel'
  | 'other';

export type BillFrequency = 'monthly' | 'weekly';

export interface Expense {
  id?: number;
  amount: number;
  category: Category;
  note?: string;
  date: string;
  photo_uri?: string;
  is_recurring?: boolean;
}

export interface Income {
  id?: number;
  amount: number;
  label?: string;
  date: string;
  is_recurring?: boolean;
}

export interface SavingsGoal {
  id?: number;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline?: string;
  goal_type?: string;
  pinned?: number;
  custom_image_uri?: string;
}

export interface Bill {
  id?: number;
  name: string;
  amount: number;
  frequency: BillFrequency;
  due_day?: number;      // monthly: 1–31
  due_weekday?: number;  // weekly: 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
  category?: string;
  is_paid?: boolean;
}
