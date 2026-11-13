import type { AdminIconName } from "@/app/admin/AdminIcon";

// Same sections, labels and order as the live admin menu. Every live path is served under /admin.

export type NavItem = { label: string; href: string; external?: boolean };
export type NavGroup = { id: string; label: string; icon: AdminIconName; items: NavItem[] };

const a = (live: string) => `/admin${live}`;

export const ADMIN_NAV: NavGroup[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "home",
    items: [
      { label: "Dashboard", href: a("/reports/dashboard") },
      { label: "Task Manager", href: a("/tasks") },
      { label: "Support", href: "https://support.storageunitsoftware.com", external: true },
      { label: "Make Customer Payment", href: a("/customers/make_payment") },
    ],
  },
  {
    id: "setup",
    label: "Setup",
    icon: "settings",
    items: [
      { label: "Settings", href: a("/setup/settings") },
      { label: "Users & Roles", href: a("/users") },
      { label: "Contact", href: a("/setup/contact") },
      { label: "Gate", href: a("/setup/gate") },
      { label: "Fees", href: a("/manual_fees") },
      { label: "Late/Lien", href: a("/past_due_rule_batches") },
      { label: "Payment Processing", href: a("/easy_storage_payments/account") },
      { label: "QuickBooks", href: a("/quickbooks") },
      { label: "Tax Rates", href: a("/tax_rates") },
      { label: "Rate Management", href: a("/rate_management_settings_changes") },
      { label: "Promotions", href: a("/available_promotions") },
      { label: "SpareFoot", href: a("/sparefoot") },
    ],
  },
  {
    id: "units",
    label: "Units",
    icon: "box",
    items: [
      { label: "Site Map", href: a("/site_map") },
      { label: "Grid View", href: a("/units") },
      { label: "Notes", href: a("/units/notes") },
      { label: "Unit Types", href: a("/unit_types") },
      { label: "List View", href: a("/units/list") },
      { label: "New Unit", href: a("/units/new") },
      { label: "Create Multiple Units", href: a("/units/mass_create") },
      { label: "Field Settings", href: a("/unit_form_field_order_forms") },
    ],
  },
  {
    id: "customers",
    label: "Customers",
    icon: "users",
    items: [
      { label: "All Customers", href: a("/customers") },
      { label: "Retail Sale", href: a("/products") },
      { label: "New Quote", href: a("/quotes/new") },
      { label: "Reservations", href: a("/reservations") },
      { label: "Waiting List", href: a("/waiting_customers") },
      { label: "New Customer", href: a("/customer_profile_forms/new") },
      { label: "Import Customers", href: a("/customer_import_previews") },
      { label: "Field Settings", href: a("/customer_form_field_order_forms") },
      { label: "Mass Edit Rental Prices", href: a("/rental_rate_change_batches/new") },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: "chart",
    items: [
      { label: "All Reports", href: a("/reports?type=all") },
      { label: "Accounting/Financials", href: a("/reports?type=accounting") },
      { label: "Customers", href: a("/reports?type=customers") },
      { label: "Facility", href: a("/reports?type=facility") },
      { label: "Payments and Deposits", href: a("/reports?type=payments_and_deposits") },
    ],
  },
  {
    id: "messages",
    label: "Email, Txt & Print",
    icon: "mail",
    items: [
      { label: "Print Batches", href: a("/print_batches/new") },
      { label: "Templates", href: a("/notification_templates") },
      { label: "Settings", href: a("/site_notification_settings_changes/new") },
      { label: "Print/Email Letters", href: a("/notification_template_batches/new") },
      { label: "Send Email", href: a("/email_batches/new") },
      { label: "Mailing Labels", href: a("/customers/labels") },
      { label: "Text Messages", href: a("/text_messages") },
    ],
  },
  {
    id: "website",
    label: "Website",
    icon: "globe",
    items: [
      { label: "Pages", href: a("/website_pages") },
      { label: "Blog", href: a("/blog_posts") },
      { label: "Image Library", href: a("/widget_images") },
      { label: "Messages", href: a("/contact_messages") },
      { label: "Additional Services", href: a("/additional_services") },
      { label: "Settings", href: a("/setup/website") },
      { label: "View Site", href: "/", external: true },
    ],
  },
];

export function flatNav() {
  return ADMIN_NAV.flatMap((group) => group.items.map((item) => ({ ...item, group: group.label })));
}

export function findNav(pathname: string, search = "") {
  const full = `${pathname}${search}`;
  const items = flatNav();
  return (
    items.find((item) => item.href === full) ||
    items.find((item) => item.href === pathname) ||
    // Edit/new pages belong to their list's menu item.
    items.find((item) => !item.external && !item.href.includes("?") && pathname.startsWith(`${item.href}/`))
  );
}
