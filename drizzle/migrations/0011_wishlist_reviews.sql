-- GRW-03 wishlist + product reviews
CREATE TABLE IF NOT EXISTS "wishlists" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE cascade,
  "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE cascade,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "wishlists_customer_product_idx" ON "wishlists" ("customer_id","product_id");
CREATE INDEX IF NOT EXISTS "wishlists_customer_idx" ON "wishlists" ("customer_id");

CREATE TABLE IF NOT EXISTS "product_reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE cascade,
  "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE cascade,
  "rating" integer NOT NULL,
  "title" text,
  "body" text,
  "customer_name" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "product_reviews_product_idx" ON "product_reviews" ("product_id");
CREATE UNIQUE INDEX IF NOT EXISTS "product_reviews_customer_product_idx" ON "product_reviews" ("customer_id","product_id");
