create table app_user (
    id uuid primary key,
    email varchar(255) not null unique,
    full_name varchar(255) not null,
    created_at timestamp not null
);

create table property (
    id uuid primary key,
    user_id uuid not null references app_user(id),
    name varchar(255) not null,
    address_line varchar(255) not null,
    city varchar(120) not null,
    state_code varchar(10) not null,
    postal_code varchar(20) not null,
    country_code varchar(10) not null,
    created_at timestamp not null
);

create table yard_boundary (
    id uuid primary key,
    property_id uuid not null unique references property(id),
    polygon_json text not null,
    updated_at timestamp not null
);

create table zone (
    id uuid primary key,
    property_id uuid not null references property(id),
    name varchar(255) not null,
    sun_level varchar(50) not null,
    soil_type varchar(80) not null,
    irrigation_type varchar(80) not null,
    slope varchar(80) not null,
    notes text,
    polygon_json text not null,
    created_at timestamp not null
);

create table plants_catalog (
    id uuid primary key,
    common_name varchar(255) not null,
    scientific_name varchar(255) not null,
    usda_min_zone integer not null,
    usda_max_zone integer not null,
    light_needs varchar(80) not null,
    water_cadence varchar(120) not null,
    is_native_us boolean not null,
    created_at timestamp not null
);

create table planting (
    id uuid primary key,
    zone_id uuid not null references zone(id),
    plant_catalog_id uuid not null references plants_catalog(id),
    nickname varchar(120),
    quantity integer not null,
    health_status varchar(80) not null,
    planted_on date,
    created_at timestamp not null
);

create table photo_asset (
    id uuid primary key,
    property_id uuid not null references property(id),
    zone_id uuid references zone(id),
    original_file_name varchar(255) not null,
    storage_path varchar(500) not null,
    mime_type varchar(120) not null,
    created_at timestamp not null
);

create table design_request (
    id uuid primary key,
    property_id uuid not null references property(id),
    zone_id uuid references zone(id),
    prompt text not null,
    style varchar(120) not null,
    provider_key varchar(120) not null,
    provider_request_id varchar(255),
    status varchar(40) not null,
    created_at timestamp not null
);

create table design_output (
    id uuid primary key,
    design_request_id uuid not null references design_request(id),
    output_url varchar(500) not null,
    label varchar(120) not null,
    selected boolean not null,
    created_at timestamp not null
);

create table care_task (
    id uuid primary key,
    property_id uuid not null references property(id),
    zone_id uuid references zone(id),
    planting_id uuid references planting(id),
    title varchar(255) not null,
    detail text not null,
    due_on date not null,
    priority varchar(40) not null,
    completed boolean not null,
    created_at timestamp not null
);
