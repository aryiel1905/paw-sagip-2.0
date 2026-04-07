--
-- PostgreSQL database dump
--

\restrict GowU0tq7K0n1GlpZIG9A6dCRO0QDPjmLgPdebOJBx68hxkqDCBLB9byG0HeM7bU

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.0

-- Started on 2026-03-04 11:27:38

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 34 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- TOC entry 1103 (class 1247 OID 53652)
-- Name: adoption_application_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.adoption_application_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE public.adoption_application_status OWNER TO postgres;

--
-- TOC entry 1106 (class 1247 OID 53660)
-- Name: pet_status_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.pet_status_type AS ENUM (
    'roaming',
    'in_custody'
);


ALTER TYPE public.pet_status_type OWNER TO postgres;

--
-- TOC entry 1109 (class 1247 OID 53666)
-- Name: report_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.report_status AS ENUM (
    'open',
    'assigned',
    'in_review',
    'resolved',
    'rescued',
    'closed'
);


ALTER TYPE public.report_status OWNER TO postgres;

--
-- TOC entry 325 (class 1255 OID 53732)
-- Name: delete_alerts_for_report(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.delete_alerts_for_report() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
delete from public.alerts
where source_table = 'reports'
and source_id = old.id;
return old;
end;
$$;


ALTER FUNCTION public.delete_alerts_for_report() OWNER TO postgres;

--
-- TOC entry 404 (class 1255 OID 53733)
-- Name: fn_adoption_applications_set_updated(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_adoption_applications_set_updated() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin new.updated_at = now(); return new; end $$;


ALTER FUNCTION public.fn_adoption_applications_set_updated() OWNER TO postgres;

--
-- TOC entry 326 (class 1255 OID 53734)
-- Name: fn_alerts_sync_from_adoptions_del(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_alerts_sync_from_adoptions_del() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  delete from public.alerts where source_table = 'adoption_pets' and source_id = OLD.id;
  return null;
end $$;


ALTER FUNCTION public.fn_alerts_sync_from_adoptions_del() OWNER TO postgres;

--
-- TOC entry 358 (class 1255 OID 53735)
-- Name: fn_alerts_sync_from_adoptions_ins_upd(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_alerts_sync_from_adoptions_ins_upd() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if NEW.status = 'available' then
    insert into public.alerts (
      created_at, report_type, location, photo_path, landmark_media_paths,
      pet_name, species, description, latitude, longitude, source_table, source_id
    )
    values (
      coalesce(NEW.created_at, now()),
      'adoption',
      NEW.location,
      NEW.photo_path,
      coalesce(NEW.landmark_media_paths, '{}'),
      NEW.pet_name,
      NEW.species,
      NEW.features,
      NEW.latitude,
      NEW.longitude,
      'adoption_pets',
      NEW.id
    )
    on conflict (source_table, source_id) do update set
      created_at = excluded.created_at,
      location = excluded.location,
      photo_path = excluded.photo_path,
      landmark_media_paths = excluded.landmark_media_paths,
      pet_name = excluded.pet_name,
      species = excluded.species,
      description = excluded.description,
      latitude = excluded.latitude,
      longitude = excluded.longitude;
  else
    delete from public.alerts where source_table = 'adoption_pets' and source_id = NEW.id;
  end if;
  return null;
end $$;


ALTER FUNCTION public.fn_alerts_sync_from_adoptions_ins_upd() OWNER TO postgres;

--
-- TOC entry 329 (class 1255 OID 53736)
-- Name: fn_alerts_sync_from_reports_del(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_alerts_sync_from_reports_del() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  delete from public.alerts where source_table = 'reports' and source_id = OLD.id;
  return null;
end $$;


ALTER FUNCTION public.fn_alerts_sync_from_reports_del() OWNER TO postgres;

--
-- TOC entry 334 (class 1255 OID 53737)
-- Name: fn_alerts_sync_from_reports_ins_upd(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_alerts_sync_from_reports_ins_upd() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if NEW.report_type in ('lost','found','cruelty')
     or (NEW.report_type = 'adoption' and NEW.promoted_to_pet_id is null) then
    insert into public.alerts (
      created_at, report_type, location, photo_path, landmark_media_paths,
      pet_name, species, description, latitude, longitude, source_table, source_id
    )
    values (
      coalesce(NEW.created_at, now()),
      NEW.report_type, NEW.location, NEW.photo_path, coalesce(NEW.landmark_media_paths, '{}'),
      NEW.pet_name, NEW.species, NEW.description, NEW.latitude, NEW.longitude,
      'reports', NEW.id
    )
    on conflict (source_table, source_id) do update set
      created_at = excluded.created_at,
      report_type = excluded.report_type,
      location = excluded.location,
      photo_path = excluded.photo_path,
      landmark_media_paths = excluded.landmark_media_paths,
      pet_name = excluded.pet_name,
      species = excluded.species,
      description = excluded.description,
      latitude = excluded.latitude,
      longitude = excluded.longitude;
  end if;
  return null;
end $$;


ALTER FUNCTION public.fn_alerts_sync_from_reports_ins_upd() OWNER TO postgres;

--
-- TOC entry 377 (class 1255 OID 53738)
-- Name: fn_profiles_mirror_ad(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_profiles_mirror_ad() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
-- remove all memberships for any role
DELETE FROM public.team_members WHERE profile_id = OLD.id;

-- remove shelter (cascades teams/members) if this was a shelter profile
IF OLD.role = 'shelter' AND OLD.shelter_id IS NOT NULL THEN
DELETE FROM public.shelters WHERE id = OLD.shelter_id;
END IF;

RETURN NULL;
END
$$;


ALTER FUNCTION public.fn_profiles_mirror_ad() OWNER TO postgres;

--
-- TOC entry 372 (class 1255 OID 53739)
-- Name: fn_profiles_mirror_aiu(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_profiles_mirror_aiu() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
v_brg_id uuid;
v_team_id uuid;
v_team_name text;
v_shelter_id uuid;
v_shelter_name text;
BEGIN
-- normalize role
IF NEW.role IS NOT NULL AND NEW.role <> lower(NEW.role) THEN
UPDATE public.profiles SET role = lower(NEW.role) WHERE id = NEW.id;
NEW.role := lower(NEW.role);
END IF;

-- ensure barangay by name if role requires
IF NEW.role IN ('shelter','rescuer','barangay-admin') THEN
IF NEW.barangay_id IS NULL AND coalesce(NEW.barangay_name,'') <> '' THEN
INSERT INTO public.barangays(name, is_active)
VALUES (NEW.barangay_name, true)
ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
RETURNING id INTO v_brg_id;
UPDATE public.profiles SET barangay_id = v_brg_id WHERE id = NEW.id;
NEW.barangay_id := v_brg_id;
END IF;
END IF;

-- role-change cleanup ONLY on UPDATE
IF TG_OP = 'UPDATE' THEN
IF coalesce(OLD.role,'') <> coalesce(NEW.role,'') THEN
DELETE FROM public.team_members WHERE profile_id = NEW.id;

  IF OLD.role = 'shelter' AND OLD.shelter_id IS NOT NULL THEN
    UPDATE public.profiles SET shelter_id = NULL WHERE id = NEW.id;
    DELETE FROM public.shelters s
    WHERE s.id = OLD.shelter_id
      AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.shelter_id = s.id);
  END IF;
END IF;
END IF;

-- per-role mirror
IF NEW.role = 'shelter' THEN
IF NEW.barangay_id IS NULL THEN RETURN NEW; END IF;

v_shelter_name := coalesce(nullif(trim(NEW.display_name),''), coalesce(NEW.email,'Unnamed Shelter'));

IF NEW.shelter_id IS NOT NULL THEN
  UPDATE public.shelters
  SET name = v_shelter_name, barangay_id = NEW.barangay_id, is_active = true
  WHERE id = NEW.shelter_id;
  v_shelter_id := NEW.shelter_id;
ELSE
  INSERT INTO public.shelters(name, barangay_id, is_active)
  VALUES (v_shelter_name, NEW.barangay_id, true)
  ON CONFLICT (name, barangay_id) DO UPDATE SET name = EXCLUDED.name, is_active = true
  RETURNING id INTO v_shelter_id;
  UPDATE public.profiles SET shelter_id = v_shelter_id WHERE id = NEW.id;
END IF;

v_team_name := 'Shelter Team: ' || v_shelter_name;
INSERT INTO public.teams(name, barangay_id, shelter_id, is_active)
VALUES (v_team_name, NEW.barangay_id, v_shelter_id, true)
ON CONFLICT (name, barangay_id) DO UPDATE SET shelter_id = EXCLUDED.shelter_id, is_active = true
RETURNING id INTO v_team_id;
UPDATE public.teams SET name = v_team_name WHERE id = v_team_id AND name <> v_team_name;

INSERT INTO public.team_members(team_id, profile_id, joined_at)
VALUES (v_team_id, NEW.id, now())
ON CONFLICT (team_id, profile_id) DO NOTHING;

IF TG_OP = 'UPDATE' AND OLD.shelter_id IS NOT NULL AND OLD.shelter_id <> v_shelter_id THEN
  DELETE FROM public.shelters s
  WHERE s.id = OLD.shelter_id
    AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.shelter_id = s.id);
END IF;
ELSIF NEW.role = 'rescuer' THEN
IF NEW.barangay_id IS NULL THEN RETURN NEW; END IF;

v_team_name := 'Barangay Rescuers';
IF TG_OP = 'UPDATE' AND (OLD.barangay_id IS DISTINCT FROM NEW.barangay_id) THEN
  DELETE FROM public.team_members tm
  USING public.teams t
  WHERE tm.team_id = t.id AND tm.profile_id = NEW.id
    AND t.name = v_team_name
    AND (t.barangay_id IS NOT DISTINCT FROM OLD.barangay_id);
END IF;

INSERT INTO public.teams(name, barangay_id, is_active)
VALUES (v_team_name, NEW.barangay_id, true)
ON CONFLICT (name, barangay_id) DO UPDATE SET is_active = true
RETURNING id INTO v_team_id;

INSERT INTO public.team_members(team_id, profile_id, joined_at)
VALUES (v_team_id, NEW.id, now())
ON CONFLICT (team_id, profile_id) DO NOTHING;
ELSIF NEW.role = 'barangay-admin' THEN
IF NEW.barangay_id IS NULL THEN RETURN NEW; END IF;

v_team_name := 'Barangay Admins';
IF TG_OP = 'UPDATE' AND (OLD.barangay_id IS DISTINCT FROM NEW.barangay_id) THEN
  DELETE FROM public.team_members tm
  USING public.teams t
  WHERE tm.team_id = t.id AND tm.profile_id = NEW.id
    AND t.name = v_team_name
    AND (t.barangay_id IS NOT DISTINCT FROM OLD.barangay_id);
END IF;

INSERT INTO public.teams(name, barangay_id, is_active)
VALUES (v_team_name, NEW.barangay_id, true)
ON CONFLICT (name, barangay_id) DO UPDATE SET is_active = true
RETURNING id INTO v_team_id;

INSERT INTO public.team_members(team_id, profile_id, joined_at)
VALUES (v_team_id, NEW.id, now())
ON CONFLICT (team_id, profile_id) DO NOTHING;
END IF;

RETURN NEW;
END
$$;


ALTER FUNCTION public.fn_profiles_mirror_aiu() OWNER TO postgres;

--
-- TOC entry 432 (class 1255 OID 53740)
-- Name: fn_profiles_mirror_biu(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_profiles_mirror_biu() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
v_brg_id uuid;
v_team_id uuid;
v_team_name text;
v_shelter_id uuid;
v_shelter_name text;
BEGIN
-- normalize role
IF NEW.role IS NOT NULL THEN
NEW.role := lower(NEW.role);
END IF;

-- Ensure barangay row by name if needed
IF NEW.role IN ('shelter','rescuer','barangay-admin') THEN
IF NEW.barangay_id IS NULL AND coalesce(NEW.barangay_name,'') <> '' THEN
INSERT INTO public.barangays(name, is_active)
VALUES (NEW.barangay_name, true)
ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
RETURNING id INTO v_brg_id;
NEW.barangay_id := coalesce(NEW.barangay_id, v_brg_id);
END IF;
END IF;

-- If role changed, clean old mirrors first
IF TG_OP = 'UPDATE' AND coalesce(OLD.role,'') <> coalesce(NEW.role,'') THEN
-- Remove all memberships of this profile (we’ll re-add as needed)
DELETE FROM public.team_members WHERE profile_id = OLD.id;

-- If leaving 'shelter', remove the old shelter entirely
IF OLD.role = 'shelter' AND OLD.shelter_id IS NOT NULL THEN
  DELETE FROM public.shelters WHERE id = OLD.shelter_id; -- cascades teams + members
  NEW.shelter_id := NULL;
END IF;
END IF;

-- Per-role mirror
IF NEW.role = 'shelter' THEN
IF NEW.barangay_id IS NULL THEN
RETURN NEW; -- cannot mirror shelter without barangay
END IF;

v_shelter_name := coalesce(nullif(trim(NEW.display_name),''), coalesce(NEW.email,'Unnamed Shelter'));

-- Prefer updating existing shelter if linked; otherwise upsert by (name, barangay)
IF NEW.shelter_id IS NOT NULL THEN
  UPDATE public.shelters
  SET name = v_shelter_name, barangay_id = NEW.barangay_id, is_active = true
  WHERE id = NEW.shelter_id;
  v_shelter_id := NEW.shelter_id;
ELSE
  INSERT INTO public.shelters(name, barangay_id, is_active)
  VALUES (v_shelter_name, NEW.barangay_id, true)
  ON CONFLICT (name, barangay_id) DO UPDATE SET name = EXCLUDED.name, is_active = true
  RETURNING id INTO v_shelter_id;
  NEW.shelter_id := v_shelter_id;
END IF;

-- Ensure a shelter-scoped team and membership
v_team_name := 'Shelter Team: ' || v_shelter_name;
INSERT INTO public.teams(name, barangay_id, shelter_id, is_active)
VALUES (v_team_name, NEW.barangay_id, v_shelter_id, true)
ON CONFLICT (name, barangay_id) DO UPDATE SET shelter_id = EXCLUDED.shelter_id, is_active = true
RETURNING id INTO v_team_id;

-- If name changed, ensure team name matches
UPDATE public.teams SET name = v_team_name
WHERE id = v_team_id AND name <> v_team_name;

INSERT INTO public.team_members(team_id, profile_id, joined_at)
VALUES (v_team_id, NEW.id, now())
ON CONFLICT (team_id, profile_id) DO NOTHING;
ELSIF NEW.role = 'rescuer' THEN
IF NEW.barangay_id IS NULL THEN
RETURN NEW;
END IF;

v_team_name := 'Barangay Rescuers';

-- If barangay moved, drop membership from old barangay's rescuers team
IF TG_OP = 'UPDATE' AND (OLD.barangay_id IS DISTINCT FROM NEW.barangay_id) THEN
  DELETE FROM public.team_members tm
  USING public.teams t
  WHERE tm.team_id = t.id
    AND tm.profile_id = NEW.id
    AND t.name = v_team_name
    AND (t.barangay_id IS NOT DISTINCT FROM OLD.barangay_id);
END IF;

INSERT INTO public.teams(name, barangay_id, is_active)
VALUES (v_team_name, NEW.barangay_id, true)
ON CONFLICT (name, barangay_id) DO UPDATE SET is_active = true
RETURNING id INTO v_team_id;

INSERT INTO public.team_members(team_id, profile_id, joined_at)
VALUES (v_team_id, NEW.id, now())
ON CONFLICT (team_id, profile_id) DO NOTHING;
ELSIF NEW.role = 'barangay-admin' THEN
IF NEW.barangay_id IS NULL THEN
RETURN NEW;
END IF;

v_team_name := 'Barangay Admins';

IF TG_OP = 'UPDATE' AND (OLD.barangay_id IS DISTINCT FROM NEW.barangay_id) THEN
  DELETE FROM public.team_members tm
  USING public.teams t
  WHERE tm.team_id = t.id
    AND tm.profile_id = NEW.id
    AND t.name = v_team_name
    AND (t.barangay_id IS NOT DISTINCT FROM OLD.barangay_id);
END IF;

INSERT INTO public.teams(name, barangay_id, is_active)
VALUES (v_team_name, NEW.barangay_id, true)
ON CONFLICT (name, barangay_id) DO UPDATE SET is_active = true
RETURNING id INTO v_team_id;

INSERT INTO public.team_members(team_id, profile_id, joined_at)
VALUES (v_team_id, NEW.id, now())
ON CONFLICT (team_id, profile_id) DO NOTHING;
END IF;

RETURN NEW;
END
$$;


ALTER FUNCTION public.fn_profiles_mirror_biu() OWNER TO postgres;

--
-- TOC entry 324 (class 1255 OID 54803)
-- Name: fn_qr_cards_set_updated(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_qr_cards_set_updated() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin new.updated_at = now(); return new; end $$;


ALTER FUNCTION public.fn_qr_cards_set_updated() OWNER TO postgres;

--
-- TOC entry 340 (class 1255 OID 53741)
-- Name: fn_reports_auto_promote_before_update(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_reports_auto_promote_before_update() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  v_new_pet_id uuid;
begin
  -- Only when switching (or setting) to 'adoption' and not yet promoted
  if NEW.report_type = 'adoption' and NEW.promoted_to_pet_id is null then
    insert into public.adoption_pets (
      species, pet_name, age_size, features, location, status,
      photo_path, landmark_media_paths, latitude, longitude
    )
    values (
      NEW.species,
      NEW.pet_name,
      NEW.age_size,
      coalesce(nullif(NEW.features, ''), NEW.description),
      NEW.location,
      'available',
      NEW.photo_path,
      coalesce(NEW.landmark_media_paths, '{}'),
      NEW.latitude,
      NEW.longitude
    )
    returning id into v_new_pet_id;

    -- attach pointer so it won't re‑promote or double‑alert
    NEW.promoted_to_pet_id := v_new_pet_id;

    -- remove any existing report‑sourced alert; the adoption_pets trigger will add the new one
    delete from public.alerts where source_table = 'reports' and source_id = NEW.id;
  end if;

  return NEW;
end $$;


ALTER FUNCTION public.fn_reports_auto_promote_before_update() OWNER TO postgres;

--
-- TOC entry 442 (class 1255 OID 53742)
-- Name: fn_set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin new.updated_at = now(); return new; end $$;


ALTER FUNCTION public.fn_set_updated_at() OWNER TO postgres;

--
-- TOC entry 361 (class 1255 OID 53743)
-- Name: fn_sync_pet_availability_from_applications(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_sync_pet_availability_from_applications() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
  other_pending int;
  other_approved int;
begin
  if (tg_op = 'INSERT' or tg_op = 'UPDATE') then
    if new.status = 'approved' then
      update public.adoption_pets set status = 'adopted' where id = new.pet_id;

    elsif new.status = 'pending' then
      update public.adoption_pets set status = 'unavailable'
      where id = new.pet_id and status <> 'adopted';

    elsif new.status = 'rejected' then
      select count(*) filter (where status='pending')
           , count(*) filter (where status='approved')
        into other_pending, other_approved
      from public.adoption_applications
      where pet_id = new.pet_id
        and id <> new.id;

      if coalesce(other_approved,0) = 0 and coalesce(other_pending,0) = 0 then
        update public.adoption_pets set status = 'available'
        where id = new.pet_id and status <> 'adopted';
      end if;
    end if;
  end if;
  return new;
end $$;


ALTER FUNCTION public.fn_sync_pet_availability_from_applications() OWNER TO postgres;

--
-- TOC entry 437 (class 1255 OID 53744)
-- Name: fn_upsert_barangay_by_name(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_upsert_barangay_by_name(p_name text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
v_id uuid;
begin
if p_name is null or length(btrim(p_name)) = 0 then
return null;
end if;

select id into v_id
from public.barangays
where lower(name) = lower(btrim(p_name))
limit 1;

if v_id is null then
insert into public.barangays (name)
values (btrim(p_name))
returning id into v_id;
end if;

return v_id;
end $$;


ALTER FUNCTION public.fn_upsert_barangay_by_name(p_name text) OWNER TO postgres;

--
-- TOC entry 383 (class 1255 OID 53745)
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
BEGIN
INSERT INTO public.profiles (id, email, display_name, role, created_at)
VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NULL, NOW())
ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
-- swallow to avoid breaking Auth; you can log to a table if you want
PERFORM 1;
END;
RETURN NEW;
END
$$;


ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

--
-- TOC entry 435 (class 1255 OID 53746)
-- Name: profile_sync_email_from_auth(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.profile_sync_email_from_auth() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
UPDATE public.profiles SET email = NEW.email WHERE id = NEW.id;
RETURN NEW;
END
$$;


ALTER FUNCTION public.profile_sync_email_from_auth() OWNER TO postgres;

--
-- TOC entry 366 (class 1255 OID 53747)
-- Name: promote_report_to_adoption(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.promote_report_to_adoption(p_report_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  v_exists uuid;
  v_new_pet_id uuid;
begin
  -- Ensure the report exists and is an adoption report
  select promoted_to_pet_id into v_exists
  from public.reports
  where id = p_report_id and report_type = 'adoption';

  -- If already promoted, return the existing pet id
  if v_exists is not null then
    return v_exists;
  end if;

  -- Create the adoption entry from the report (curated defaults)
  insert into public.adoption_pets (
    species, pet_name, age_size, features, location,
    status, photo_path, video_thumbnail_path, landmark_media_paths, latitude, longitude
  )
  select
    r.species, r.pet_name, r.age_size, r.features, r.location,
    'available', r.photo_path, r.video_thumbnail_path, coalesce(r.landmark_media_paths, '{}'),
    r.latitude, r.longitude
  from public.reports r
  where r.id = p_report_id and r.report_type = 'adoption'
  returning id into v_new_pet_id;

  -- Mark report as promoted to avoid duplicate alerts
  update public.reports
    set promoted_to_pet_id = v_new_pet_id
  where id = p_report_id;

  -- Remove the old report-sourced alert; adoption_pets trigger will add a clean one
  delete from public.alerts
  where source_table = 'reports' and source_id = p_report_id;

  return v_new_pet_id;
end $$;


ALTER FUNCTION public.promote_report_to_adoption(p_report_id uuid) OWNER TO postgres;

--
-- TOC entry 415 (class 1255 OID 53748)
-- Name: reports_set_custom_id(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.reports_set_custom_id() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.custom_id IS NULL OR NEW.custom_id = '' THEN
    NEW.custom_id := 'RPRT_' || to_char(COALESCE(NEW.created_at, now()), 'MM_DD_YYYY') || '_' ||
                     lpad(nextval('public.report_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.reports_set_custom_id() OWNER TO postgres;

--
-- TOC entry 339 (class 1255 OID 53749)
-- Name: sync_alert_pet_status_from_reports(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sync_alert_pet_status_from_reports() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
update public.alerts a
set pet_status = new.pet_status
where a.source_table = 'reports'
and a.source_id = new.id;
return new;
end
$$;


ALTER FUNCTION public.sync_alert_pet_status_from_reports() OWNER TO postgres;

--
-- TOC entry 402 (class 1255 OID 53750)
-- Name: sync_alert_status_from_report(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sync_alert_status_from_report() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
if tg_op = 'UPDATE' then
if new.status is distinct from old.status then
update public.alerts
set status = new.status
where source_table = 'reports'
and source_id = new.id;
end if;
return new;
elsif tg_op = 'INSERT' then
-- Ensure any existing linked alert gets the initial status
update public.alerts
set status = new.status
where source_table = 'reports'
and source_id = new.id;
return new;
end if;
return new;
end$$;


ALTER FUNCTION public.sync_alert_status_from_report() OWNER TO postgres;

--
-- TOC entry 412 (class 1255 OID 53751)
-- Name: trg_profiles_sync_barangay(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trg_profiles_sync_barangay() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
v_name text;
begin
-- name -> id
if new.barangay_id is null and new.barangay_name is not null then
new.barangay_id := public.fn_upsert_barangay_by_name(new.barangay_name);
end if;

-- id -> name
if new.barangay_id is not null and (new.barangay_name is null or length(btrim(new.barangay_name)) = 0) then
select name into v_name from public.barangays where id = new.barangay_id;
new.barangay_name := v_name;
end if;

-- both provided: normalize to canonical name
if new.barangay_id is not null and new.barangay_name is not null then
select name into v_name from public.barangays where id = new.barangay_id;
if v_name is not null then
new.barangay_name := v_name;
end if;
end if;

return new;
end $$;


ALTER FUNCTION public.trg_profiles_sync_barangay() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 287 (class 1259 OID 53931)
-- Name: adoption_applications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.adoption_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status public.adoption_application_status DEFAULT 'pending'::public.adoption_application_status NOT NULL,
    terms_accepted boolean DEFAULT false NOT NULL,
    pet_id uuid NOT NULL,
    applicant_id uuid,
    applicant_name text,
    first_name text,
    last_name text,
    address text,
    phone text,
    email text,
    birth_date date,
    occupation text,
    company text,
    social_profile text,
    civil_status text,
    pronouns text,
    adopted_before boolean,
    prompted_by text[],
    adopt_what text,
    specific_shelter_animal boolean,
    ideal_pet text,
    home_type text,
    rents boolean,
    move_plan text,
    live_with text[],
    allergies boolean,
    family_supports boolean,
    daily_care_by text,
    financial_responsible text,
    vacation_caregiver text,
    hours_alone text,
    intro_steps text,
    has_pets_now boolean,
    had_pets_past boolean,
    home_photo_paths text[] DEFAULT '{}'::text[] NOT NULL,
    id_document_type text,
    id_document_path text,
    id_document_verified boolean DEFAULT false,
    id_document_verified_at timestamp with time zone,
    id_document_notes text,
    CONSTRAINT adoption_applications_status_check CHECK ((status = ANY (ARRAY['pending'::public.adoption_application_status, 'approved'::public.adoption_application_status, 'rejected'::public.adoption_application_status])))
);


ALTER TABLE public.adoption_applications OWNER TO postgres;

--
-- TOC entry 288 (class 1259 OID 53944)
-- Name: adoption_pets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.adoption_pets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    species text,
    pet_name text,
    age_size text,
    features text,
    location text,
    emoji_code text,
    status text DEFAULT 'available'::text NOT NULL,
    photo_path text,
    video_thumbnail_path text,
    landmark_media_paths text[] DEFAULT '{}'::text[] NOT NULL,
    latitude double precision,
    longitude double precision,
    posted_by uuid,
    pet_status public.pet_status_type DEFAULT 'in_custody'::public.pet_status_type NOT NULL,
    CONSTRAINT adoption_pets_status_check CHECK ((status = ANY (ARRAY['available'::text, 'unavailable'::text, 'adopted'::text, 'inactive'::text, 'reserved'::text])))
);


ALTER TABLE public.adoption_pets OWNER TO postgres;

--
-- TOC entry 289 (class 1259 OID 53956)
-- Name: alerts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    report_type text NOT NULL,
    location text,
    photo_path text,
    landmark_media_paths text[] DEFAULT '{}'::text[] NOT NULL,
    pet_name text,
    species text,
    description text,
    latitude double precision,
    longitude double precision,
    source_table text NOT NULL,
    source_id uuid NOT NULL,
    status public.report_status DEFAULT 'open'::public.report_status NOT NULL,
    pet_status public.pet_status_type DEFAULT 'roaming'::public.pet_status_type NOT NULL,
    CONSTRAINT alerts_report_type_check CHECK ((report_type = ANY (ARRAY['lost'::text, 'found'::text, 'cruelty'::text, 'adoption'::text]))),
    CONSTRAINT alerts_source_table_check CHECK ((source_table = ANY (ARRAY['reports'::text, 'adoption_pets'::text])))
);


ALTER TABLE public.alerts OWNER TO postgres;

--
-- TOC entry 290 (class 1259 OID 53968)
-- Name: barangays; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.barangays (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text,
    name text NOT NULL,
    city text,
    province text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.barangays OWNER TO postgres;

--
-- TOC entry 291 (class 1259 OID 53976)
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    display_name text,
    role text DEFAULT 'pending'::text,
    phone text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    barangay_name text,
    barangay_id uuid,
    shelter_id uuid,
    email text,
    CONSTRAINT profiles_role_check CHECK (((role IS NULL) OR (lower(role) = ANY (ARRAY['super-admin'::text, 'barangay-admin'::text, 'rescuer'::text, 'shelter'::text]))))
);

ALTER TABLE ONLY public.profiles FORCE ROW LEVEL SECURITY;


ALTER TABLE public.profiles OWNER TO postgres;

--
-- TOC entry 312 (class 1259 OID 54781)
-- Name: qr_cards; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.qr_cards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    version smallint DEFAULT 0 NOT NULL,
    payload_text text NOT NULL,
    short_code text,
    pet_id uuid,
    owner_profile_id uuid,
    owner_name text,
    owner_phone text,
    vaccinated boolean DEFAULT false NOT NULL,
    dewormed boolean DEFAULT false NOT NULL,
    revoked boolean DEFAULT false NOT NULL,
    last_printed_at timestamp with time zone,
    prints_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.qr_cards OWNER TO postgres;

--
-- TOC entry 292 (class 1259 OID 53984)
-- Name: report_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.report_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.report_seq OWNER TO postgres;

--
-- TOC entry 293 (class 1259 OID 53985)
-- Name: reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    report_type text NOT NULL,
    description text,
    condition text,
    location text,
    latitude double precision,
    longitude double precision,
    photo_path text,
    landmark_media_paths text[] DEFAULT '{}'::text[] NOT NULL,
    pet_name text,
    species text,
    breed text,
    gender text,
    age_size text,
    features text,
    event_at timestamp with time zone,
    reporter_name text,
    reporter_contact text,
    is_aggressive boolean,
    is_friendly boolean,
    is_anonymous boolean,
    promoted_to_pet_id uuid,
    user_id uuid,
    custom_id text NOT NULL,
    status public.report_status DEFAULT 'open'::public.report_status NOT NULL,
    pet_status public.pet_status_type DEFAULT 'roaming'::public.pet_status_type NOT NULL,
    is_vaccinated boolean DEFAULT false NOT NULL,
    is_spayed_neutered boolean DEFAULT false NOT NULL,
    is_dewormed boolean DEFAULT false NOT NULL,
    team_id uuid,
    geo_barangay_id uuid,
    geo_barangay_name text,
    geo_city_name text,
    geocoded_at timestamp with time zone,
    geocode_provider text,
    geocode_raw jsonb,
    CONSTRAINT reports_report_type_check CHECK ((report_type = ANY (ARRAY['lost'::text, 'found'::text, 'cruelty'::text, 'adoption'::text])))
);


ALTER TABLE public.reports OWNER TO postgres;

--
-- TOC entry 313 (class 1259 OID 55939)
-- Name: reverse_geocode_cache; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reverse_geocode_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lat5 numeric NOT NULL,
    lng5 numeric NOT NULL,
    provider text NOT NULL,
    result jsonb NOT NULL,
    matched_barangay_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.reverse_geocode_cache OWNER TO postgres;

--
-- TOC entry 294 (class 1259 OID 53999)
-- Name: shelters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shelters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    barangay_id uuid,
    name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.shelters OWNER TO postgres;

--
-- TOC entry 295 (class 1259 OID 54007)
-- Name: team_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.team_members (
    team_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.team_members OWNER TO postgres;

--
-- TOC entry 296 (class 1259 OID 54011)
-- Name: teams; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    barangay_id uuid,
    shelter_id uuid,
    name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT teams_check CHECK (((barangay_id IS NOT NULL) OR (shelter_id IS NOT NULL)))
);


ALTER TABLE public.teams OWNER TO postgres;

--
-- TOC entry 297 (class 1259 OID 54020)
-- Name: v_adoption_applicants_summary; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_adoption_applicants_summary AS
 SELECT lower(COALESCE(email, ''::text)) AS email_key,
    min(email) AS email,
    min(first_name) AS first_name,
    min(last_name) AS last_name,
    min(phone) AS phone,
    count(*) FILTER (WHERE (status = 'approved'::public.adoption_application_status)) AS approved_count,
    count(*) FILTER (WHERE (status = 'rejected'::public.adoption_application_status)) AS rejected_count,
    max(created_at) AS last_decision_at
   FROM public.adoption_applications aa
  WHERE (status = ANY (ARRAY['approved'::public.adoption_application_status, 'rejected'::public.adoption_application_status]))
  GROUP BY (lower(COALESCE(email, ''::text)))
  ORDER BY (max(created_at)) DESC;


ALTER VIEW public.v_adoption_applicants_summary OWNER TO postgres;

--
-- TOC entry 298 (class 1259 OID 54025)
-- Name: v_adoption_decisions; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_adoption_decisions AS
 SELECT aa.id AS application_id,
    aa.pet_id,
    aa.status,
    aa.created_at,
    aa.first_name,
    aa.last_name,
    aa.email,
    aa.phone,
    ap.pet_name,
    ap.species,
    ap.status AS pet_status,
    r.id AS report_id,
    r.location,
    r.team_id
   FROM ((public.adoption_applications aa
     JOIN public.adoption_pets ap ON ((ap.id = aa.pet_id)))
     LEFT JOIN public.reports r ON ((r.promoted_to_pet_id = ap.id)))
  WHERE (aa.status = ANY (ARRAY['approved'::public.adoption_application_status, 'rejected'::public.adoption_application_status]))
  ORDER BY aa.created_at DESC;


ALTER VIEW public.v_adoption_decisions OWNER TO postgres;

--
-- TOC entry 299 (class 1259 OID 54030)
-- Name: v_barangays_overview; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_barangays_overview AS
 SELECT b.id AS barangay_id,
    b.name AS barangay_name,
    count(DISTINCT
        CASE
            WHEN (p.role = 'barangay-admin'::text) THEN p.id
            ELSE NULL::uuid
        END) AS admin_count,
    ( SELECT string_agg(d.n, ', '::text ORDER BY d.n) AS string_agg
           FROM ( SELECT DISTINCT COALESCE(p2.display_name, (p2.id)::text) AS n
                   FROM public.profiles p2
                  WHERE ((p2.barangay_id = b.id) AND (p2.role = 'barangay-admin'::text))) d) AS admin_names,
    count(DISTINCT s.id) AS shelters_count,
    count(DISTINCT tm.profile_id) AS rescuer_count
   FROM ((((public.barangays b
     LEFT JOIN public.profiles p ON ((p.barangay_id = b.id)))
     LEFT JOIN public.shelters s ON ((s.barangay_id = b.id)))
     LEFT JOIN public.teams t ON ((t.barangay_id = b.id)))
     LEFT JOIN public.team_members tm ON ((tm.team_id = t.id)))
  GROUP BY b.id, b.name;


ALTER VIEW public.v_barangays_overview OWNER TO postgres;

--
-- TOC entry 300 (class 1259 OID 54035)
-- Name: v_shelters_overview; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_shelters_overview AS
 SELECT s.id AS shelter_id,
    s.name AS shelter_name,
    b.id AS barangay_id,
    b.name AS barangay_name,
    count(DISTINCT
        CASE
            WHEN (p.role = 'shelter'::text) THEN p.id
            ELSE NULL::uuid
        END) AS admin_count,
    ( SELECT string_agg(d.n, ', '::text ORDER BY d.n) AS string_agg
           FROM ( SELECT DISTINCT COALESCE(p2.display_name, (p2.id)::text) AS n
                   FROM public.profiles p2
                  WHERE ((p2.shelter_id = s.id) AND (p2.role = 'shelter'::text))) d) AS admin_names,
    count(DISTINCT tm.profile_id) AS rescuer_count
   FROM ((((public.shelters s
     LEFT JOIN public.barangays b ON ((b.id = s.barangay_id)))
     LEFT JOIN public.profiles p ON ((p.shelter_id = s.id)))
     LEFT JOIN public.teams t ON ((t.shelter_id = s.id)))
     LEFT JOIN public.team_members tm ON ((tm.team_id = t.id)))
  GROUP BY s.id, s.name, b.id, b.name;


ALTER VIEW public.v_shelters_overview OWNER TO postgres;

--
-- TOC entry 3696 (class 2606 OID 54236)
-- Name: adoption_applications adoption_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.adoption_applications
    ADD CONSTRAINT adoption_applications_pkey PRIMARY KEY (id);


--
-- TOC entry 3700 (class 2606 OID 54238)
-- Name: adoption_pets adoption_pets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.adoption_pets
    ADD CONSTRAINT adoption_pets_pkey PRIMARY KEY (id);


--
-- TOC entry 3704 (class 2606 OID 54240)
-- Name: alerts alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_pkey PRIMARY KEY (id);


--
-- TOC entry 3710 (class 2606 OID 54242)
-- Name: barangays barangays_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.barangays
    ADD CONSTRAINT barangays_code_key UNIQUE (code);


--
-- TOC entry 3712 (class 2606 OID 54244)
-- Name: barangays barangays_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.barangays
    ADD CONSTRAINT barangays_name_key UNIQUE (name);


--
-- TOC entry 3714 (class 2606 OID 54246)
-- Name: barangays barangays_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.barangays
    ADD CONSTRAINT barangays_pkey PRIMARY KEY (id);


--
-- TOC entry 3718 (class 2606 OID 54248)
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 3748 (class 2606 OID 54795)
-- Name: qr_cards qr_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.qr_cards
    ADD CONSTRAINT qr_cards_pkey PRIMARY KEY (id);


--
-- TOC entry 3750 (class 2606 OID 54797)
-- Name: qr_cards qr_cards_short_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.qr_cards
    ADD CONSTRAINT qr_cards_short_code_key UNIQUE (short_code);


--
-- TOC entry 3726 (class 2606 OID 54250)
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- TOC entry 3753 (class 2606 OID 55947)
-- Name: reverse_geocode_cache reverse_geocode_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reverse_geocode_cache
    ADD CONSTRAINT reverse_geocode_cache_pkey PRIMARY KEY (id);


--
-- TOC entry 3732 (class 2606 OID 54252)
-- Name: shelters shelters_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shelters
    ADD CONSTRAINT shelters_name_key UNIQUE (name);


--
-- TOC entry 3734 (class 2606 OID 54254)
-- Name: shelters shelters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shelters
    ADD CONSTRAINT shelters_pkey PRIMARY KEY (id);


--
-- TOC entry 3738 (class 2606 OID 54256)
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (team_id, profile_id);


--
-- TOC entry 3743 (class 2606 OID 54258)
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- TOC entry 3691 (class 1259 OID 54340)
-- Name: adoption_applications_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX adoption_applications_created_at_idx ON public.adoption_applications USING btree (created_at DESC);


--
-- TOC entry 3692 (class 1259 OID 54341)
-- Name: adoption_applications_email_lower_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX adoption_applications_email_lower_idx ON public.adoption_applications USING btree (lower(email));


--
-- TOC entry 3693 (class 1259 OID 54342)
-- Name: adoption_applications_one_approved_per_pet; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX adoption_applications_one_approved_per_pet ON public.adoption_applications USING btree (pet_id) WHERE (status = 'approved'::public.adoption_application_status);


--
-- TOC entry 3694 (class 1259 OID 54343)
-- Name: adoption_applications_pet_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX adoption_applications_pet_created_idx ON public.adoption_applications USING btree (pet_id, created_at DESC);


--
-- TOC entry 3697 (class 1259 OID 54344)
-- Name: adoption_applications_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX adoption_applications_status_idx ON public.adoption_applications USING btree (status);


--
-- TOC entry 3698 (class 1259 OID 54345)
-- Name: adoption_pets_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX adoption_pets_created_at_idx ON public.adoption_pets USING btree (created_at DESC);


--
-- TOC entry 3701 (class 1259 OID 54346)
-- Name: adoption_pets_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX adoption_pets_status_idx ON public.adoption_pets USING btree (status);


--
-- TOC entry 3702 (class 1259 OID 54347)
-- Name: alerts_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX alerts_created_at_idx ON public.alerts USING btree (created_at DESC);


--
-- TOC entry 3705 (class 1259 OID 54348)
-- Name: alerts_report_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX alerts_report_type_idx ON public.alerts USING btree (report_type);


--
-- TOC entry 3706 (class 1259 OID 54349)
-- Name: alerts_source_uniq; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX alerts_source_uniq ON public.alerts USING btree (source_table, source_id);


--
-- TOC entry 3707 (class 1259 OID 54350)
-- Name: idx_alerts_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_alerts_source ON public.alerts USING btree (source_table, source_id);


--
-- TOC entry 3708 (class 1259 OID 54351)
-- Name: idx_alerts_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_alerts_status ON public.alerts USING btree (status);


--
-- TOC entry 3715 (class 1259 OID 54352)
-- Name: idx_barangays_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_barangays_name ON public.barangays USING btree (name);


--
-- TOC entry 3719 (class 1259 OID 54353)
-- Name: idx_reports_contact; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reports_contact ON public.reports USING btree (reporter_contact);


--
-- TOC entry 3720 (class 1259 OID 54354)
-- Name: idx_reports_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reports_status ON public.reports USING btree (status);


--
-- TOC entry 3721 (class 1259 OID 54355)
-- Name: idx_reports_team_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reports_team_id ON public.reports USING btree (team_id);


--
-- TOC entry 3722 (class 1259 OID 54356)
-- Name: idx_reports_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reports_user ON public.reports USING btree (user_id);


--
-- TOC entry 3751 (class 1259 OID 55948)
-- Name: idx_reverse_geocode_cache_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reverse_geocode_cache_key ON public.reverse_geocode_cache USING btree (provider, lat5, lng5);


--
-- TOC entry 3729 (class 1259 OID 54357)
-- Name: idx_shelters_barangay; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_shelters_barangay ON public.shelters USING btree (barangay_id);


--
-- TOC entry 3730 (class 1259 OID 54358)
-- Name: idx_shelters_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_shelters_name ON public.shelters USING btree (name);


--
-- TOC entry 3736 (class 1259 OID 54359)
-- Name: idx_team_members_profile; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_team_members_profile ON public.team_members USING btree (profile_id);


--
-- TOC entry 3740 (class 1259 OID 54360)
-- Name: idx_teams_barangay; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_teams_barangay ON public.teams USING btree (barangay_id);


--
-- TOC entry 3741 (class 1259 OID 54361)
-- Name: idx_teams_shelter; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_teams_shelter ON public.teams USING btree (shelter_id);


--
-- TOC entry 3723 (class 1259 OID 54362)
-- Name: reports_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX reports_created_at_idx ON public.reports USING btree (created_at DESC);


--
-- TOC entry 3724 (class 1259 OID 54363)
-- Name: reports_custom_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX reports_custom_id_key ON public.reports USING btree (custom_id);


--
-- TOC entry 3727 (class 1259 OID 54364)
-- Name: reports_report_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX reports_report_type_idx ON public.reports USING btree (report_type);


--
-- TOC entry 3728 (class 1259 OID 54365)
-- Name: reports_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX reports_user_id_idx ON public.reports USING btree (user_id);


--
-- TOC entry 3716 (class 1259 OID 54366)
-- Name: uq_barangays_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_barangays_name ON public.barangays USING btree (name);


--
-- TOC entry 3735 (class 1259 OID 54367)
-- Name: uq_shelters_name_barangay; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_shelters_name_barangay ON public.shelters USING btree (name, barangay_id);


--
-- TOC entry 3739 (class 1259 OID 54368)
-- Name: uq_team_members_team_profile; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_team_members_team_profile ON public.team_members USING btree (team_id, profile_id);


--
-- TOC entry 3744 (class 1259 OID 54369)
-- Name: uq_teams_brg_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_teams_brg_name ON public.teams USING btree (barangay_id, name) WHERE (barangay_id IS NOT NULL);


--
-- TOC entry 3745 (class 1259 OID 54370)
-- Name: uq_teams_name_barangay; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_teams_name_barangay ON public.teams USING btree (name, barangay_id);


--
-- TOC entry 3746 (class 1259 OID 54371)
-- Name: uq_teams_shel_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_teams_shel_name ON public.teams USING btree (shelter_id, name) WHERE (shelter_id IS NOT NULL);


--
-- TOC entry 3772 (class 2620 OID 54393)
-- Name: adoption_applications trg_adoption_applications_set_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_adoption_applications_set_updated BEFORE UPDATE ON public.adoption_applications FOR EACH ROW EXECUTE FUNCTION public.fn_adoption_applications_set_updated();


--
-- TOC entry 3773 (class 2620 OID 54394)
-- Name: adoption_pets trg_adoption_pets_set_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_adoption_pets_set_updated BEFORE UPDATE ON public.adoption_pets FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- TOC entry 3774 (class 2620 OID 54395)
-- Name: adoption_pets trg_alerts_from_adoptions_del; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_alerts_from_adoptions_del AFTER DELETE ON public.adoption_pets FOR EACH ROW EXECUTE FUNCTION public.fn_alerts_sync_from_adoptions_del();


--
-- TOC entry 3775 (class 2620 OID 54396)
-- Name: adoption_pets trg_alerts_from_adoptions_ins; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_alerts_from_adoptions_ins AFTER INSERT ON public.adoption_pets FOR EACH ROW EXECUTE FUNCTION public.fn_alerts_sync_from_adoptions_ins_upd();


--
-- TOC entry 3776 (class 2620 OID 54397)
-- Name: adoption_pets trg_alerts_from_adoptions_upd; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_alerts_from_adoptions_upd AFTER UPDATE ON public.adoption_pets FOR EACH ROW EXECUTE FUNCTION public.fn_alerts_sync_from_adoptions_ins_upd();


--
-- TOC entry 3780 (class 2620 OID 54398)
-- Name: reports trg_alerts_from_reports_del; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_alerts_from_reports_del AFTER DELETE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.fn_alerts_sync_from_reports_del();


--
-- TOC entry 3781 (class 2620 OID 54399)
-- Name: reports trg_alerts_from_reports_ins; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_alerts_from_reports_ins AFTER INSERT ON public.reports FOR EACH ROW EXECUTE FUNCTION public.fn_alerts_sync_from_reports_ins_upd();


--
-- TOC entry 3782 (class 2620 OID 54400)
-- Name: reports trg_alerts_from_reports_upd; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_alerts_from_reports_upd AFTER UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.fn_alerts_sync_from_reports_ins_upd();


--
-- TOC entry 3783 (class 2620 OID 54401)
-- Name: reports trg_delete_alerts_for_report; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_delete_alerts_for_report AFTER DELETE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.delete_alerts_for_report();


--
-- TOC entry 3777 (class 2620 OID 54402)
-- Name: profiles trg_profiles_mirror_ad; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_profiles_mirror_ad AFTER DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.fn_profiles_mirror_ad();


--
-- TOC entry 3778 (class 2620 OID 54403)
-- Name: profiles trg_profiles_mirror_aiu; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_profiles_mirror_aiu AFTER INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.fn_profiles_mirror_aiu();


--
-- TOC entry 3779 (class 2620 OID 54404)
-- Name: profiles trg_profiles_sync_barangay; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_profiles_sync_barangay BEFORE INSERT OR UPDATE OF barangay_id, barangay_name ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.trg_profiles_sync_barangay();


--
-- TOC entry 3789 (class 2620 OID 54804)
-- Name: qr_cards trg_qr_cards_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_qr_cards_updated BEFORE UPDATE ON public.qr_cards FOR EACH ROW EXECUTE FUNCTION public.fn_qr_cards_set_updated();


--
-- TOC entry 3784 (class 2620 OID 54405)
-- Name: reports trg_reports_auto_promote; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_reports_auto_promote BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.fn_reports_auto_promote_before_update();


--
-- TOC entry 3785 (class 2620 OID 54406)
-- Name: reports trg_reports_custom_id; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_reports_custom_id BEFORE INSERT ON public.reports FOR EACH ROW EXECUTE FUNCTION public.reports_set_custom_id();


--
-- TOC entry 3786 (class 2620 OID 54407)
-- Name: reports trg_reports_status_sync_ins; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_reports_status_sync_ins AFTER INSERT ON public.reports FOR EACH ROW EXECUTE FUNCTION public.sync_alert_status_from_report();


--
-- TOC entry 3787 (class 2620 OID 54408)
-- Name: reports trg_reports_status_sync_upd; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_reports_status_sync_upd AFTER UPDATE OF status ON public.reports FOR EACH ROW EXECUTE FUNCTION public.sync_alert_status_from_report();


--
-- TOC entry 3788 (class 2620 OID 54409)
-- Name: reports trg_sync_alert_pet_status; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_sync_alert_pet_status AFTER INSERT OR UPDATE OF pet_status ON public.reports FOR EACH ROW EXECUTE FUNCTION public.sync_alert_pet_status_from_reports();


--
-- TOC entry 3754 (class 2606 OID 54499)
-- Name: adoption_applications adoption_applications_applicant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.adoption_applications
    ADD CONSTRAINT adoption_applications_applicant_id_fkey FOREIGN KEY (applicant_id) REFERENCES public.profiles(id);


--
-- TOC entry 3755 (class 2606 OID 54504)
-- Name: adoption_applications adoption_applications_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.adoption_applications
    ADD CONSTRAINT adoption_applications_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.adoption_pets(id) ON DELETE CASCADE;


--
-- TOC entry 3756 (class 2606 OID 54509)
-- Name: adoption_pets adoption_pets_posted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.adoption_pets
    ADD CONSTRAINT adoption_pets_posted_by_fkey FOREIGN KEY (posted_by) REFERENCES public.profiles(id);


--
-- TOC entry 3757 (class 2606 OID 54514)
-- Name: profiles profiles_barangay_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_barangay_id_fkey FOREIGN KEY (barangay_id) REFERENCES public.barangays(id);


--
-- TOC entry 3758 (class 2606 OID 54519)
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 3759 (class 2606 OID 54524)
-- Name: profiles profiles_shelter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_shelter_id_fkey FOREIGN KEY (shelter_id) REFERENCES public.shelters(id) ON DELETE SET NULL;


--
-- TOC entry 3771 (class 2606 OID 54798)
-- Name: qr_cards qr_cards_owner_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.qr_cards
    ADD CONSTRAINT qr_cards_owner_profile_id_fkey FOREIGN KEY (owner_profile_id) REFERENCES public.profiles(id);


--
-- TOC entry 3760 (class 2606 OID 54529)
-- Name: reports reports_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- TOC entry 3761 (class 2606 OID 54534)
-- Name: reports reports_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- TOC entry 3762 (class 2606 OID 54539)
-- Name: shelters shelters_barangay_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shelters
    ADD CONSTRAINT shelters_barangay_id_fkey FOREIGN KEY (barangay_id) REFERENCES public.barangays(id) ON DELETE SET NULL;


--
-- TOC entry 3763 (class 2606 OID 54544)
-- Name: team_members team_members_profile_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_profile_fk FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- TOC entry 3764 (class 2606 OID 54549)
-- Name: team_members team_members_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- TOC entry 3765 (class 2606 OID 54554)
-- Name: team_members team_members_team_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_fk FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- TOC entry 3766 (class 2606 OID 54559)
-- Name: team_members team_members_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- TOC entry 3767 (class 2606 OID 54564)
-- Name: teams teams_barangay_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_barangay_fk FOREIGN KEY (barangay_id) REFERENCES public.barangays(id) ON DELETE SET NULL;


--
-- TOC entry 3768 (class 2606 OID 54569)
-- Name: teams teams_barangay_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_barangay_id_fkey FOREIGN KEY (barangay_id) REFERENCES public.barangays(id) ON DELETE CASCADE;


--
-- TOC entry 3769 (class 2606 OID 54574)
-- Name: teams teams_shelter_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_shelter_fk FOREIGN KEY (shelter_id) REFERENCES public.shelters(id) ON DELETE CASCADE;


--
-- TOC entry 3770 (class 2606 OID 54579)
-- Name: teams teams_shelter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_shelter_id_fkey FOREIGN KEY (shelter_id) REFERENCES public.shelters(id) ON DELETE CASCADE;


--
-- TOC entry 3942 (class 0 OID 53931)
-- Dependencies: 287
-- Name: adoption_applications; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.adoption_applications ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3943 (class 0 OID 53944)
-- Dependencies: 288
-- Name: adoption_pets; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.adoption_pets ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3951 (class 3256 OID 54609)
-- Name: adoption_pets adoption_pets_public_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY adoption_pets_public_read ON public.adoption_pets FOR SELECT USING (true);


--
-- TOC entry 3944 (class 0 OID 53956)
-- Dependencies: 289
-- Name: alerts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3952 (class 3256 OID 54610)
-- Name: alerts alerts_delete_own_reports; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY alerts_delete_own_reports ON public.alerts FOR DELETE TO authenticated USING (((source_table = 'reports'::text) AND (EXISTS ( SELECT 1
   FROM public.reports r
  WHERE ((r.id = alerts.source_id) AND ((r.user_id = auth.uid()) OR ((r.reporter_contact IS NOT NULL) AND ((auth.jwt() ->> 'email'::text) IS NOT NULL) AND (r.reporter_contact = (auth.jwt() ->> 'email'::text)))))))));


--
-- TOC entry 3953 (class 3256 OID 54611)
-- Name: alerts alerts_insert_own_reports; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY alerts_insert_own_reports ON public.alerts FOR INSERT TO authenticated WITH CHECK (((source_table = 'reports'::text) AND (EXISTS ( SELECT 1
   FROM public.reports r
  WHERE ((r.id = alerts.source_id) AND ((r.user_id = auth.uid()) OR ((r.reporter_contact IS NOT NULL) AND ((auth.jwt() ->> 'email'::text) IS NOT NULL) AND (r.reporter_contact = (auth.jwt() ->> 'email'::text)))))))));


--
-- TOC entry 3954 (class 3256 OID 54612)
-- Name: alerts alerts_public_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY alerts_public_read ON public.alerts FOR SELECT USING (true);


--
-- TOC entry 3955 (class 3256 OID 54613)
-- Name: alerts alerts_update_own_reports; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY alerts_update_own_reports ON public.alerts FOR UPDATE TO authenticated USING (((source_table = 'reports'::text) AND (EXISTS ( SELECT 1
   FROM public.reports r
  WHERE ((r.id = alerts.source_id) AND ((r.user_id = auth.uid()) OR ((r.reporter_contact IS NOT NULL) AND ((auth.jwt() ->> 'email'::text) IS NOT NULL) AND (r.reporter_contact = (auth.jwt() ->> 'email'::text))))))))) WITH CHECK (((source_table = 'reports'::text) AND (EXISTS ( SELECT 1
   FROM public.reports r
  WHERE ((r.id = alerts.source_id) AND ((r.user_id = auth.uid()) OR ((r.reporter_contact IS NOT NULL) AND ((auth.jwt() ->> 'email'::text) IS NOT NULL) AND (r.reporter_contact = (auth.jwt() ->> 'email'::text)))))))));


--
-- TOC entry 3956 (class 3256 OID 54615)
-- Name: adoption_applications allow_any_auth_user_delete_apps; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY allow_any_auth_user_delete_apps ON public.adoption_applications FOR DELETE TO authenticated USING (true);


--
-- TOC entry 3957 (class 3256 OID 54616)
-- Name: reports allow_any_auth_user_delete_reports; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY allow_any_auth_user_delete_reports ON public.reports FOR DELETE TO authenticated USING (true);


--
-- TOC entry 3945 (class 0 OID 53968)
-- Dependencies: 290
-- Name: barangays; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.barangays ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3958 (class 3256 OID 54617)
-- Name: barangays barangays_super_admin_full; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY barangays_super_admin_full ON public.barangays TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.role = 'super-admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.role = 'super-admin'::text)))));


--
-- TOC entry 3959 (class 3256 OID 54619)
-- Name: alerts delete alerts via report ownership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "delete alerts via report ownership" ON public.alerts FOR DELETE TO authenticated USING (((source_table = 'reports'::text) AND (EXISTS ( SELECT 1
   FROM public.reports r
  WHERE ((r.id = alerts.source_id) AND (r.user_id = auth.uid()))))));


--
-- TOC entry 3960 (class 3256 OID 54620)
-- Name: adoption_applications insert adoption apps via email; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "insert adoption apps via email" ON public.adoption_applications FOR INSERT WITH CHECK (((auth.email() IS NOT NULL) AND (lower(email) = lower(auth.email()))));


--
-- TOC entry 3946 (class 0 OID 53976)
-- Dependencies: 291
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3961 (class 3256 OID 54621)
-- Name: profiles profiles_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


--
-- TOC entry 3962 (class 3256 OID 54622)
-- Name: profiles profiles_read_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_read_own ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- TOC entry 3963 (class 3256 OID 54623)
-- Name: profiles profiles_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- TOC entry 3964 (class 3256 OID 54624)
-- Name: reports read_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY read_own ON public.reports FOR SELECT USING (((user_id = auth.uid()) OR (reporter_contact = (auth.jwt() ->> 'email'::text))));


--
-- TOC entry 3947 (class 0 OID 53985)
-- Dependencies: 293
-- Name: reports; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3965 (class 3256 OID 54625)
-- Name: reports reports_barangay_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY reports_barangay_delete ON public.reports FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (lower(COALESCE(p.role, ''::text)) = 'barangay-admin'::text)))));


--
-- TOC entry 3966 (class 3256 OID 54626)
-- Name: reports reports_barangay_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY reports_barangay_insert ON public.reports FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (lower(COALESCE(p.role, ''::text)) = 'barangay-admin'::text)))));


--
-- TOC entry 3967 (class 3256 OID 54627)
-- Name: reports reports_barangay_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY reports_barangay_update ON public.reports FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (lower(COALESCE(p.role, ''::text)) = 'barangay-admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (lower(COALESCE(p.role, ''::text)) = 'barangay-admin'::text)))));


--
-- TOC entry 3968 (class 3256 OID 54629)
-- Name: reports reports_public_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY reports_public_read ON public.reports FOR SELECT USING (true);


--
-- TOC entry 3969 (class 3256 OID 54630)
-- Name: reports reports_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY reports_update_own ON public.reports FOR UPDATE TO authenticated USING (((auth.uid() = user_id) OR ((reporter_contact IS NOT NULL) AND ((auth.jwt() ->> 'email'::text) IS NOT NULL) AND ((auth.jwt() ->> 'email'::text) = reporter_contact)))) WITH CHECK (((auth.uid() = user_id) OR ((reporter_contact IS NOT NULL) AND ((auth.jwt() ->> 'email'::text) IS NOT NULL) AND ((auth.jwt() ->> 'email'::text) = reporter_contact))));


--
-- TOC entry 3970 (class 3256 OID 54631)
-- Name: adoption_applications select adoption apps via email; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "select adoption apps via email" ON public.adoption_applications FOR SELECT USING (((auth.email() IS NOT NULL) AND (lower(email) = lower(auth.email()))));


--
-- TOC entry 3948 (class 0 OID 53999)
-- Dependencies: 294
-- Name: shelters; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.shelters ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3971 (class 3256 OID 54632)
-- Name: shelters shelters_super_admin_full; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY shelters_super_admin_full ON public.shelters TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.role = 'super-admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.role = 'super-admin'::text)))));


--
-- TOC entry 3949 (class 0 OID 54007)
-- Dependencies: 295
-- Name: team_members; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3972 (class 3256 OID 54634)
-- Name: team_members team_members_ba_cud; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY team_members_ba_cud ON public.team_members TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.profiles pr
     JOIN public.teams t ON ((t.barangay_id = pr.barangay_id)))
  WHERE ((pr.id = auth.uid()) AND (pr.role = 'barangay-admin'::text) AND (t.id = team_members.team_id))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ((public.profiles pr
     JOIN public.teams t ON ((t.barangay_id = pr.barangay_id)))
     JOIN public.profiles p2 ON ((p2.id = team_members.profile_id)))
  WHERE ((pr.id = auth.uid()) AND (pr.role = 'barangay-admin'::text) AND (t.id = team_members.team_id) AND (p2.barangay_id = t.barangay_id)))));


--
-- TOC entry 3973 (class 3256 OID 54636)
-- Name: team_members team_members_ba_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY team_members_ba_select ON public.team_members FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.profiles pr
     JOIN public.teams t ON ((t.barangay_id = pr.barangay_id)))
  WHERE ((pr.id = auth.uid()) AND (pr.role = 'barangay-admin'::text) AND (t.id = team_members.team_id)))));


--
-- TOC entry 3974 (class 3256 OID 54637)
-- Name: team_members team_members_super_admin_full; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY team_members_super_admin_full ON public.team_members TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.role = 'super-admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.role = 'super-admin'::text)))));


--
-- TOC entry 3950 (class 0 OID 54011)
-- Dependencies: 296
-- Name: teams; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3975 (class 3256 OID 54639)
-- Name: teams teams_ba_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY teams_ba_insert ON public.teams FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.role = 'barangay-admin'::text) AND (pr.barangay_id = pr.barangay_id)))));


--
-- TOC entry 3976 (class 3256 OID 54640)
-- Name: teams teams_ba_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY teams_ba_select ON public.teams FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.role = 'barangay-admin'::text) AND (pr.barangay_id = teams.barangay_id)))));


--
-- TOC entry 3977 (class 3256 OID 54641)
-- Name: teams teams_ba_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY teams_ba_update ON public.teams FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.role = 'barangay-admin'::text) AND (pr.barangay_id = teams.barangay_id))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.role = 'barangay-admin'::text) AND (pr.barangay_id = teams.barangay_id)))));


--
-- TOC entry 3978 (class 3256 OID 54643)
-- Name: teams teams_super_admin_full; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY teams_super_admin_full ON public.teams TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.role = 'super-admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.role = 'super-admin'::text)))));


--
-- TOC entry 3979 (class 3256 OID 54645)
-- Name: adoption_applications update own adoption apps via email; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "update own adoption apps via email" ON public.adoption_applications FOR UPDATE USING (((auth.email() IS NOT NULL) AND (lower(email) = lower(auth.email())))) WITH CHECK (((auth.email() IS NOT NULL) AND (lower(email) = lower(auth.email()))));


-- Completed on 2026-03-04 11:28:32

--
-- PostgreSQL database dump complete
--

\unrestrict GowU0tq7K0n1GlpZIG9A6dCRO0QDPjmLgPdebOJBx68hxkqDCBLB9byG0HeM7bU
