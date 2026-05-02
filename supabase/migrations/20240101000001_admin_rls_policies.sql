-- Políticas para el usuario admin autenticado: acceso total a todas las tablas

create policy "admin_all_clients"
on clients for all
to authenticated
using (true)
with check (true);

create policy "admin_all_orders"
on orders for all
to authenticated
using (true)
with check (true);

create policy "admin_all_payments"
on payments for all
to authenticated
using (true)
with check (true);
