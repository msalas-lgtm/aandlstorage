import { AdminIcon } from "./AdminIcon";
import { Card, DataTable, Empty, FieldControl, PageHeader, PreviewNotice, StatCard } from "./ui";
import { unitStatus } from "@/lib/admin/sample";
import type { Block, Spec } from "@/lib/admin/specs";

const TYPE_GROUPS = [
  { name: "5 x 5", count: 14 },
  { name: "5 x 10", count: 18 },
  { name: "10 x 10", count: 18 },
  { name: "10 x 15", count: 11 },
];

function UnitGrid() {
  const tone = (i: number) => {
    const status = unitStatus(i);
    const badge = typeof status === "object" ? status.badge : "";
    return badge === "Vacant" ? "vacant" : badge === "Past Due" ? "late" : badge === "Reserved" ? "reserved" : "rented";
  };
  return (
    <>
      <div className="adm-legend">
        <span><i style={{ background: "#e5f6ec" }} />Rented</span>
        <span><i style={{ background: "#fff", border: "1px dashed #c6d0e6" }} />Vacant</span>
        <span><i style={{ background: "#fff1da" }} />Reserved</span>
        <span><i style={{ background: "#ffe9ea" }} />Past due</span>
      </div>
      <div className="adm-unitgroups">
        {TYPE_GROUPS.map((group, g) => {
          const start = TYPE_GROUPS.slice(0, g).reduce((sum, previous) => sum + previous.count, 0);
          return (
            <Card key={group.name} title={`${group.name} (${group.count} units)`}>
              <div className="adm-units">
                {Array.from({ length: group.count }, (_, i) => (
                  <span key={i} className={`adm-unit ${tone(start + i + 1)}`}>{start + i + 1}</span>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}

function SiteMap() {
  const buildings = ["Building A", "Building B", "Building C", "Building D"];
  return (
    <div className="adm-sitemap">
      {buildings.map((name, b) => (
        <div className="adm-building" key={name}>
          <h4>{name}</h4>
          <div className="adm-units">
            {Array.from({ length: 18 }, (_, i) => {
              const status = unitStatus(b * 18 + i);
              const badge = typeof status === "object" ? status.badge : "";
              const cls = badge === "Vacant" ? "vacant" : badge === "Past Due" ? "late" : badge === "Reserved" ? "reserved" : "rented";
              return <span key={i} className={`adm-unit ${cls}`}>{b * 18 + i + 1}</span>;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function renderBlock(block: Block, index: number) {
  switch (block.type) {
    case "stats":
      return (
        <div className="adm-grid cols-4" key={index}>
          {block.items.map((item) => (
            <StatCard key={item.label} label={item.label} value={item.value} hint={item.hint} />
          ))}
        </div>
      );
    case "filters":
      return (
        <Card key={index}>
          <div className="adm-filters">
            {block.fields.map((field, i) => (
              <FieldControl key={field.label} field={field} name={`filter-${index}-${i}`} disabled />
            ))}
            {block.action && (
              <button className="adm-btn" type="button" disabled>
                {block.action}
              </button>
            )}
          </div>
        </Card>
      );
    case "table":
      return (
        <div key={index} className="adm-grid" style={{ gap: 10 }}>
          {block.title && <h2 className="adm-card-title">{block.title}</h2>}
          <DataTable columns={block.columns} rows={block.rows} footer={block.footer} empty={block.empty} />
        </div>
      );
    case "form":
      return (
        <Card key={index} title={block.title} subtitle={block.description}>
          <div className="adm-form">
            <div className="adm-fields">
              {block.fields.map((field, i) => (
                <FieldControl key={field.label} field={field} name={`form-${index}-${i}`} disabled />
              ))}
            </div>
            {block.submit && (
              <div className="adm-formbar">
                <button className="adm-btn is-primary" type="button" disabled>
                  {block.submit}
                </button>
              </div>
            )}
          </div>
        </Card>
      );
    case "cards":
      return (
        <Card key={index} title={block.title}>
          <div className="adm-grid cols-2">
            {block.items.map((item) => (
              <div className="adm-miniitem" key={item.title}>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      );
    case "empty":
      return (
        <Card key={index}>
          <Empty title={block.title} text={block.text}>
            {block.action && (
              <button className="adm-btn is-primary" type="button" disabled>
                <AdminIcon name="plus" size={15} />
                {block.action}
              </button>
            )}
          </Empty>
        </Card>
      );
    case "unitGrid":
      return <UnitGrid key={index} />;
    case "siteMap":
      return <SiteMap key={index} />;
  }
}

export function GenericPage({ spec }: { spec: Spec }) {
  return (
    <>
      <PageHeader
        title={spec.title}
        description={spec.description}
        actions={spec.actions?.map((action) => (
          <button key={action.label} type="button" className={`adm-btn${action.primary ? " is-primary" : ""}`} disabled>
            {action.primary && <AdminIcon name="plus" size={15} />}
            {action.label}
          </button>
        ))}
      />
      <PreviewNotice />
      {spec.blocks.map(renderBlock)}
    </>
  );
}
