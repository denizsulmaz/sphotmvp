import { redirect } from "next/navigation";

// The admin dashboard moved to the tabbed console at /admin.
export default function AdminDashboardRedirect() {
  redirect("/admin");
}
