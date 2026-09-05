-- Membership is deliberately one company per account in this release.
ALTER TABLE users ADD CONSTRAINT users_company_role_check CHECK (
  (role::text = 'PLATFORM_ADMIN' AND company_id IS NULL AND mfa_secret IS NOT NULL)
  OR (role::text IN ('ADMIN', 'EMPLOYEE') AND company_id IS NOT NULL)
);

CREATE FUNCTION prevent_company_transfer() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    RAISE EXCEPTION 'Company membership cannot be transferred';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER users_company_immutable BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION prevent_company_transfer();
CREATE TRIGGER baustellen_company_immutable BEFORE UPDATE ON baustellen
FOR EACH ROW EXECUTE FUNCTION prevent_company_transfer();

CREATE FUNCTION check_time_entry_company() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_company text;
BEGIN
  SELECT company_id INTO owner_company FROM users WHERE id = NEW.user_id;
  IF owner_company IS NULL THEN RAISE EXCEPTION 'Company user required'; END IF;
  IF NEW.baustelle_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM baustellen WHERE id = NEW.baustelle_id AND company_id = owner_company
  ) THEN RAISE EXCEPTION 'Construction site must belong to the same company'; END IF;
  IF EXISTS (SELECT 1 FROM work_timers WHERE time_entry_id = NEW.id AND user_id <> NEW.user_id)
    THEN RAISE EXCEPTION 'Timer entry owner cannot be changed'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER time_entries_company_check BEFORE INSERT OR UPDATE ON time_entries
FOR EACH ROW EXECUTE FUNCTION check_time_entry_company();

CREATE FUNCTION check_timer_owner() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.user_id AND company_id IS NOT NULL)
    THEN RAISE EXCEPTION 'Company user required'; END IF;
  IF NEW.time_entry_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM time_entries WHERE id = NEW.time_entry_id AND user_id = NEW.user_id
  ) THEN RAISE EXCEPTION 'Timer and entry must have the same owner'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER work_timers_owner_check BEFORE INSERT OR UPDATE ON work_timers
FOR EACH ROW EXECUTE FUNCTION check_timer_owner();
