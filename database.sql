-- Выполните файл в Supabase SQL Editor.
create schema if not exists app_data;

create table if not exists app_data.requests (
  request_id bigint generated always as identity primary key,
  request_number varchar(15) not null unique,
  passenger_name varchar(100) not null,
  contact_phone varchar(30) not null,
  flight_number varchar(10) not null,
  service_type varchar(30) not null,
  service_date date not null,
  baggage_count smallint not null default 0,
  comment varchar(500),
  status varchar(40) not null default 'Заявка принята',
  created_at timestamptz not null default current_timestamp,
  constraint requests_number_format_check
    check (request_number ~ '^[A-Z]{2}-[0-9]{8}-[0-9]{3}$'),
  constraint requests_passenger_name_check
    check (char_length(trim(passenger_name)) between 2 and 100),
  constraint requests_phone_check
    check (char_length(trim(contact_phone)) between 7 and 30),
  constraint requests_flight_format_check
    check (flight_number ~ '^[A-Z0-9]{2,10}$'),
  constraint requests_service_type_check
    check (service_type in ('Регистрация', 'Багаж', 'Регистрация и багаж')),
  constraint requests_baggage_count_check
    check (baggage_count between 0 and 10),
  constraint requests_status_check
    check (status in ('Заявка принята', 'Подтверждена', 'В обработке', 'Завершена', 'Отменена'))
);

create index if not exists requests_service_date_idx
  on app_data.requests (service_date);
