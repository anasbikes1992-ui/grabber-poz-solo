CREATE UNIQUE INDEX IF NOT EXISTS "repair_catalog_model_cat_quality_idx" ON "repair_service_catalog" USING btree ("brand","device_model","repair_category","part_quality");
