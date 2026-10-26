-- Apply after chatbot-admin.sql. Existing research notes are not migrated as real reviews.
begin;
create table if not exists public.visitor_reviews (
  request_id uuid primary key,
  resource text not null check (resource in ('oryukdo','beomeosa','taejongdae')),
  nickname text not null check (char_length(btrim(nickname)) between 1 and 20),
  message text not null check (char_length(btrim(message)) between 10 and 600),
  status text not null default 'pending' check (status in ('pending','published','hidden')),
  created_at timestamptz not null default now()
);
alter table public.visitor_reviews enable row level security;
revoke all on public.visitor_reviews from public, anon, authenticated;
create index if not exists visitor_reviews_resource_date_idx on public.visitor_reviews(resource,created_at desc,request_id);
create or replace function public.submit_visitor_review(p_request_id uuid,p_resource text,p_nickname text,p_message text,p_consent boolean) returns uuid
language plpgsql security definer set search_path='' as $$
begin
  if p_consent is distinct from true or p_request_id is null then raise exception 'Public review consent required'; end if;
  insert into public.visitor_reviews(request_id,resource,nickname,message)
  values(p_request_id,p_resource,coalesce(nullif(btrim(p_nickname),''),'방문자'),btrim(p_message))
  on conflict(request_id) do nothing;
  return p_request_id;
end; $$;
revoke all on function public.submit_visitor_review(uuid,text,text,text,boolean) from public;
grant execute on function public.submit_visitor_review(uuid,text,text,text,boolean) to anon,authenticated;
create or replace function public.list_visitor_reviews(p_resource text,p_offset integer default 0)
returns table(nickname text,message text,created_at timestamptz)
language sql stable security definer set search_path='' as $$
  select r.nickname,r.message,r.created_at from public.visitor_reviews r
  where r.resource=p_resource and r.status='published'
  order by r.created_at desc,r.request_id limit 20 offset greatest(0,least(p_offset,10000));
$$;
revoke all on function public.list_visitor_reviews(text,integer) from public;
grant execute on function public.list_visitor_reviews(text,integer) to anon,authenticated;
grant select on public.visitor_reviews to authenticated;
grant update(status) on public.visitor_reviews to authenticated;
drop policy if exists visitor_reviews_admin_read on public.visitor_reviews;
create policy visitor_reviews_admin_read on public.visitor_reviews for select to authenticated using ((select public.is_chatbot_admin()));
drop policy if exists visitor_reviews_admin_status on public.visitor_reviews;
create policy visitor_reviews_admin_status on public.visitor_reviews for update to authenticated using ((select public.is_chatbot_admin())) with check ((select public.is_chatbot_admin()));
commit;
