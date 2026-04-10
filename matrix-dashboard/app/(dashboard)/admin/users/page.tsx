// app/(dashboard)/admin/users/page.tsx
// Redirect to main admin page which has user management
import { redirect } from 'next/navigation';
export default function AdminUsersPage() { redirect('/admin'); }
