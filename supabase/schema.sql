-- Bootstrap schema for a fresh Supabase project. All member data is server-only.
create table public.profiles (
 id text primary key,
 user_id uuid not null unique references auth.users(id) on delete cascade,
 name text not null, email text not null, dob date not null,
 gender text not null check (gender in ('Woman','Man')),
 city text not null, profession text not null, education text not null, sect text not null,
 language text not null, marital text not null, manager text not null, about text not null,
 "values" jsonb not null check (jsonb_typeof("values")='array'),
 pref_min integer not null check (pref_min >= 18), pref_max integer not null check (pref_max <= 100),
 pref_city text not null default '', photo_key text,
 status text not null default 'pending' check (status in ('pending','active')),
 fee text not null default 'unpaid' check (fee in ('unpaid','paid','waived')),
 oath_at timestamptz not null, terms_version text not null default '2026-10-02', created_at timestamptz not null default now(),
 check (pref_min <= pref_max), check (dob <= current_date - interval '18 years')
);
create index profiles_status_gender on public.profiles(status,gender);
create table public.connections (
 id uuid primary key default gen_random_uuid(),
 sender text not null references public.profiles(id) on delete cascade,
 receiver text not null references public.profiles(id) on delete cascade,
 pair text not null unique, status text not null default 'pending' check(status in ('pending','accepted','declined','closed')),
 note text not null, sender_photo boolean not null default false, receiver_photo boolean not null default false,
 created_at timestamptz not null default now(), accepted_at timestamptz,
 check(sender <> receiver), check(pair = least(sender,receiver)||':'||greatest(sender,receiver))
);
create index connections_sender on public.connections(sender);
create index connections_receiver on public.connections(receiver);
create table public.messages (
 id uuid primary key default gen_random_uuid(), connection_id uuid not null references public.connections(id) on delete cascade,
 sender text not null references public.profiles(id) on delete cascade,
 body text not null check(char_length(body) between 1 and 2000), created_at timestamptz not null default now()
);
create index messages_connection_time on public.messages(connection_id,created_at);
create index messages_sender_time on public.messages(sender,created_at);
create table public.support (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 email text not null, category text not null check(category in ('Fee waiver','Safety concern','General enquiry')),
 message text not null, status text not null default 'pending' check(status in ('pending','approved','resolved')),
 coupon text, created_at timestamptz not null default now()
);
create index support_user on public.support(user_id);
create table public.coupons (
 code text primary key, user_id uuid not null references auth.users(id) on delete cascade,
 redeemed_at timestamptz, created_at timestamptz not null default now()
);
create index coupons_user on public.coupons(user_id);
create table public.orders (
 id text primary key, profile_id text not null references public.profiles(id) on delete cascade,
 payment_id text unique, status text not null default 'created' check(status in ('created','paid')),
 created_at timestamptz not null default now()
);
create index orders_profile on public.orders(profile_id);
create table public.blocks (
 id uuid primary key default gen_random_uuid(), blocker text not null references public.profiles(id) on delete cascade,
 blocked text not null references public.profiles(id) on delete cascade, reason text not null, created_at timestamptz not null default now(),
 unique(blocker,blocked), check(blocker <> blocked)
);
create index blocks_blocked on public.blocks(blocked);

-- Direct Data API access is intentionally unavailable to browsers. Next.js verifies
-- the Supabase session, authorizes each operation, and uses a server-only secret.
alter table public.profiles enable row level security;
alter table public.connections enable row level security;
alter table public.messages enable row level security;
alter table public.support enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.blocks enable row level security;
revoke all on public.profiles,public.connections,public.messages,public.support,public.coupons,public.orders,public.blocks from anon,authenticated;
grant select,insert,update,delete on public.profiles,public.connections,public.messages,public.support,public.coupons,public.orders,public.blocks to service_role;

-- Small transaction helpers keep multi-record changes atomic. These are invoker
-- functions, executable only by service_role, never anonymous or signed-in clients.
create function public.issue_waiver_coupon(p_ticket uuid,p_code text) returns void
language plpgsql set search_path = '' as $$
declare ticket public.support;
begin
 select * into ticket from public.support where id=p_ticket for update;
 if not found or ticket.category<>'Fee waiver' or ticket.coupon is not null then raise exception 'This enquiry is unavailable or already has a coupon.'; end if;
 insert into public.coupons(code,user_id) values(p_code,ticket.user_id);
 update public.support set status='approved',coupon=p_code where id=p_ticket;
end; $$;
create function public.redeem_waiver_coupon(p_user uuid,p_code text) returns void
language plpgsql set search_path = '' as $$
declare coupon public.coupons; member public.profiles;
begin
 select * into member from public.profiles where user_id=p_user for update;
 if not found or member.fee<>'unpaid' then raise exception 'No registration fee is outstanding.'; end if;
 select * into coupon from public.coupons where code=p_code and user_id=p_user for update;
 if not found or coupon.redeemed_at is not null then raise exception 'That coupon is invalid or has already been used.'; end if;
 update public.coupons set redeemed_at=now() where code=p_code;
 update public.profiles set fee='waived',status='active' where id=member.id;
end; $$;
create function public.complete_registration_payment(p_profile text,p_order text,p_payment text) returns void
language plpgsql set search_path = '' as $$
begin
 perform 1 from public.orders where id=p_order and profile_id=p_profile for update;
 if not found then raise exception 'Payment order unavailable.'; end if;
 update public.orders set status='paid',payment_id=p_payment where id=p_order;
 update public.profiles set fee='paid',status='active' where id=p_profile and fee='unpaid';
end; $$;
create function public.replace_member_photo(p_profile text,p_key text) returns text
language plpgsql set search_path = '' as $$
declare previous text;
begin
 select photo_key into previous from public.profiles where id=p_profile for update;
 if not found then raise exception 'Profile not found.'; end if;
 update public.profiles set photo_key=p_key where id=p_profile;
 update public.connections set sender_photo=false where sender=p_profile;
 update public.connections set receiver_photo=false where receiver=p_profile;
 return previous;
end; $$;
create function public.delete_member_profile(p_user uuid) returns text
language plpgsql set search_path = '' as $$
declare previous text;
begin
 select photo_key into previous from public.profiles where user_id=p_user for update;
 delete from public.profiles where user_id=p_user;
 return previous;
end; $$;
create function public.block_member_connection(p_profile text,p_connection uuid,p_reason text) returns void
language plpgsql set search_path = '' as $$
declare link public.connections; other text;
begin
 select * into link from public.connections where id=p_connection and (sender=p_profile or receiver=p_profile) for update;
 if not found then raise exception 'Connection not found.'; end if;
 other:=case when link.sender=p_profile then link.receiver else link.sender end;
 insert into public.blocks(blocker,blocked,reason) values(p_profile,other,p_reason) on conflict(blocker,blocked) do nothing;
 update public.connections set status='closed',sender_photo=false,receiver_photo=false where id=p_connection;
end; $$;
create function public.send_connection_message(p_profile text,p_connection uuid,p_body text) returns void
language plpgsql set search_path = '' as $$
declare link public.connections; recent integer;
begin
 -- Serialize a member's sends to enforce the per-minute limit across connections.
 perform 1 from public.profiles where id=p_profile and status='active' for update;
 if not found then raise exception 'Active profile required.'; end if;
 select * into link from public.connections where id=p_connection and (sender=p_profile or receiver=p_profile) for update;
 if not found or link.status<>'accepted' then raise exception 'Both people must consent before chatting.'; end if;
 if exists(select 1 from public.blocks where (blocker=link.sender and blocked=link.receiver) or (blocker=link.receiver and blocked=link.sender)) then raise exception 'This connection is unavailable.'; end if;
 if not exists(select 1 from public.profiles where id=case when link.sender=p_profile then link.receiver else link.sender end and status='active') then raise exception 'This profile is unavailable.'; end if;
 select count(*) into recent from public.messages where sender=p_profile and created_at>now()-interval '1 minute';
 if recent>=20 then raise exception 'Please wait a moment before sending more messages.'; end if;
 insert into public.messages(connection_id,sender,body) values(p_connection,p_profile,p_body);
end; $$;
revoke all on function public.issue_waiver_coupon(uuid,text),public.redeem_waiver_coupon(uuid,text),public.complete_registration_payment(text,text,text),public.replace_member_photo(text,text),public.delete_member_profile(uuid),public.block_member_connection(text,uuid,text),public.send_connection_message(text,uuid,text) from public,anon,authenticated;
grant execute on function public.issue_waiver_coupon(uuid,text),public.redeem_waiver_coupon(uuid,text),public.complete_registration_payment(text,text,text),public.replace_member_photo(text,text),public.delete_member_profile(uuid),public.block_member_connection(text,uuid,text),public.send_connection_message(text,uuid,text) to service_role;
