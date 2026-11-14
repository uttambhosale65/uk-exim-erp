CREATE FUNCTION public.reject_stock_movement_event_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Stock movement events are append-only; post a compensating event instead';
END;
$$;

CREATE TRIGGER stock_movement_events_append_only
BEFORE UPDATE OR DELETE ON public.stock_movement_events
FOR EACH ROW EXECUTE FUNCTION public.reject_stock_movement_event_mutation();
