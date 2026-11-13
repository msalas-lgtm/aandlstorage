import Link from "next/link";
import { connection } from "next/server";
import { cancelReservationAction, confirmRentalAction } from "../../actions";
import { ConfirmButton } from "../../AdminForm";
import { Badge, DataTable, Notice, PageHeader } from "../../ui";
import { formatCents } from "@/lib/content";
import { db, unwrap } from "@/lib/db";

type Reservation = {
  id: number;
  unit_name: string;
  monthly_rent_cents: number;
  started_on: string;
  created_at: string;
  customer_id: number;
  customers: { full_name: string; email: string; phone: string; username: string } | null;
  unit_types: { name: string } | null;
};

export default async function ReservationsPage() {
  await connection();
  const reservations = unwrap(
    await db()
      .from("rentals")
      .select("id,unit_name,monthly_rent_cents,started_on,created_at,customer_id,customers(full_name,email,phone,username),unit_types(name)")
      .eq("confirmed", false)
      .is("ended_on", null)
      .order("created_at", { ascending: false })
      .limit(200),
    "reservations",
  ) as unknown as Reservation[];

  return (
    <>
      <PageHeader title="Active Reservations" description='Units rented online with "Rent Now" that are waiting for you to confirm.' />
      <Notice>
        {reservations.length} {reservations.length === 1 ? "reservation is" : "reservations are"} waiting. The unit is held for the customer.
        Confirm it once you have the first month&apos;s rent, or cancel it to put the unit back on the market.
      </Notice>
      <DataTable
        columns={["Customer", "Unit", "Move-in", "First month due", "Received", "Status", "Actions"]}
        empty="There are no reservations waiting."
        rows={reservations.map((reservation) => [
          <div key="c">
            <Link href={`/admin/customers/${reservation.customer_id}/edit`}><strong>{reservation.customers?.full_name}</strong></Link>
            <div className="adm-stat-hint">
              {reservation.customers?.email}
              {reservation.customers?.phone ? ` · ${reservation.customers.phone}` : ""}
            </div>
          </div>,
          <div key="u"><strong>Unit {reservation.unit_name}</strong><div className="adm-stat-hint">{reservation.unit_types?.name}</div></div>,
          reservation.started_on,
          formatCents(reservation.monthly_rent_cents),
          new Date(reservation.created_at).toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "America/New_York" }),
          <Badge key="s" tone="amber">Awaiting confirmation</Badge>,
          <span key="a" style={{ display: "inline-flex", gap: 6 }}>
            <form action={confirmRentalAction} style={{ display: "inline" }}>
              <input type="hidden" name="id" value={reservation.id} />
              <button className="adm-btn is-small is-primary" type="submit">Confirm rental</button>
            </form>
            <ConfirmButton
              action={cancelReservationAction}
              fields={{ id: String(reservation.id) }}
              label="Cancel"
              message={`Cancel the reservation of unit ${reservation.unit_name} for ${reservation.customers?.full_name}? The unit goes back on the market.`}
            />
          </span>,
        ])}
        footer={`${reservations.length} reservations`}
      />
    </>
  );
}
