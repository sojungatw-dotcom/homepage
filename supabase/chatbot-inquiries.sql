-- Run once in the intended Supabase project's SQL Editor.
-- Anonymous visitors may only submit through the RPC. No public read/update/delete.
begin;
create table if not exists public.chatbot_inquiries (
  request_id uuid primary key,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  email text not null check (char_length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  message text not null check (char_length(btrim(message)) between 1 and 2000),
  consent boolean not null check (consent = true),
  consent_version text not null check (char_length(consent_version) between 1 and 100),
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new','in_progress','closed'))
);
alter table public.chatbot_inquiries enable row level security;
revoke all on table public.chatbot_inquiries from public, anon, authenticated;

create or replace function public.submit_chatbot_inquiry(
  p_request_id uuid, p_name text, p_email text, p_message text,
  p_consent_version text, p_consent boolean
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_consent is distinct from true then
    raise exception 'Consent is required';
  end if;
  -- Reusing an id after an uncertain network response must not create duplicates.
  insert into public.chatbot_inquiries(request_id,name,email,message,consent,consent_version)
  values (p_request_id,btrim(p_name),btrim(p_email),btrim(p_message),p_consent,p_consent_version)
  on conflict (request_id) do nothing;
end;
$$;
revoke all on function public.submit_chatbot_inquiry(uuid,text,text,text,text,boolean) from public;
grant execute on function public.submit_chatbot_inquiry(uuid,text,text,text,text,boolean) to anon, authenticated;
commit;
