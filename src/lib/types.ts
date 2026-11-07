export type Role = "admin" | "staff" | "borrower";
export type Condition = "Good" | "Fair" | "Needs Repair";
export interface Profile {
  id: string;
  full_name: string;
  email: string;
  school_id: string;
  role: Role;
  is_active: boolean;
}
export interface Equipment {
  id: string;
  asset_number: string;
  name: string;
  serial_number: string;
  category: string;
  location: string;
  condition: Condition;
  operational_state: string;
  photo_path: string | null;
  remarks: string;
  availability: string;
  created_at: string;
}
export interface BorrowRequest {
  id: string;
  reference: number;
  borrower_id: string;
  equipment_id: string;
  purpose: string;
  requested_date: string;
  due_date: string;
  status: string;
  reviewer_id: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}
export interface Loan {
  id: string;
  request_id: string;
  equipment_id: string;
  borrower_id: string;
  released_at: string;
  due_date: string;
  released_by: string;
  returned_at: string | null;
  received_by: string | null;
  release_condition: Condition;
  return_condition: Condition | null;
  release_accessories: string;
  return_accessories: string;
}
export interface Maintenance {
  id: string;
  equipment_id: string;
  incident: string;
  status: string;
  cost: number;
  resolution: string;
  reported_by: string;
  created_at: string;
  completed_at: string | null;
}
export interface Notification {
  id: string;
  recipient_id: string;
  message: string;
  request_id: string | null;
  created_at: string;
  read_at: string | null;
}
export interface Audit {
  id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
}
export interface Data {
  equipment: Equipment[];
  requests: BorrowRequest[];
  loans: Loan[];
  maintenance: Maintenance[];
  notifications: Notification[];
  profiles: Profile[];
  audit: Audit[];
}
export const ROLE_NAMES: Record<Role, string> = {
  admin: "Administrator",
  staff: "Inventory / Maintenance Staff",
  borrower: "Faculty / Staff / Student",
};
export const CATEGORIES = [
  "Computer",
  "Audio-Visual",
  "Electronic",
  "Laboratory",
  "Sports",
  "Office",
  "Networking",
  "Photography",
  "Electrical",
  "Tools and Machinery",
  "Others",
];
export const CONDITIONS: Condition[] = ["Good", "Fair", "Needs Repair"];
