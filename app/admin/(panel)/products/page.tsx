import { connection } from "next/server";
import { sellProductAction } from "../../actions";
import { AdminForm } from "../../AdminForm";
import { EntityManager } from "../../EntityManager";
import { Card } from "../../ui";
import { db, unwrap } from "@/lib/db";

export default async function RetailSalePage({ searchParams }: PageProps<"/admin/products">) {
  await connection();
  const { edit } = await searchParams;
  const client = db();
  const [products, customers, taxes] = await Promise.all([
    client.from("products").select("id,name,price_cents,stock").eq("active", true).gt("stock", 0).order("name").then((r) => unwrap(r, "products")),
    client.from("customers").select("id,full_name").eq("archived", false).order("full_name").limit(1000).then((r) => unwrap(r, "customers")),
    client.from("tax_rates").select("id,name,rate_percent").order("name").then((r) => unwrap(r, "tax rates")),
  ]);

  return (
    <EntityManager
      entityKey="products"
      edit={typeof edit === "string" ? edit : undefined}
      extra={
        <Card title="Sell a product" subtitle="The sale is added to the customer's statement and the stock goes down.">
          {products.length === 0 || customers.length === 0 ? (
            <p className="adm-stat-hint">Add a product with stock, and a customer, to make a sale.</p>
          ) : (
            <AdminForm action={sellProductAction} submitLabel="Sell" resetOnSuccess>
              <div className="adm-fields">
                <div className="adm-field">
                  <label htmlFor="sp-product">Product</label>
                  <select id="sp-product" name="productId" className="adm-select" defaultValue="" required>
                    <option value="" disabled>Choose a product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} (${(product.price_cents / 100).toFixed(2)}, {product.stock} left)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="adm-field">
                  <label htmlFor="sp-customer">Customer</label>
                  <select id="sp-customer" name="customerId" className="adm-select" defaultValue="" required>
                    <option value="" disabled>Choose a customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>{customer.full_name}</option>
                    ))}
                  </select>
                </div>
                <div className="adm-field">
                  <label htmlFor="sp-qty">Quantity</label>
                  <input id="sp-qty" name="quantity" type="number" min="1" defaultValue="1" className="adm-input" />
                </div>
                <div className="adm-field">
                  <label htmlFor="sp-tax">Sales tax</label>
                  <select id="sp-tax" name="taxRateId" className="adm-select" defaultValue="">
                    <option value="">No tax</option>
                    {taxes.map((tax) => (
                      <option key={tax.id} value={tax.id}>{tax.name} ({Number(tax.rate_percent)}%)</option>
                    ))}
                  </select>
                </div>
              </div>
            </AdminForm>
          )}
        </Card>
      }
    />
  );
}
