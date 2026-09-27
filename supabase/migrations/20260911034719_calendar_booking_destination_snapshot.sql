-- Keep the original destination even when a booking link is edited later.
alter table public.calendar_bookings add column destination_calendar_id uuid;
update public.calendar_bookings b set destination_calendar_id=e.destination_calendar_id
from public.booking_event_types e where e.id=b.event_type_id;
alter table public.calendar_bookings alter column destination_calendar_id set not null;
alter table public.calendar_bookings add foreign key(owner_user_id,destination_calendar_id)
references public.connected_calendars(owner_user_id,id);
create function public.snapshot_booking_calendar() returns trigger language plpgsql
security invoker set search_path=public as $$
begin
 if TG_OP='INSERT' then
   select destination_calendar_id into new.destination_calendar_id from public.booking_event_types
   where id=new.event_type_id and owner_user_id=new.owner_user_id;
 elsif new.destination_calendar_id is distinct from old.destination_calendar_id then
   raise exception 'booking_destination_is_immutable';
 end if;
 return new;
end $$;
revoke all on function public.snapshot_booking_calendar() from public, anon, authenticated;
create trigger calendar_booking_destination before insert or update of destination_calendar_id
on public.calendar_bookings for each row execute function public.snapshot_booking_calendar();
