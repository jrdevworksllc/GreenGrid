alter table plants_catalog
    add column if not exists image_source varchar(120);

alter table plants_catalog
    add column if not exists image_license varchar(160);

alter table plants_catalog
    add column if not exists image_attribution text;
