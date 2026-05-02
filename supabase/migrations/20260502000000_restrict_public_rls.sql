-- Public order pages are rendered server-side with the service role.
-- Do not expose clients, orders, or payments directly to anon REST queries.

drop policy if exists "public_read_order_by_token" on orders;
drop policy if exists "public_read_payments_by_order" on payments;
drop policy if exists "public_read_client_by_order" on clients;
