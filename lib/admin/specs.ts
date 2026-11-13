import { customerRows, messageRows, money, transactionRows, type Cell } from "./sample";

// Layout previews for the admin pages that run on Storable's platform on the live site.
// Page names, tabs, columns and form fields are copied from the live admin; rows are demo data.

export type Field = {
  label: string;
  type?: "text" | "select" | "checkbox" | "textarea" | "date" | "file" | "number";
  value?: string;
  options?: string[];
  hint?: string;
  wide?: boolean;
};

export type Block =
  | { type: "stats"; items: { label: string; value: string; hint?: string }[] }
  | { type: "filters"; fields: Field[]; action?: string }
  | { type: "table"; title?: string; columns: string[]; rows: Cell[][]; empty?: string; footer?: string }
  | { type: "form"; title?: string; description?: string; fields: Field[]; submit?: string }
  | { type: "cards"; title?: string; items: { title: string; text: string; tag?: string }[] }
  | { type: "empty"; title: string; text: string; action?: string }
  | { type: "unitGrid" }
  | { type: "siteMap" };

export type Spec = {
  title: string;
  description?: string;
  actions?: { label: string; primary?: boolean }[];
  blocks: Block[];
};

export const SPECS: Record<string, Spec> = {
  "/tasks": {
    title: "Task Manager",
    description: "Due, upcoming and recurring tasks for the facility.",
    actions: [{ label: "Create Task", primary: true }],
    blocks: [
      { type: "stats", items: [{ label: "Due tasks", value: "12" }, { label: "Upcoming", value: "5" }, { label: "Recurring", value: "3" }] },
      { type: "table", title: "Due Tasks", columns: ["Task", "Description", "Due date", "Assigned to"], rows: [["Create Print Batch", "Past due notices", "11/13/2026", "Office"], ["Create Print Batch", "Invoice reminders", "11/12/2026", "Office"], ["Walk-through", "Check gate and lighting", "11/14/2026", "Manager"]] },
      { type: "form", title: "Create Task", fields: [{ label: "Name" }, { label: "Description", type: "textarea", wide: true }, { label: "Due Date", type: "date" }], submit: "Create Task" },
    ],
  },
  "/customers/make_payment": {
    title: "Make Customer Payment",
    description: "Take a payment on a customer's account.",
    blocks: [{ type: "form", fields: [{ label: "Customer", hint: "Start typing a name or unit number" }, { label: "Payment method", type: "select", options: ["Cash", "Check", "Credit card", "ACH"] }, { label: "Amount", type: "number", value: "0.00" }, { label: "Note", type: "textarea", wide: true }], submit: "Take Payment" }],
  },
  "/setup/settings": {
    title: "Settings",
    description: "Facility-wide rules for billing, rentals and customer access.",
    blocks: [
      { type: "form", title: "Locale", fields: [{ label: "Locale", type: "select", options: ["English (US)"] }, { label: "Billing Period", type: "select", options: ["7 days"], hint: "Days before the due date that invoices go out" }, { label: "Time Zone", type: "select", options: ["Eastern Time (US & Canada)"] }, { label: "Phone Number Format", type: "select", options: ["(555) 555-5555"] }, { label: "Unit Type Dimension Format", type: "select", options: ["Width x Length"] }] },
      { type: "form", title: "Rental rules", fields: [{ label: "Enable prepay for customers", type: "checkbox" }, { label: "Disable partial and prepayments for locked out customers", type: "checkbox" }, { label: "Enable USB Card Swiper use", type: "checkbox" }, { label: "Save unpaid customer rentals", type: "checkbox" }, { label: "Automatically acknowledge new rentals / reservations", type: "checkbox" }, { label: "Enable additional deposits", type: "checkbox" }, { label: "Customers Can Edit Profile Information", type: "checkbox" }, { label: "Customers Can Edit Billing Information", type: "checkbox" }, { label: "Customers Can Schedule Move Outs", type: "checkbox" }, { label: "Days required before billing day", type: "number", value: "3" }, { label: "Reservation limit", type: "number", value: "5" }, { label: "Days in the future a customer reservation is allowed", type: "number", value: "30" }], submit: "Update Settings" },
      { type: "table", title: "Storage Agreements", columns: ["Title"], rows: [["Standard Storage Rental Agreement"]], footer: "New Storage Agreement" },
    ],
  },
  "/setup/gate": {
    title: "Gate Settings",
    description: "Gate integration for access control.",
    blocks: [{ type: "form", title: "Gate Integration", fields: [{ label: "My facility is already wired to use another gate company.", type: "checkbox" }, { label: "Gate Company", type: "select", options: ["None", "DoorKing", "PTI", "Sentinel"] }, { label: "Time Zone", type: "select", options: ["Eastern Time (US & Canada)"] }, { label: "Keypad Zone" }, { label: "DoorKing Account" }], submit: "Update Settings" }],
  },
  "/manual_fees": {
    title: "Fees",
    actions: [{ label: "New Fee", primary: true }],
    blocks: [{ type: "table", columns: ["Name", "Amount", "Tax Rate", "Description", "Created"], rows: [["Late Fee", money(25), "None", "Charged after the grace period", "01/05/2020"], ["Lock Fee", money(10), "NY Sales Tax", "Replacement lock", "01/05/2020"], ["Administration Fee", money(20), "None", "New rental setup", "01/05/2020"]] }],
  },
  "/past_due_rule_batches": {
    title: "Late/Lien Settings",
    description: "What happens as an account goes past due.",
    actions: [{ label: "Add Rule", primary: true }],
    blocks: [
      { type: "cards", title: "Status: Late", items: [{ title: "Day 5", text: "Charge a late fee and send the Past Due Notice template.", tag: "Late" }, { title: "Day 15", text: "Send a second reminder by email and text.", tag: "Late" }] },
      { type: "cards", title: "Status: Locked Out", items: [{ title: "Day 30", text: "Lock out gate access and mark the unit Locked Out.", tag: "Locked Out" }, { title: "Day 60", text: "Send the notice of intended sale.", tag: "Locked Out" }] },
    ],
  },
  "/easy_storage_payments/account": {
    title: "Easy Storage Payments",
    description: "Payment processing account, schedule and accepted methods.",
    blocks: [
      { type: "form", title: "Accepted Payment Methods", fields: [{ label: "Visa", type: "checkbox" }, { label: "Mastercard", type: "checkbox" }, { label: "Discover", type: "checkbox" }, { label: "American Express", type: "checkbox" }, { label: "ACH", type: "checkbox" }], submit: "Update Settings" },
      { type: "cards", title: "Payments & Schedule", items: [{ title: "Deposit schedule", text: "Next business day", tag: "Active" }, { title: "Support & Questions", text: "Contact Storable support for account changes." }] },
    ],
  },
  "/quickbooks": {
    title: "QuickBooks Online Integration",
    blocks: [{ type: "empty", title: "QuickBooks Online Connection Status: Inactive", text: "Connect your QuickBooks Online account to sync revenue and deposits.", action: "Connect to QuickBooks" }],
  },
  "/tax_rates": {
    title: "Tax Rates",
    actions: [{ label: "New Tax Rate", primary: true }],
    blocks: [{ type: "table", columns: ["Name", "Tax Rate"], rows: [["NY Sales Tax", "8.375%"]] }],
  },
  "/rate_management_settings_changes": {
    title: "Rate Management Settings",
    blocks: [{ type: "form", title: "Unit Type Price Change Rules", fields: [{ label: "Rate Management Enabled", type: "checkbox" }, { label: "Reminder Day of Month", type: "number", value: "1" }, { label: "Round Unit Type Price to the Nearest Dollar", type: "checkbox" }, { label: "Advance Notice", type: "select", options: ["30 days", "45 days", "60 days"] }, { label: "Round Rental Price to the Nearest Dollar", type: "checkbox" }], submit: "Update Settings" }],
  },
  "/available_promotions": {
    title: "Promotions",
    actions: [{ label: "Add a new Promotion", primary: true }],
    blocks: [{ type: "empty", title: "There are no Promotions to display.", text: "Add a promotion such as a first-month discount and it will appear here." }],
  },
  "/sparefoot": {
    title: "SpareFoot",
    blocks: [{ type: "empty", title: "SpareFoot Integration", text: "List your units on SpareFoot and receive reservations in your account.", action: "Let's Get Started!" }],
  },
  "/site_map": { title: "Site Map", description: "Layout of the facility.", blocks: [{ type: "siteMap" }] },
  "/units/notes": {
    title: "Unit Notes",
    blocks: [{ type: "filters", fields: [{ label: "Units sorted by", type: "select", options: ["Unit name", "Unit type"] }, { label: "Hide units without notes", type: "checkbox" }] }, { type: "table", columns: ["Unit", "Note"], rows: [["12", "Door sticks in cold weather"], ["47", "Tenant requests ground floor"]] }],
  },
  "/unit_form_field_order_forms": {
    title: "Form Field Settings for Units",
    actions: [{ label: "Create Custom Field", primary: true }],
    blocks: [{ type: "table", columns: ["Name"], rows: [["Name or Number"], ["Gate Key"], ["Unit type"], ["Notes"], ["Status"]] }],
  },
  "/products": {
    title: "Retail Sale",
    actions: [{ label: "Add a Product", primary: true }],
    blocks: [{ type: "empty", title: "There are currently no products to display.", text: "Sell locks, boxes and packing supplies from here." }],
  },
  "/quotes/new": {
    title: "New Quote",
    blocks: [
      { type: "form", fields: [{ label: "Unit type", type: "select", options: ["5 x 10", "10 x 10", "10 x 15"] }, { label: "Start Date for Billing Cycle", type: "date" }, { label: "Plan", type: "select", options: ["Monthly"] }, { label: "Monthly Price before Discount", type: "number", value: "115.00" }, { label: "Discount", type: "number", value: "0.00" }], submit: "Generate Quote" },
      { type: "table", title: "Quote preview", columns: ["Rent", "Prorated Rent", "Deposit", "Total Due"], rows: [[money(115), money(76.67), money(0), money(76.67)]] },
    ],
  },
  "/customer_import_previews": {
    title: "Import Customers From CSV",
    blocks: [{ type: "form", title: "Start New Import", fields: [{ label: "Choose a file", type: "file", wide: true }], submit: "Import" }],
  },
  "/customer_form_field_order_forms": {
    title: "Form Field Settings for Customers",
    actions: [{ label: "Create Custom Field", primary: true }],
    blocks: [{ type: "table", title: "Defaults", columns: ["Field Name", "Show on signup", "Required on signup", "Show on waiting list", "Required on waiting list"], rows: [["Full Name", "Yes", "Yes", "Yes", "Yes"], ["Email", "Yes", "Yes", "Yes", "Yes"], ["Phone", "Yes", "No", "Yes", "No"], ["Address", "Yes", "Yes", "No", "No"]] }],
  },
  "/rental_rate_change_batches/new": {
    title: "Mass Edit Rental Prices",
    blocks: [{ type: "form", fields: [{ label: "Rent Updated At Least", type: "select", options: ["6 months ago", "12 months ago"] }, { label: "Unit Type", type: "select", options: ["All unit types", "5 x 10", "10 x 10"] }, { label: "Increase Monthly Rental Price By", type: "number", value: "5" }, { label: "Advance Notice", type: "select", options: ["30 days", "45 days", "60 days"] }], submit: "Begin" }],
  },
  "/print_batches/new": {
    title: "Create Print Batch",
    blocks: [{ type: "filters", fields: [{ label: "Document", type: "select", options: ["Past Due Notice", "Invoice Reminder", "Rent Due"] }, { label: "Sort By", type: "select", options: ["Customer", "Unit"] }], action: "Filter" }, { type: "table", columns: ["Customer", "Unit", "Document", "Date Added", "Balance"], rows: customerRows(4).map((r, i) => [r[0], String(10 + i * 7), "Past Due Notice", "11/10/2026", money(115 + i * 20)]), footer: "Create Print Batch" }],
  },
  "/notification_templates": {
    title: "Templates",
    actions: [{ label: "New Custom Template", primary: true }],
    blocks: [
      { type: "table", title: "Default Templates", columns: ["Name", "Email", "Text", "Delivery", "Rule", "Days Past Due", "Print"], rows: ["Account Information", "Automatic Payment Receipt", "Failed Recurring Payment", "Invoice Reminder", "Manually Sent Payment Receipt", "Move Out Receipt", "Notice of Scheduled Rate Change", "Rental Instructions", "Reservation Receipt", "Scheduled Move Out", "Storage Agreement", "Waiting List Confirmation"].map((n) => [n, { badge: "On", tone: "green" as const }, "Off", "Automatic", "", "", "Yes"]) },
      { type: "table", title: "Custom Templates", columns: ["Name", "Email", "Text", "Delivery", "Rule", "Days Past Due", "Print"], rows: [["Past Due Notice", { badge: "On", tone: "green" }, "Off", "Manual", "Late", "10", "Yes"], ["Rent Due", { badge: "On", tone: "green" }, "Off", "Manual", "", "", "Yes"]] },
    ],
  },
  "/notification_template_batches/new": {
    title: "Send Template Letters",
    blocks: [{ type: "filters", fields: [{ label: "Filter Customers", type: "select", options: ["All", "Past Due", "Locked Out"] }, { label: "Notification template", type: "select", options: ["Past Due Notice", "Rent Due", "Invoice Reminder"] }] }, { type: "table", columns: ["Name", "Unit", "Locked Out", "Auction Date", "Email", "Cell Phone"], rows: customerRows(4).map((r, i) => [r[0], String(20 + i * 5), "No", "", r[3], r[2]]), footer: "Generate PDF" }],
  },
  "/email_batches/new": {
    title: "Send Email",
    blocks: [{ type: "form", fields: [{ label: "Filter Customers", type: "select", options: ["All", "Past Due", "Recurring"] }, { label: "Select Template", type: "select", options: ["None", "Rent Due", "Past Due Notice"], hint: "Optional" }, { label: "Subject", hint: "Required", wide: true }, { label: "Body", type: "textarea", wide: true, hint: "Required" }], submit: "Send Email" }],
  },
  "/customers/labels": {
    title: "Mailing labels",
    blocks: [{ type: "filters", fields: [{ label: "Filter Customers", type: "select", options: ["All", "Active", "Past Due"] }], action: "Continue" }, { type: "table", columns: ["Name", "Address"], rows: customerRows(5).map((r, i) => [r[0], `${100 + i * 12} Main Street, Poughkeepsie, NY 12601`]), footer: "Download as PDF" }],
  },
  "/text_messages": {
    title: "Text Messages",
    blocks: [{ type: "filters", fields: [{ label: "Sort", type: "select", options: ["Newest", "Oldest"] }], action: "Load" }, { type: "table", columns: ["Customer", "Message", "Created", "Sender"], rows: messageRows(6), footer: "Enable two-way texting" }],
  },
  "/additional_services": {
    title: "Additional Services",
    blocks: [{ type: "cards", items: [{ title: "SEO & Online Marketing Service", text: "Get help ranking your facility website and filling vacant units.", tag: "Partner" }] }],
  },
};

// Report catalog: names and URLs copied from the live Reports menu.
export const REPORT_TYPES = [
  { type: "all", label: "All Reports" },
  { type: "accounting", label: "Accounting/Financials" },
  { type: "customers", label: "Customers" },
  { type: "facility", label: "Facility" },
  { type: "payments_and_deposits", label: "Payments and Deposits" },
] as const;

export const REPORTS: { name: string; path: string; type: string }[] = [
  ["Lost Revenue", "lost_revenue", "accounting"], ["Expected Revenue", "expected_revenue", "accounting"], ["Future Revenue", "future_revenue", "accounting"],
  ["Collections", "collections", "accounting"], ["Revenues", "revenues", "accounting"], ["Yearly Revenues", "yearly", "accounting"],
  ["Monthly Deposits", "monthly_deposits", "accounting"], ["Sales", "sales", "accounting"], ["Sales Tax", "sales_tax", "accounting"],
  ["Total Deposits", "total_deposits", "accounting"], ["Credit Without Payment", "credit_without_payment", "accounting"], ["Failed and Declined Payments", "failed_payments", "accounting"],
  ["Alterations", "alterations", "accounting"], ["Accrual", "accrual", "accounting"], ["Retail Sales", "retail_sales", "accounting"],
  ["Occupancy", "occupancy", "accounting"], ["Occupancy History", "occupancy_history", "accounting"], ["Recurring Fees", "recurring_fees", "accounting"],
  ["Tenant Credit", "tenant_credit", "customers"], ["Move In / Move Out", "move_in_move_out", "customers"], ["Lock Outs", "lock_outs", "customers"],
  ["Tenant Data", "tenant_data", "customers"], ["Rental Transfers", "rental_transfers", "customers"], ["Storage Agreements", "storage_agreements", "customers"],
  ["Customer Notes", "customer_notes", "customers"], ["Credit Card Expiration Dates", "card_expirations", "customers"], ["Active Promotions", "active_promotions", "customers"],
  ["Management Summary", "management_summary", "facility"], ["Rent Roll", "rent_roll", "facility"], ["Square Footage", "square_footage", "facility"],
  ["Retail Inventory Summary", "retail_inventory", "facility"], ["Tasks", "tasks", "facility"], ["Custom Fields", "custom_fields", "facility"],
  ["Unit Status", "unit_status", "facility"], ["Length of Stay", "length_of_stay", "facility"], ["Vacant Units", "vacant_units", "facility"],
  ["Self Insured Rentals", "self_insured", "facility"], ["Transactions", "transactions", "payments_and_deposits"], ["Bank Activity", "bank_activity", "payments_and_deposits"],
  ["Statements", "statements", "payments_and_deposits"], ["Merchant Accounts", "merchant_accounts", "payments_and_deposits"], ["Chargebacks", "chargebacks", "payments_and_deposits"],
].map(([name, path, type]) => ({ name, path, type }));

export function reportSample(name: string) {
  return { columns: ["Date", "Customer", "Description", "Amount", "Status"], rows: transactionRows(8), name };
}
