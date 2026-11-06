-- Index the queue recipient foreign key for cleanup and user-scoped maintenance queries.
CREATE INDEX IF NOT EXISTS vibenest_email_queue_recipient_id_idx
  ON public.vibenest_email_notification_queue (recipient_id);
