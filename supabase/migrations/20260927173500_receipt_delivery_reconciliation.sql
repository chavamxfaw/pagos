-- Ambiguous sends are never automatically retried. Operator reconciliation and
-- its audit record commit together, guarded against stale tabs and callbacks.
create function public.resolve_receipt_delivery(
  p_payment_id uuid, p_channel text, p_expected_updated_at timestamptz,
  p_resolution text, p_reference text, p_note text, p_actor_id uuid
) returns void language plpgsql security invoker set search_path = '' as $$
declare
  delivery public.payment_receipt_deliveries%rowtype;
  target record;
begin
  if not exists(select 1 from public.app_admin_users where user_id=p_actor_id) then
    raise exception 'Not authorized' using errcode='42501';
  end if;
  if p_channel not in ('email','whatsapp') or p_resolution not in ('sent','skipped')
     or length(trim(coalesce(p_note,''))) not between 10 and 500
     or length(coalesce(p_reference,'')) > 200
     or (p_resolution='sent' and length(trim(coalesce(p_reference,''))) < 3) then
    raise exception 'Invalid reconciliation';
  end if;
  select * into delivery from public.payment_receipt_deliveries
    where payment_id=p_payment_id and channel=p_channel for update;
  if not found or delivery.updated_at is distinct from p_expected_updated_at
    or not (delivery.status='unknown' or (delivery.status='sending' and delivery.updated_at < now()-interval '15 minutes')) then
    raise exception 'Delivery changed or is not ready for review';
  end if;
  select p.order_id,o.client_id into strict target from public.payments p
    join public.orders o on o.id=p.order_id where p.id=p_payment_id;
  update public.payment_receipt_deliveries
    set status=p_resolution,provider_id=coalesce(nullif(trim(p_reference),''),provider_id),updated_at=now()
    where payment_id=p_payment_id and channel=p_channel;
  insert into public.activity_logs(entity_type,entity_id,client_id,order_id,payment_id,event_type,message,metadata)
    values('payment',p_payment_id,target.client_id,target.order_id,p_payment_id,'receipt_delivery_reconciled',
      'Recibo revisado manualmente; no se realizó un nuevo envío.',
      jsonb_build_object('actor_id',p_actor_id,'channel',p_channel,'previous_status',delivery.status,
        'resolution',p_resolution,'reference',nullif(trim(p_reference),''),'note',trim(p_note)));
end $$;
revoke all on function public.resolve_receipt_delivery(uuid,text,timestamptz,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.resolve_receipt_delivery(uuid,text,timestamptz,text,text,text,uuid) to service_role;
create index payment_receipt_deliveries_review on public.payment_receipt_deliveries(updated_at)
  where status in ('sending','unknown');
