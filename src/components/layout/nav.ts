import { FileSpreadsheet, LayoutDashboard, ListChecks, Mail, Plus, Rows3, Search, Send, type LucideIcon } from 'lucide-react';

export interface NavItem { to: string; label: string; icon: LucideIcon; end?: boolean }
export const NAV_ITEMS: NavItem[] = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/emails', label: 'Email List', icon: ListChecks },
  { to: '/app/emails/new', label: 'Create Single Email', icon: Plus },
  { to: '/app/emails/bulk', label: 'Create Multiple Emails', icon: Rows3 },
  { to: '/app/import', label: 'Upload Excel File', icon: FileSpreadsheet },
  { to: '/app/transactions', label: 'Transaction History', icon: Search },
  { to: '/app/mail-sender', label: 'Mail Sender', icon: Send },
];
export { Mail };
