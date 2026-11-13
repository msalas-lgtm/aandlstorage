import Image from "next/image";
import Link from "next/link";
import type { UnitType } from "@/lib/content";

// "$115.00" -> "$115", as shown on the live Rent page.
const formatPrice = (price: string) => price.replace(/\.00$/, "");

// The unit-size cards shared by the public Rent page and the customer's "Rent Storage" page.
// Availability is counted from the units table: no vacant units means the Waiting List button.
export function UnitTypeCards({ units }: { units: UnitType[] }) {
  return (
    <div className="unit-grid">
      {units.map((unit) => {
        const waiting = unit.availability === "waiting";
        return (
          <article className="unit-card" key={unit.id}>
            <h4>{unit.name}</h4>
            <div className="unit-body">
              {unit.image && <Image src={unit.image} alt="" width={150} height={150} sizes="150px" />}
              <p>{unit.description}</p>
            </div>
            <div className="unit-foot">
              <div className="unit-price">
                <strong>{formatPrice(unit.price)}</strong>
                <span>/ month</span>
                {unit.note && <em className="unit-note">{unit.note}</em>}
              </div>
              {waiting ? (
                <Link className="button outline" href={`/waiting_list?unit_type_id=${unit.id}`}>
                  Waiting List
                </Link>
              ) : (
                <Link className="button primary" href={`/pages/rent/reserve?unit_type_id=${unit.id}`}>
                  Rent Now
                </Link>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
