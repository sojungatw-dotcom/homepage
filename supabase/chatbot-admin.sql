-- Apply after chatbot-inquiries.sql in the intended Supabase project's SQL Editor.
-- Password authentication is provided by Supabase Auth. No password is stored here.
begin;
create table if not exists public.chatbot_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.chatbot_admins enable row level security;
revoke all on public.chatbot_admins from public, anon, authenticated;

create or replace function public.is_chatbot_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.chatbot_admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_chatbot_admin() from public;
grant execute on function public.is_chatbot_admin() to authenticated;

create table if not exists public.chatbot_versions (
  id bigint generated always as identity primary key,
  payload jsonb not null,
  note text not null default '',
  source_version_id bigint references public.chatbot_versions(id),
  published_by uuid not null references auth.users(id),
  published_at timestamptz not null default now()
);
create table if not exists public.chatbot_editor_state (
  singleton boolean primary key default true check(singleton),
  draft jsonb,
  revision bigint not null default 0,
  reviewed_revision bigint,
  source_version_id bigint references public.chatbot_versions(id),
  published_version_id bigint references public.chatbot_versions(id),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
insert into public.chatbot_editor_state(singleton) values(true) on conflict do nothing;
alter table public.chatbot_editor_state enable row level security;
alter table public.chatbot_versions enable row level security;
revoke all on public.chatbot_editor_state, public.chatbot_versions from public, anon, authenticated;

create or replace function public.validate_chatbot_payload(p_payload jsonb) returns void
language plpgsql set search_path = '' as $$
declare k text; n jsonb; b jsonb; field text; v jsonb;
begin
 if jsonb_typeof(p_payload) is distinct from 'object' or jsonb_typeof(p_payload->'nodes') is distinct from 'object'
   or jsonb_typeof(p_payload->'ui') is distinct from 'object' or p_payload->>'version' is distinct from '1'
   or octet_length(p_payload::text)>800000 then raise exception 'Invalid chatbot document'; end if;
 if not (p_payload->'nodes' ?& array['home','fallback']) then raise exception 'Missing home/fallback'; end if;
 if (select count(*) from jsonb_object_keys(p_payload->'nodes')) not between 2 and 200 then raise exception 'Invalid node count'; end if;
 foreach field in array array['title','subtitle','launcher','close','back','home','reset','placeholder','send','loadError','retry','storageWarning','empty','resetNotice'] loop
   v:=p_payload->'ui'->field;
   if jsonb_typeof(v) is distinct from 'string' or char_length(btrim(v #>> '{}')) not between 1 and 1000 then raise exception 'Invalid UI field %',field; end if;
 end loop;
 if jsonb_typeof(p_payload->'ui'->'form') is distinct from 'object' then raise exception 'Missing form UI'; end if;
 foreach field in array array['name','email','message','submit','pending','consent','notice','unavailable','success','error','invalid'] loop
   v:=p_payload->'ui'->'form'->field;
   if jsonb_typeof(v) is distinct from 'string' or char_length(btrim(v #>> '{}')) not between 1 and 2000 then raise exception 'Invalid form UI'; end if;
 end loop;
 for k,n in select key,value from jsonb_each(p_payload->'nodes') loop
   if k !~ '^[a-z][a-z0-9_-]{0,63}$' or k in ('constructor','prototype') or jsonb_typeof(n) is distinct from 'object' then raise exception 'Invalid node ID'; end if;
   if jsonb_typeof(n->'answer') is distinct from 'string' or char_length(btrim(n->>'answer')) not between 1 and 8000 then raise exception 'Invalid answer'; end if;
   foreach field in array array['questions','keywords'] loop
     if jsonb_typeof(n->field) is distinct from 'array' then raise exception 'Invalid matching rules'; end if;
     if jsonb_array_length(n->field)>100 then raise exception 'Too many matching rules'; end if;
     for v in select value from jsonb_array_elements(n->field) loop
       if jsonb_typeof(v) is distinct from 'string' or char_length(btrim(v #>> '{}')) not between 1 and 200 then raise exception 'Invalid matching rule'; end if;
     end loop;
   end loop;
   if n ? 'form' and n->>'form' is distinct from 'inquiry' then raise exception 'Invalid form'; end if;
   if jsonb_typeof(n->'buttons') is distinct from 'array' then raise exception 'Invalid buttons'; end if;
   if jsonb_array_length(n->'buttons')>12 then raise exception 'Too many buttons'; end if;
   for b in select value from jsonb_array_elements(n->'buttons') loop
     if jsonb_typeof(b) is distinct from 'object' or jsonb_typeof(b->'label') is distinct from 'string' or char_length(btrim(b->>'label')) not between 1 and 120 then raise exception 'Invalid button label'; end if;
     if (b ? 'next') = (b ? 'href') then raise exception 'Button needs exactly one destination'; end if;
     if b ? 'next' and (jsonb_typeof(b->'next') is distinct from 'string' or not (p_payload->'nodes' ? (b->>'next'))) then raise exception 'Missing button destination'; end if;
     if b ? 'href' then
       if jsonb_typeof(b->'href') is distinct from 'string' or char_length(b->>'href') not between 1 and 2048
          or b->>'href' ~ '[[:space:]\\]'
          or not ((b->>'href' ~* '^https://[^/@[:space:]]+([/?#]|$)' and b->>'href' !~ '^https://[^/]*@')
                  or (b->>'href' !~* '^([a-z][a-z0-9+.-]*:|/)' )) then raise exception 'Unsafe button link'; end if;
     end if;
   end loop;
 end loop;
end;
$$;
revoke all on function public.validate_chatbot_payload(jsonb) from public,anon,authenticated;

create or replace function public.get_published_chatbot() returns jsonb
language sql stable security definer set search_path = '' as $$
 select jsonb_build_object('version',v.id,'published_at',v.published_at,'content',v.payload)
 from public.chatbot_editor_state s join public.chatbot_versions v on v.id=s.published_version_id where s.singleton;
$$;
revoke all on function public.get_published_chatbot() from public;
grant execute on function public.get_published_chatbot() to anon,authenticated;

create or replace function public.get_chatbot_admin_state() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
 if not public.is_chatbot_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 select jsonb_build_object('draft',draft,'revision',revision,'reviewed_revision',reviewed_revision,'source_version_id',source_version_id,'published_version_id',published_version_id,'updated_at',updated_at) into result
 from public.chatbot_editor_state where singleton;
 return result;
end; $$;

create or replace function public.save_chatbot_draft(p_payload jsonb,p_expected_revision bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare current_state public.chatbot_editor_state;
begin
 if not public.is_chatbot_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 perform public.validate_chatbot_payload(p_payload);
 select * into current_state from public.chatbot_editor_state where singleton for update;
 if current_state.revision is distinct from p_expected_revision then raise exception 'DRAFT_CONFLICT' using errcode='40001'; end if;
 update public.chatbot_editor_state set draft=p_payload,revision=revision+1,reviewed_revision=null,source_version_id=null,updated_by=auth.uid(),updated_at=now() where singleton;
 return public.get_chatbot_admin_state();
end; $$;

create or replace function public.review_chatbot_draft(p_expected_revision bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
 if not public.is_chatbot_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 perform 1 from public.chatbot_editor_state where singleton and revision=p_expected_revision and draft is not null for update;
 if not found then raise exception 'DRAFT_CONFLICT' using errcode='40001'; end if;
 update public.chatbot_editor_state set reviewed_revision=revision where singleton;
 return public.get_chatbot_admin_state();
end; $$;

create or replace function public.publish_chatbot_draft(p_expected_revision bigint,p_expected_published_version bigint,p_note text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.chatbot_editor_state; new_id bigint;
begin
 if not public.is_chatbot_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 select * into s from public.chatbot_editor_state where singleton for update;
 if s.revision is distinct from p_expected_revision or s.published_version_id is distinct from p_expected_published_version then raise exception 'DRAFT_CONFLICT' using errcode='40001'; end if;
 if s.draft is null or s.reviewed_revision is distinct from s.revision then raise exception 'PREVIEW_REQUIRED'; end if;
 if char_length(coalesce(p_note,''))>500 then raise exception 'Note too long'; end if;
 perform public.validate_chatbot_payload(s.draft);
 -- Reject repeat/retried publish requests; a successful publish invalidates its preview acknowledgement.
 insert into public.chatbot_versions(payload,note,source_version_id,published_by) values(s.draft,coalesce(p_note,''),s.source_version_id,auth.uid()) returning id into new_id;
 update public.chatbot_editor_state set published_version_id=new_id,reviewed_revision=null where singleton;
 return public.get_chatbot_admin_state();
end; $$;

create or replace function public.list_chatbot_versions(p_before bigint default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
 if not public.is_chatbot_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 select coalesce(jsonb_agg(to_jsonb(t) order by t.id desc),'[]'::jsonb) into result from
 (select id,note,source_version_id,published_at from public.chatbot_versions where p_before is null or id<p_before order by id desc limit 25) t;
 return result;
end; $$;

create or replace function public.restore_chatbot_version(p_version_id bigint,p_expected_revision bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare payload jsonb;
begin
 if not public.is_chatbot_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 perform 1 from public.chatbot_editor_state where singleton and revision=p_expected_revision for update;
 if not found then raise exception 'DRAFT_CONFLICT' using errcode='40001'; end if;
 select v.payload into payload from public.chatbot_versions v where v.id=p_version_id;
 if not found then raise exception 'Version not found'; end if;
 update public.chatbot_editor_state set draft=payload,revision=revision+1,reviewed_revision=null,source_version_id=p_version_id,updated_by=auth.uid(),updated_at=now() where singleton;
 return public.get_chatbot_admin_state();
end; $$;

revoke all on function public.get_chatbot_admin_state(),public.save_chatbot_draft(jsonb,bigint),public.review_chatbot_draft(bigint),public.publish_chatbot_draft(bigint,bigint,text),public.list_chatbot_versions(bigint),public.restore_chatbot_version(bigint,bigint) from public,anon;
grant execute on function public.get_chatbot_admin_state(),public.save_chatbot_draft(jsonb,bigint),public.review_chatbot_draft(bigint),public.publish_chatbot_draft(bigint,bigint,text),public.list_chatbot_versions(bigint),public.restore_chatbot_version(bigint,bigint) to authenticated;

-- Existing inquiries stay private. Admins can read and change only the handling status.
grant select on public.chatbot_inquiries to authenticated;
grant update(status) on public.chatbot_inquiries to authenticated;
drop policy if exists chatbot_admin_read_inquiries on public.chatbot_inquiries;
create policy chatbot_admin_read_inquiries on public.chatbot_inquiries for select to authenticated using ((select public.is_chatbot_admin()));
drop policy if exists chatbot_admin_update_inquiries on public.chatbot_inquiries;
create policy chatbot_admin_update_inquiries on public.chatbot_inquiries for update to authenticated using ((select public.is_chatbot_admin())) with check ((select public.is_chatbot_admin()));
create index if not exists chatbot_inquiries_created_at_idx on public.chatbot_inquiries(created_at desc,request_id);
commit;
