-- Additive migration after visitor-reviews.sql. No records are physically deleted.
begin;
alter table public.visitor_reviews add column if not exists deleted_at timestamptz;
create or replace function public.list_visitor_reviews(p_resource text,p_offset integer default 0)
returns table(nickname text,message text,created_at timestamptz)
language sql stable security definer set search_path='' as $$
  select r.nickname,r.message,r.created_at from public.visitor_reviews r
  where r.resource=p_resource and r.status='published' and r.deleted_at is null
  order by r.created_at desc,r.request_id limit 20 offset greatest(0,least(p_offset,10000));
$$;
revoke all on function public.list_visitor_reviews(text,integer) from public;
grant execute on function public.list_visitor_reviews(text,integer) to anon,authenticated;
create or replace function public.set_visitor_review_deleted(p_request_id uuid,p_deleted boolean) returns uuid
language plpgsql security definer set search_path='' as $$
begin
  if not public.is_chatbot_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
  if p_request_id is null or p_deleted is null then raise exception 'Invalid review request'; end if;
  if p_deleted then
    update public.visitor_reviews set deleted_at=coalesce(deleted_at,now()) where request_id=p_request_id;
  else
    -- Restoring a review never automatically re-publishes it.
    update public.visitor_reviews set deleted_at=null,status='pending' where request_id=p_request_id and deleted_at is not null;
  end if;
  if not found then raise exception 'Review not found'; end if;
  return p_request_id;
end; $$;
revoke all on function public.set_visitor_review_deleted(uuid,boolean) from public,anon;
grant execute on function public.set_visitor_review_deleted(uuid,boolean) to authenticated;
commit;
