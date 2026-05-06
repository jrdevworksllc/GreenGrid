alter table plants_catalog
    add column if not exists image_url varchar(500);

create table if not exists plan_version (
    id uuid primary key,
    property_id uuid not null references property(id),
    source_design_output_id uuid not null references design_output(id),
    version_number integer not null,
    created_at timestamp not null
);

create unique index if not exists idx_plan_version_property_version
    on plan_version(property_id, version_number);

create table if not exists plan_item (
    id uuid primary key,
    plan_version_id uuid not null references plan_version(id),
    zone_id uuid references zone(id),
    item_type varchar(80) not null,
    title varchar(255) not null,
    detail text not null,
    scheduled_on date not null,
    priority varchar(40) not null,
    created_at timestamp not null
);
