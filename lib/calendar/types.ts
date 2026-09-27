export type EventType = {
 id: string; owner_user_id: string; slug: string; title: string; description: string;
 duration_minutes: number; buffer_minutes: number; notice_hours: number; horizon_days: number;
 timezone: string; weekdays: number[]; start_hour: number; end_hour: number;
 destination_calendar_id: string; enabled: boolean;
}
export type ConnectedCalendar = { id: string; owner_user_id: string; connection_id: string; google_calendar_id: string; name: string; access_role: string; blocks_availability: boolean }
export type Booking = { id: string; owner_user_id: string; event_type_id: string; destination_calendar_id?: string; client_id: string|null; guest_name: string; guest_email: string; guest_phone: string | null; notes: string; starts_at: string; ends_at: string; status: 'pending'|'syncing'|'confirmed'|'sync_failed'|'cancelling'|'cancelled'; management_token: string; google_event_id: string | null; request_hash: string; contact_link_status:'unverified'|'legacy_unverified'|'approved'; recovery_attempts:number; next_retry_at:string|null; recovery_review_required:boolean; last_sync_error:'sync_failed'|'cancel_failed'|'lease_expired'|'dependency_unavailable'|null; sync_claim_token:string|null; sync_started_at:string|null }
export type Busy = { start: string; end: string }
