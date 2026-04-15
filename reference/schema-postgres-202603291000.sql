--
-- PostgreSQL database dump
--

\restrict czClPSOgsSK90NYbvmNDHBoY8MNdK0zce2RM4ka46gCSt8BcN1oK7ZhKHNlknfe

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.0

-- Started on 2026-03-29 10:00:31i

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
-- TOC entry 19 (class 2615 OID 53457)
-- Name: auth; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA auth;


ALTER SCHEMA auth OWNER TO supabase_admin;

--
-- TOC entry 34 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- TOC entry 1090 (class 1247 OID 53584)
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


ALTER TYPE auth.aal_level OWNER TO supabase_auth_admin;

--
-- TOC entry 1093 (class 1247 OID 53592)
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


ALTER TYPE auth.code_challenge_method OWNER TO supabase_auth_admin;

--
-- TOC entry 1096 (class 1247 OID 53598)
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


ALTER TYPE auth.factor_status OWNER TO supabase_auth_admin;

--
-- TOC entry 1099 (class 1247 OID 53604)
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


ALTER TYPE auth.factor_type OWNER TO supabase_auth_admin;

--
-- TOC entry 1102 (class 1247 OID 53612)
-- Name: oauth_authorization_status; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_authorization_status AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


ALTER TYPE auth.oauth_authorization_status OWNER TO supabase_auth_admin;

--
-- TOC entry 1105 (class 1247 OID 53622)
-- Name: oauth_client_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_client_type AS ENUM (
    'public',
    'confidential'
);


ALTER TYPE auth.oauth_client_type OWNER TO supabase_auth_admin;

--
-- TOC entry 1108 (class 1247 OID 53628)
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_registration_type AS ENUM (
    'dynamic',
    'manual'
);


ALTER TYPE auth.oauth_registration_type OWNER TO supabase_auth_admin;

--
-- TOC entry 1111 (class 1247 OID 53634)
-- Name: oauth_response_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_response_type AS ENUM (
    'code'
);


ALTER TYPE auth.oauth_response_type OWNER TO supabase_auth_admin;

--
-- TOC entry 1114 (class 1247 OID 53638)
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


ALTER TYPE auth.one_time_token_type OWNER TO supabase_auth_admin;

--
-- TOC entry 1117 (class 1247 OID 53652)
-- Name: adoption_application_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.adoption_application_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE public.adoption_application_status OWNER TO postgres;

--
-- TOC entry 1120 (class 1247 OID 53660)
-- Name: pet_status_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.pet_status_type AS ENUM (
    'roaming',
    'in_custody'
);


ALTER TYPE public.pet_status_type OWNER TO postgres;

--
-- TOC entry 1123 (class 1247 OID 53666)
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
-- TOC entry 336 (class 1255 OID 53721)
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


ALTER FUNCTION auth.email() OWNER TO supabase_auth_admin;

--
-- TOC entry 455 (class 1255 OID 53722)
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


ALTER FUNCTION auth.jwt() OWNER TO supabase_auth_admin;

--
-- TOC entry 347 (class 1255 OID 53723)
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


ALTER FUNCTION auth.role() OWNER TO supabase_auth_admin;

--
-- TOC entry 385 (class 1255 OID 53724)
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


ALTER FUNCTION auth.uid() OWNER TO supabase_auth_admin;

--
-- TOC entry 330 (class 1255 OID 53732)
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
-- TOC entry 409 (class 1255 OID 53733)
-- Name: fn_adoption_applications_set_updated(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_adoption_applications_set_updated() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin new.updated_at = now(); return new; end $$;


ALTER FUNCTION public.fn_adoption_applications_set_updated() OWNER TO postgres;

--
-- TOC entry 331 (class 1255 OID 53734)
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
-- TOC entry 363 (class 1255 OID 53735)
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
-- TOC entry 334 (class 1255 OID 53736)
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
-- TOC entry 339 (class 1255 OID 53737)
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
-- TOC entry 382 (class 1255 OID 53738)
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
-- TOC entry 377 (class 1255 OID 53739)
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
-- TOC entry 437 (class 1255 OID 53740)
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
-- TOC entry 329 (class 1255 OID 54803)
-- Name: fn_qr_cards_set_updated(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_qr_cards_set_updated() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin new.updated_at = now(); return new; end $$;


ALTER FUNCTION public.fn_qr_cards_set_updated() OWNER TO postgres;

--
-- TOC entry 345 (class 1255 OID 53741)
-- Name: fn_reports_auto_promote_before_update(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_reports_auto_promote_before_update() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  v_new_pet_id uuid;
  v_species_id uuid;
  v_species_raw text;
  v_species_norm text;
  v_species_semicolon text;
begin
  if NEW.report_type = 'adoption' and NEW.promoted_to_pet_id is null then
    v_species_raw := coalesce(NEW.species, '');
    v_species_norm := lower(trim(v_species_raw));
    v_species_semicolon := lower(trim(split_part(v_species_raw, ';', 2)));

    -- canonical match
    select s.id into v_species_id
    from public.animal_species s
    where s.normalized_name in (v_species_norm, v_species_semicolon)
    limit 1;

    -- alias match fallback
    if v_species_id is null then
      select a.species_id into v_species_id
      from public.animal_species_aliases a
      where a.alias_normalized in (v_species_norm, v_species_semicolon)
      limit 1;
    end if;

    insert into public.adoption_pets (
      species_id, species, pet_name, age_size, features, location, status,
      photo_path, landmark_media_paths, latitude, longitude
    )
    values (
      v_species_id, NEW.species, NEW.pet_name, NEW.age_size,
      coalesce(nullif(NEW.features, ''), NEW.description),
      NEW.location, 'available',
      NEW.photo_path, coalesce(NEW.landmark_media_paths, '{}'),
      NEW.latitude, NEW.longitude
    )
    returning id into v_new_pet_id;

    NEW.promoted_to_pet_id := v_new_pet_id;

    delete from public.alerts
    where source_table = 'reports' and source_id = NEW.id;
  end if;

  return NEW;
end
$$;


ALTER FUNCTION public.fn_reports_auto_promote_before_update() OWNER TO postgres;

--
-- TOC entry 447 (class 1255 OID 53742)
-- Name: fn_set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin new.updated_at = now(); return new; end $$;


ALTER FUNCTION public.fn_set_updated_at() OWNER TO postgres;

--
-- TOC entry 366 (class 1255 OID 53743)
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
-- TOC entry 442 (class 1255 OID 53744)
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
-- TOC entry 388 (class 1255 OID 53745)
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
-- TOC entry 440 (class 1255 OID 53746)
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
-- TOC entry 371 (class 1255 OID 53747)
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
    status, photo_path, landmark_media_paths, latitude, longitude
  )
  select
    r.species, r.pet_name, r.age_size, r.features, r.location,
    'available', r.photo_path, coalesce(r.landmark_media_paths, '{}'),
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
-- TOC entry 420 (class 1255 OID 53748)
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
-- TOC entry 344 (class 1255 OID 53749)
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
-- TOC entry 407 (class 1255 OID 53750)
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
-- TOC entry 417 (class 1255 OID 53751)
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
-- TOC entry 267 (class 1259 OID 53794)
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


ALTER TABLE auth.audit_log_entries OWNER TO supabase_auth_admin;

--
-- TOC entry 317 (class 1259 OID 96232)
-- Name: custom_oauth_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.custom_oauth_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_type text NOT NULL,
    identifier text NOT NULL,
    name text NOT NULL,
    client_id text NOT NULL,
    client_secret text NOT NULL,
    acceptable_client_ids text[] DEFAULT '{}'::text[] NOT NULL,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    pkce_enabled boolean DEFAULT true NOT NULL,
    attribute_mapping jsonb DEFAULT '{}'::jsonb NOT NULL,
    authorization_params jsonb DEFAULT '{}'::jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    email_optional boolean DEFAULT false NOT NULL,
    issuer text,
    discovery_url text,
    skip_nonce_check boolean DEFAULT false NOT NULL,
    cached_discovery jsonb,
    discovery_cached_at timestamp with time zone,
    authorization_url text,
    token_url text,
    userinfo_url text,
    jwks_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT custom_oauth_providers_authorization_url_https CHECK (((authorization_url IS NULL) OR (authorization_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_authorization_url_length CHECK (((authorization_url IS NULL) OR (char_length(authorization_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_client_id_length CHECK (((char_length(client_id) >= 1) AND (char_length(client_id) <= 512))),
    CONSTRAINT custom_oauth_providers_discovery_url_length CHECK (((discovery_url IS NULL) OR (char_length(discovery_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_identifier_format CHECK ((identifier ~ '^[a-z0-9][a-z0-9:-]{0,48}[a-z0-9]$'::text)),
    CONSTRAINT custom_oauth_providers_issuer_length CHECK (((issuer IS NULL) OR ((char_length(issuer) >= 1) AND (char_length(issuer) <= 2048)))),
    CONSTRAINT custom_oauth_providers_jwks_uri_https CHECK (((jwks_uri IS NULL) OR (jwks_uri ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_jwks_uri_length CHECK (((jwks_uri IS NULL) OR (char_length(jwks_uri) <= 2048))),
    CONSTRAINT custom_oauth_providers_name_length CHECK (((char_length(name) >= 1) AND (char_length(name) <= 100))),
    CONSTRAINT custom_oauth_providers_oauth2_requires_endpoints CHECK (((provider_type <> 'oauth2'::text) OR ((authorization_url IS NOT NULL) AND (token_url IS NOT NULL) AND (userinfo_url IS NOT NULL)))),
    CONSTRAINT custom_oauth_providers_oidc_discovery_url_https CHECK (((provider_type <> 'oidc'::text) OR (discovery_url IS NULL) OR (discovery_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_issuer_https CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NULL) OR (issuer ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_requires_issuer CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NOT NULL))),
    CONSTRAINT custom_oauth_providers_provider_type_check CHECK ((provider_type = ANY (ARRAY['oauth2'::text, 'oidc'::text]))),
    CONSTRAINT custom_oauth_providers_token_url_https CHECK (((token_url IS NULL) OR (token_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_token_url_length CHECK (((token_url IS NULL) OR (char_length(token_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_userinfo_url_https CHECK (((userinfo_url IS NULL) OR (userinfo_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_userinfo_url_length CHECK (((userinfo_url IS NULL) OR (char_length(userinfo_url) <= 2048)))
);


ALTER TABLE auth.custom_oauth_providers OWNER TO supabase_auth_admin;

--
-- TOC entry 268 (class 1259 OID 53800)
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text,
    code_challenge_method auth.code_challenge_method,
    code_challenge text,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone,
    invite_token text,
    referrer text,
    oauth_client_state_id uuid,
    linking_target_id uuid,
    email_optional boolean DEFAULT false NOT NULL
);


ALTER TABLE auth.flow_state OWNER TO supabase_auth_admin;

--
-- TOC entry 269 (class 1259 OID 53805)
-- Name: identities; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE auth.identities OWNER TO supabase_auth_admin;

--
-- TOC entry 270 (class 1259 OID 53812)
-- Name: instances; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE auth.instances OWNER TO supabase_auth_admin;

--
-- TOC entry 271 (class 1259 OID 53817)
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


ALTER TABLE auth.mfa_amr_claims OWNER TO supabase_auth_admin;

--
-- TOC entry 272 (class 1259 OID 53822)
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


ALTER TABLE auth.mfa_challenges OWNER TO supabase_auth_admin;

--
-- TOC entry 273 (class 1259 OID 53827)
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid,
    last_webauthn_challenge_data jsonb
);


ALTER TABLE auth.mfa_factors OWNER TO supabase_auth_admin;

--
-- TOC entry 274 (class 1259 OID 53832)
-- Name: oauth_authorizations; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_authorizations (
    id uuid NOT NULL,
    authorization_id text NOT NULL,
    client_id uuid NOT NULL,
    user_id uuid,
    redirect_uri text NOT NULL,
    scope text NOT NULL,
    state text,
    resource text,
    code_challenge text,
    code_challenge_method auth.code_challenge_method,
    response_type auth.oauth_response_type DEFAULT 'code'::auth.oauth_response_type NOT NULL,
    status auth.oauth_authorization_status DEFAULT 'pending'::auth.oauth_authorization_status NOT NULL,
    authorization_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:03:00'::interval) NOT NULL,
    approved_at timestamp with time zone,
    nonce text,
    CONSTRAINT oauth_authorizations_authorization_code_length CHECK ((char_length(authorization_code) <= 255)),
    CONSTRAINT oauth_authorizations_code_challenge_length CHECK ((char_length(code_challenge) <= 128)),
    CONSTRAINT oauth_authorizations_expires_at_future CHECK ((expires_at > created_at)),
    CONSTRAINT oauth_authorizations_nonce_length CHECK ((char_length(nonce) <= 255)),
    CONSTRAINT oauth_authorizations_redirect_uri_length CHECK ((char_length(redirect_uri) <= 2048)),
    CONSTRAINT oauth_authorizations_resource_length CHECK ((char_length(resource) <= 2048)),
    CONSTRAINT oauth_authorizations_scope_length CHECK ((char_length(scope) <= 4096)),
    CONSTRAINT oauth_authorizations_state_length CHECK ((char_length(state) <= 4096))
);


ALTER TABLE auth.oauth_authorizations OWNER TO supabase_auth_admin;

--
-- TOC entry 316 (class 1259 OID 62634)
-- Name: oauth_client_states; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_client_states (
    id uuid NOT NULL,
    provider_type text NOT NULL,
    code_verifier text,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE auth.oauth_client_states OWNER TO supabase_auth_admin;

--
-- TOC entry 275 (class 1259 OID 53848)
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_clients (
    id uuid NOT NULL,
    client_secret_hash text,
    registration_type auth.oauth_registration_type NOT NULL,
    redirect_uris text NOT NULL,
    grant_types text NOT NULL,
    client_name text,
    client_uri text,
    logo_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    client_type auth.oauth_client_type DEFAULT 'confidential'::auth.oauth_client_type NOT NULL,
    token_endpoint_auth_method text NOT NULL,
    CONSTRAINT oauth_clients_client_name_length CHECK ((char_length(client_name) <= 1024)),
    CONSTRAINT oauth_clients_client_uri_length CHECK ((char_length(client_uri) <= 2048)),
    CONSTRAINT oauth_clients_logo_uri_length CHECK ((char_length(logo_uri) <= 2048)),
    CONSTRAINT oauth_clients_token_endpoint_auth_method_check CHECK ((token_endpoint_auth_method = ANY (ARRAY['client_secret_basic'::text, 'client_secret_post'::text, 'none'::text])))
);


ALTER TABLE auth.oauth_clients OWNER TO supabase_auth_admin;

--
-- TOC entry 276 (class 1259 OID 53859)
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_consents (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    scopes text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT oauth_consents_revoked_after_granted CHECK (((revoked_at IS NULL) OR (revoked_at >= granted_at))),
    CONSTRAINT oauth_consents_scopes_length CHECK ((char_length(scopes) <= 2048)),
    CONSTRAINT oauth_consents_scopes_not_empty CHECK ((char_length(TRIM(BOTH FROM scopes)) > 0))
);


ALTER TABLE auth.oauth_consents OWNER TO supabase_auth_admin;

--
-- TOC entry 277 (class 1259 OID 53868)
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


ALTER TABLE auth.one_time_tokens OWNER TO supabase_auth_admin;

--
-- TOC entry 278 (class 1259 OID 53876)
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


ALTER TABLE auth.refresh_tokens OWNER TO supabase_auth_admin;

--
-- TOC entry 279 (class 1259 OID 53881)
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: supabase_auth_admin
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE auth.refresh_tokens_id_seq OWNER TO supabase_auth_admin;

--
-- TOC entry 4312 (class 0 OID 0)
-- Dependencies: 279
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: supabase_auth_admin
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- TOC entry 280 (class 1259 OID 53882)
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


ALTER TABLE auth.saml_providers OWNER TO supabase_auth_admin;

--
-- TOC entry 281 (class 1259 OID 53890)
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


ALTER TABLE auth.saml_relay_states OWNER TO supabase_auth_admin;

--
-- TOC entry 282 (class 1259 OID 53896)
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


ALTER TABLE auth.schema_migrations OWNER TO supabase_auth_admin;

--
-- TOC entry 283 (class 1259 OID 53899)
-- Name: sessions; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text,
    oauth_client_id uuid,
    refresh_token_hmac_key text,
    refresh_token_counter bigint,
    scopes text,
    CONSTRAINT sessions_scopes_length CHECK ((char_length(scopes) <= 4096))
);


ALTER TABLE auth.sessions OWNER TO supabase_auth_admin;

--
-- TOC entry 284 (class 1259 OID 53904)
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


ALTER TABLE auth.sso_domains OWNER TO supabase_auth_admin;

--
-- TOC entry 285 (class 1259 OID 53910)
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


ALTER TABLE auth.sso_providers OWNER TO supabase_auth_admin;

--
-- TOC entry 286 (class 1259 OID 53916)
-- Name: users; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


ALTER TABLE auth.users OWNER TO supabase_auth_admin;

--
-- TOC entry 321 (class 1259 OID 111867)
-- Name: webauthn_challenges; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.webauthn_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    challenge_type text NOT NULL,
    session_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT webauthn_challenges_challenge_type_check CHECK ((challenge_type = ANY (ARRAY['signup'::text, 'registration'::text, 'authentication'::text])))
);


ALTER TABLE auth.webauthn_challenges OWNER TO supabase_auth_admin;

--
-- TOC entry 320 (class 1259 OID 111844)
-- Name: webauthn_credentials; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.webauthn_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    credential_id bytea NOT NULL,
    public_key bytea NOT NULL,
    attestation_type text DEFAULT ''::text NOT NULL,
    aaguid uuid,
    sign_count bigint DEFAULT 0 NOT NULL,
    transports jsonb DEFAULT '[]'::jsonb NOT NULL,
    backup_eligible boolean DEFAULT false NOT NULL,
    backed_up boolean DEFAULT false NOT NULL,
    friendly_name text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_used_at timestamp with time zone
);


ALTER TABLE auth.webauthn_credentials OWNER TO supabase_auth_admin;

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
    landmark_media_paths text[] DEFAULT '{}'::text[] NOT NULL,
    latitude double precision,
    longitude double precision,
    posted_by uuid,
    pet_status public.pet_status_type DEFAULT 'in_custody'::public.pet_status_type NOT NULL,
    species_id uuid,
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
-- TOC entry 318 (class 1259 OID 103664)
-- Name: animal_species; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.animal_species (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    canonical_name text NOT NULL,
    normalized_name text NOT NULL,
    is_domestic_adoptable boolean DEFAULT true NOT NULL,
    care_profile text DEFAULT 'standard'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 100 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.animal_species OWNER TO postgres;

--
-- TOC entry 319 (class 1259 OID 103682)
-- Name: animal_species_aliases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.animal_species_aliases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    species_id uuid NOT NULL,
    alias text NOT NULL,
    alias_normalized text NOT NULL
);


ALTER TABLE public.animal_species_aliases OWNER TO postgres;

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
    species_id uuid,
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
-- TOC entry 3699 (class 2604 OID 54178)
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- TOC entry 3854 (class 2606 OID 54180)
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- TOC entry 3838 (class 2606 OID 54182)
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- TOC entry 4010 (class 2606 OID 96269)
-- Name: custom_oauth_providers custom_oauth_providers_identifier_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_identifier_key UNIQUE (identifier);


--
-- TOC entry 4012 (class 2606 OID 96267)
-- Name: custom_oauth_providers custom_oauth_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_pkey PRIMARY KEY (id);


--
-- TOC entry 3842 (class 2606 OID 54184)
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- TOC entry 3847 (class 2606 OID 54186)
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- TOC entry 3849 (class 2606 OID 54188)
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- TOC entry 3852 (class 2606 OID 54190)
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- TOC entry 3856 (class 2606 OID 54192)
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- TOC entry 3859 (class 2606 OID 54194)
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- TOC entry 3862 (class 2606 OID 54196)
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- TOC entry 3864 (class 2606 OID 54198)
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- TOC entry 3870 (class 2606 OID 54200)
-- Name: oauth_authorizations oauth_authorizations_authorization_code_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_code_key UNIQUE (authorization_code);


--
-- TOC entry 3872 (class 2606 OID 54202)
-- Name: oauth_authorizations oauth_authorizations_authorization_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_id_key UNIQUE (authorization_id);


--
-- TOC entry 3874 (class 2606 OID 54204)
-- Name: oauth_authorizations oauth_authorizations_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_pkey PRIMARY KEY (id);


--
-- TOC entry 4005 (class 2606 OID 62640)
-- Name: oauth_client_states oauth_client_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_client_states
    ADD CONSTRAINT oauth_client_states_pkey PRIMARY KEY (id);


--
-- TOC entry 3877 (class 2606 OID 54206)
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- TOC entry 3881 (class 2606 OID 54208)
-- Name: oauth_consents oauth_consents_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_pkey PRIMARY KEY (id);


--
-- TOC entry 3883 (class 2606 OID 54210)
-- Name: oauth_consents oauth_consents_user_client_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_client_unique UNIQUE (user_id, client_id);


--
-- TOC entry 3886 (class 2606 OID 54212)
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- TOC entry 3894 (class 2606 OID 54214)
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- TOC entry 3897 (class 2606 OID 54216)
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- TOC entry 3900 (class 2606 OID 54218)
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- TOC entry 3902 (class 2606 OID 54220)
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- TOC entry 3907 (class 2606 OID 54222)
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- TOC entry 3910 (class 2606 OID 54224)
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- TOC entry 3914 (class 2606 OID 54226)
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 3919 (class 2606 OID 54228)
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- TOC entry 3922 (class 2606 OID 54230)
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- TOC entry 3935 (class 2606 OID 54232)
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- TOC entry 3937 (class 2606 OID 54234)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4030 (class 2606 OID 111876)
-- Name: webauthn_challenges webauthn_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_pkey PRIMARY KEY (id);


--
-- TOC entry 4026 (class 2606 OID 111859)
-- Name: webauthn_credentials webauthn_credentials_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_pkey PRIMARY KEY (id);


--
-- TOC entry 3943 (class 2606 OID 54236)
-- Name: adoption_applications adoption_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.adoption_applications
    ADD CONSTRAINT adoption_applications_pkey PRIMARY KEY (id);


--
-- TOC entry 3947 (class 2606 OID 54238)
-- Name: adoption_pets adoption_pets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.adoption_pets
    ADD CONSTRAINT adoption_pets_pkey PRIMARY KEY (id);


--
-- TOC entry 3952 (class 2606 OID 54240)
-- Name: alerts alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_pkey PRIMARY KEY (id);


--
-- TOC entry 4021 (class 2606 OID 103691)
-- Name: animal_species_aliases animal_species_aliases_alias_normalized_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.animal_species_aliases
    ADD CONSTRAINT animal_species_aliases_alias_normalized_key UNIQUE (alias_normalized);


--
-- TOC entry 4023 (class 2606 OID 103689)
-- Name: animal_species_aliases animal_species_aliases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.animal_species_aliases
    ADD CONSTRAINT animal_species_aliases_pkey PRIMARY KEY (id);


--
-- TOC entry 4015 (class 2606 OID 103679)
-- Name: animal_species animal_species_canonical_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.animal_species
    ADD CONSTRAINT animal_species_canonical_name_key UNIQUE (canonical_name);


--
-- TOC entry 4017 (class 2606 OID 103681)
-- Name: animal_species animal_species_normalized_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.animal_species
    ADD CONSTRAINT animal_species_normalized_name_key UNIQUE (normalized_name);


--
-- TOC entry 4019 (class 2606 OID 103677)
-- Name: animal_species animal_species_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.animal_species
    ADD CONSTRAINT animal_species_pkey PRIMARY KEY (id);


--
-- TOC entry 3958 (class 2606 OID 54242)
-- Name: barangays barangays_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.barangays
    ADD CONSTRAINT barangays_code_key UNIQUE (code);


--
-- TOC entry 3960 (class 2606 OID 54244)
-- Name: barangays barangays_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.barangays
    ADD CONSTRAINT barangays_name_key UNIQUE (name);


--
-- TOC entry 3962 (class 2606 OID 54246)
-- Name: barangays barangays_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.barangays
    ADD CONSTRAINT barangays_pkey PRIMARY KEY (id);


--
-- TOC entry 3966 (class 2606 OID 54248)
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 3997 (class 2606 OID 54795)
-- Name: qr_cards qr_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.qr_cards
    ADD CONSTRAINT qr_cards_pkey PRIMARY KEY (id);


--
-- TOC entry 3999 (class 2606 OID 54797)
-- Name: qr_cards qr_cards_short_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.qr_cards
    ADD CONSTRAINT qr_cards_short_code_key UNIQUE (short_code);


--
-- TOC entry 3975 (class 2606 OID 54250)
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- TOC entry 4002 (class 2606 OID 55947)
-- Name: reverse_geocode_cache reverse_geocode_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reverse_geocode_cache
    ADD CONSTRAINT reverse_geocode_cache_pkey PRIMARY KEY (id);


--
-- TOC entry 3981 (class 2606 OID 54252)
-- Name: shelters shelters_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shelters
    ADD CONSTRAINT shelters_name_key UNIQUE (name);


--
-- TOC entry 3983 (class 2606 OID 54254)
-- Name: shelters shelters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shelters
    ADD CONSTRAINT shelters_pkey PRIMARY KEY (id);


--
-- TOC entry 3987 (class 2606 OID 54256)
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (team_id, profile_id);


--
-- TOC entry 3992 (class 2606 OID 54258)
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- TOC entry 3839 (class 1259 OID 54295)
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- TOC entry 3925 (class 1259 OID 54296)
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- TOC entry 4006 (class 1259 OID 96273)
-- Name: custom_oauth_providers_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_created_at_idx ON auth.custom_oauth_providers USING btree (created_at);


--
-- TOC entry 4007 (class 1259 OID 96272)
-- Name: custom_oauth_providers_enabled_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_enabled_idx ON auth.custom_oauth_providers USING btree (enabled);


--
-- TOC entry 4008 (class 1259 OID 96270)
-- Name: custom_oauth_providers_identifier_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_identifier_idx ON auth.custom_oauth_providers USING btree (identifier);


--
-- TOC entry 4013 (class 1259 OID 96271)
-- Name: custom_oauth_providers_provider_type_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_provider_type_idx ON auth.custom_oauth_providers USING btree (provider_type);


--
-- TOC entry 3926 (class 1259 OID 54297)
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- TOC entry 3927 (class 1259 OID 54298)
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- TOC entry 3860 (class 1259 OID 54299)
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- TOC entry 3840 (class 1259 OID 54300)
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- TOC entry 3845 (class 1259 OID 54301)
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- TOC entry 3850 (class 1259 OID 54302)
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- TOC entry 3843 (class 1259 OID 54303)
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- TOC entry 4003 (class 1259 OID 62641)
-- Name: idx_oauth_client_states_created_at; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_oauth_client_states_created_at ON auth.oauth_client_states USING btree (created_at);


--
-- TOC entry 3844 (class 1259 OID 54304)
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- TOC entry 3857 (class 1259 OID 54305)
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- TOC entry 3865 (class 1259 OID 54306)
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- TOC entry 3866 (class 1259 OID 54307)
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- TOC entry 3868 (class 1259 OID 54308)
-- Name: oauth_auth_pending_exp_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);


--
-- TOC entry 3875 (class 1259 OID 54309)
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);


--
-- TOC entry 3878 (class 1259 OID 54310)
-- Name: oauth_consents_active_client_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);


--
-- TOC entry 3879 (class 1259 OID 54311)
-- Name: oauth_consents_active_user_client_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);


--
-- TOC entry 3884 (class 1259 OID 54312)
-- Name: oauth_consents_user_order_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC);


--
-- TOC entry 3887 (class 1259 OID 54313)
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- TOC entry 3888 (class 1259 OID 54314)
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- TOC entry 3889 (class 1259 OID 54315)
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- TOC entry 3928 (class 1259 OID 54316)
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- TOC entry 3929 (class 1259 OID 54317)
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- TOC entry 3890 (class 1259 OID 54318)
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- TOC entry 3891 (class 1259 OID 54319)
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- TOC entry 3892 (class 1259 OID 54320)
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- TOC entry 3895 (class 1259 OID 54321)
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- TOC entry 3898 (class 1259 OID 54322)
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- TOC entry 3903 (class 1259 OID 54323)
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- TOC entry 3904 (class 1259 OID 54324)
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- TOC entry 3905 (class 1259 OID 54325)
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- TOC entry 3908 (class 1259 OID 54326)
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- TOC entry 3911 (class 1259 OID 54327)
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- TOC entry 3912 (class 1259 OID 54328)
-- Name: sessions_oauth_client_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id);


--
-- TOC entry 3915 (class 1259 OID 54329)
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- TOC entry 3917 (class 1259 OID 54330)
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- TOC entry 3920 (class 1259 OID 54331)
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- TOC entry 3923 (class 1259 OID 54332)
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- TOC entry 3924 (class 1259 OID 54333)
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);


--
-- TOC entry 3867 (class 1259 OID 54334)
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- TOC entry 3916 (class 1259 OID 54335)
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- TOC entry 3930 (class 1259 OID 54336)
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- TOC entry 3931 (class 1259 OID 54337)
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- TOC entry 3932 (class 1259 OID 54338)
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- TOC entry 3933 (class 1259 OID 54339)
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- TOC entry 4028 (class 1259 OID 111883)
-- Name: webauthn_challenges_expires_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX webauthn_challenges_expires_at_idx ON auth.webauthn_challenges USING btree (expires_at);


--
-- TOC entry 4031 (class 1259 OID 111882)
-- Name: webauthn_challenges_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX webauthn_challenges_user_id_idx ON auth.webauthn_challenges USING btree (user_id);


--
-- TOC entry 4024 (class 1259 OID 111865)
-- Name: webauthn_credentials_credential_id_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX webauthn_credentials_credential_id_key ON auth.webauthn_credentials USING btree (credential_id);


--
-- TOC entry 4027 (class 1259 OID 111866)
-- Name: webauthn_credentials_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX webauthn_credentials_user_id_idx ON auth.webauthn_credentials USING btree (user_id);


--
-- TOC entry 3938 (class 1259 OID 54340)
-- Name: adoption_applications_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX adoption_applications_created_at_idx ON public.adoption_applications USING btree (created_at DESC);


--
-- TOC entry 3939 (class 1259 OID 54341)
-- Name: adoption_applications_email_lower_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX adoption_applications_email_lower_idx ON public.adoption_applications USING btree (lower(email));


--
-- TOC entry 3940 (class 1259 OID 54342)
-- Name: adoption_applications_one_approved_per_pet; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX adoption_applications_one_approved_per_pet ON public.adoption_applications USING btree (pet_id) WHERE (status = 'approved'::public.adoption_application_status);


--
-- TOC entry 3941 (class 1259 OID 54343)
-- Name: adoption_applications_pet_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX adoption_applications_pet_created_idx ON public.adoption_applications USING btree (pet_id, created_at DESC);


--
-- TOC entry 3944 (class 1259 OID 54344)
-- Name: adoption_applications_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX adoption_applications_status_idx ON public.adoption_applications USING btree (status);


--
-- TOC entry 3945 (class 1259 OID 54345)
-- Name: adoption_pets_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX adoption_pets_created_at_idx ON public.adoption_pets USING btree (created_at DESC);


--
-- TOC entry 3948 (class 1259 OID 54346)
-- Name: adoption_pets_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX adoption_pets_status_idx ON public.adoption_pets USING btree (status);


--
-- TOC entry 3950 (class 1259 OID 54347)
-- Name: alerts_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX alerts_created_at_idx ON public.alerts USING btree (created_at DESC);


--
-- TOC entry 3953 (class 1259 OID 54348)
-- Name: alerts_report_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX alerts_report_type_idx ON public.alerts USING btree (report_type);


--
-- TOC entry 3954 (class 1259 OID 54349)
-- Name: alerts_source_uniq; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX alerts_source_uniq ON public.alerts USING btree (source_table, source_id);


--
-- TOC entry 3949 (class 1259 OID 103702)
-- Name: idx_adoption_pets_species_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_adoption_pets_species_id ON public.adoption_pets USING btree (species_id);


--
-- TOC entry 3955 (class 1259 OID 54350)
-- Name: idx_alerts_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_alerts_source ON public.alerts USING btree (source_table, source_id);


--
-- TOC entry 3956 (class 1259 OID 54351)
-- Name: idx_alerts_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_alerts_status ON public.alerts USING btree (status);


--
-- TOC entry 3963 (class 1259 OID 54352)
-- Name: idx_barangays_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_barangays_name ON public.barangays USING btree (name);


--
-- TOC entry 3967 (class 1259 OID 54353)
-- Name: idx_reports_contact; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reports_contact ON public.reports USING btree (reporter_contact);


--
-- TOC entry 3968 (class 1259 OID 103708)
-- Name: idx_reports_species_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reports_species_id ON public.reports USING btree (species_id);


--
-- TOC entry 3969 (class 1259 OID 54354)
-- Name: idx_reports_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reports_status ON public.reports USING btree (status);


--
-- TOC entry 3970 (class 1259 OID 54355)
-- Name: idx_reports_team_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reports_team_id ON public.reports USING btree (team_id);


--
-- TOC entry 3971 (class 1259 OID 54356)
-- Name: idx_reports_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reports_user ON public.reports USING btree (user_id);


--
-- TOC entry 4000 (class 1259 OID 55948)
-- Name: idx_reverse_geocode_cache_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reverse_geocode_cache_key ON public.reverse_geocode_cache USING btree (provider, lat5, lng5);


--
-- TOC entry 3978 (class 1259 OID 54357)
-- Name: idx_shelters_barangay; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_shelters_barangay ON public.shelters USING btree (barangay_id);


--
-- TOC entry 3979 (class 1259 OID 54358)
-- Name: idx_shelters_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_shelters_name ON public.shelters USING btree (name);


--
-- TOC entry 3985 (class 1259 OID 54359)
-- Name: idx_team_members_profile; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_team_members_profile ON public.team_members USING btree (profile_id);


--
-- TOC entry 3989 (class 1259 OID 54360)
-- Name: idx_teams_barangay; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_teams_barangay ON public.teams USING btree (barangay_id);


--
-- TOC entry 3990 (class 1259 OID 54361)
-- Name: idx_teams_shelter; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_teams_shelter ON public.teams USING btree (shelter_id);


--
-- TOC entry 3972 (class 1259 OID 54362)
-- Name: reports_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX reports_created_at_idx ON public.reports USING btree (created_at DESC);


--
-- TOC entry 3973 (class 1259 OID 54363)
-- Name: reports_custom_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX reports_custom_id_key ON public.reports USING btree (custom_id);


--
-- TOC entry 3976 (class 1259 OID 54364)
-- Name: reports_report_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX reports_report_type_idx ON public.reports USING btree (report_type);


--
-- TOC entry 3977 (class 1259 OID 54365)
-- Name: reports_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX reports_user_id_idx ON public.reports USING btree (user_id);


--
-- TOC entry 3964 (class 1259 OID 54366)
-- Name: uq_barangays_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_barangays_name ON public.barangays USING btree (name);


--
-- TOC entry 3984 (class 1259 OID 54367)
-- Name: uq_shelters_name_barangay; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_shelters_name_barangay ON public.shelters USING btree (name, barangay_id);


--
-- TOC entry 3988 (class 1259 OID 54368)
-- Name: uq_team_members_team_profile; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_team_members_team_profile ON public.team_members USING btree (team_id, profile_id);


--
-- TOC entry 3993 (class 1259 OID 54369)
-- Name: uq_teams_brg_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_teams_brg_name ON public.teams USING btree (barangay_id, name) WHERE (barangay_id IS NOT NULL);


--
-- TOC entry 3994 (class 1259 OID 54370)
-- Name: uq_teams_name_barangay; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_teams_name_barangay ON public.teams USING btree (name, barangay_id);


--
-- TOC entry 3995 (class 1259 OID 54371)
-- Name: uq_teams_shel_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_teams_shel_name ON public.teams USING btree (shelter_id, name) WHERE (shelter_id IS NOT NULL);


--
-- TOC entry 4071 (class 2620 OID 54391)
-- Name: users on_auth_user_created; Type: TRIGGER; Schema: auth; Owner: supabase_auth_admin
--

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


--
-- TOC entry 4072 (class 2620 OID 54392)
-- Name: users on_auth_user_updated; Type: TRIGGER; Schema: auth; Owner: supabase_auth_admin
--

CREATE TRIGGER on_auth_user_updated AFTER UPDATE OF email ON auth.users FOR EACH ROW EXECUTE FUNCTION public.profile_sync_email_from_auth();


--
-- TOC entry 4073 (class 2620 OID 54393)
-- Name: adoption_applications trg_adoption_applications_set_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_adoption_applications_set_updated BEFORE UPDATE ON public.adoption_applications FOR EACH ROW EXECUTE FUNCTION public.fn_adoption_applications_set_updated();


--
-- TOC entry 4074 (class 2620 OID 54394)
-- Name: adoption_pets trg_adoption_pets_set_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_adoption_pets_set_updated BEFORE UPDATE ON public.adoption_pets FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- TOC entry 4075 (class 2620 OID 54395)
-- Name: adoption_pets trg_alerts_from_adoptions_del; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_alerts_from_adoptions_del AFTER DELETE ON public.adoption_pets FOR EACH ROW EXECUTE FUNCTION public.fn_alerts_sync_from_adoptions_del();


--
-- TOC entry 4076 (class 2620 OID 54396)
-- Name: adoption_pets trg_alerts_from_adoptions_ins; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_alerts_from_adoptions_ins AFTER INSERT ON public.adoption_pets FOR EACH ROW EXECUTE FUNCTION public.fn_alerts_sync_from_adoptions_ins_upd();


--
-- TOC entry 4077 (class 2620 OID 54397)
-- Name: adoption_pets trg_alerts_from_adoptions_upd; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_alerts_from_adoptions_upd AFTER UPDATE ON public.adoption_pets FOR EACH ROW EXECUTE FUNCTION public.fn_alerts_sync_from_adoptions_ins_upd();


--
-- TOC entry 4081 (class 2620 OID 54398)
-- Name: reports trg_alerts_from_reports_del; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_alerts_from_reports_del AFTER DELETE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.fn_alerts_sync_from_reports_del();


--
-- TOC entry 4082 (class 2620 OID 54399)
-- Name: reports trg_alerts_from_reports_ins; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_alerts_from_reports_ins AFTER INSERT ON public.reports FOR EACH ROW EXECUTE FUNCTION public.fn_alerts_sync_from_reports_ins_upd();


--
-- TOC entry 4083 (class 2620 OID 54400)
-- Name: reports trg_alerts_from_reports_upd; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_alerts_from_reports_upd AFTER UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.fn_alerts_sync_from_reports_ins_upd();


--
-- TOC entry 4091 (class 2620 OID 103709)
-- Name: animal_species trg_animal_species_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_animal_species_updated_at BEFORE UPDATE ON public.animal_species FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- TOC entry 4084 (class 2620 OID 54401)
-- Name: reports trg_delete_alerts_for_report; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_delete_alerts_for_report AFTER DELETE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.delete_alerts_for_report();


--
-- TOC entry 4078 (class 2620 OID 54402)
-- Name: profiles trg_profiles_mirror_ad; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_profiles_mirror_ad AFTER DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.fn_profiles_mirror_ad();


--
-- TOC entry 4079 (class 2620 OID 54403)
-- Name: profiles trg_profiles_mirror_aiu; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_profiles_mirror_aiu AFTER INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.fn_profiles_mirror_aiu();


--
-- TOC entry 4080 (class 2620 OID 54404)
-- Name: profiles trg_profiles_sync_barangay; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_profiles_sync_barangay BEFORE INSERT OR UPDATE OF barangay_id, barangay_name ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.trg_profiles_sync_barangay();


--
-- TOC entry 4090 (class 2620 OID 54804)
-- Name: qr_cards trg_qr_cards_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_qr_cards_updated BEFORE UPDATE ON public.qr_cards FOR EACH ROW EXECUTE FUNCTION public.fn_qr_cards_set_updated();


--
-- TOC entry 4085 (class 2620 OID 54405)
-- Name: reports trg_reports_auto_promote; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_reports_auto_promote BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.fn_reports_auto_promote_before_update();


--
-- TOC entry 4086 (class 2620 OID 54406)
-- Name: reports trg_reports_custom_id; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_reports_custom_id BEFORE INSERT ON public.reports FOR EACH ROW EXECUTE FUNCTION public.reports_set_custom_id();


--
-- TOC entry 4087 (class 2620 OID 54407)
-- Name: reports trg_reports_status_sync_ins; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_reports_status_sync_ins AFTER INSERT ON public.reports FOR EACH ROW EXECUTE FUNCTION public.sync_alert_status_from_report();


--
-- TOC entry 4088 (class 2620 OID 54408)
-- Name: reports trg_reports_status_sync_upd; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_reports_status_sync_upd AFTER UPDATE OF status ON public.reports FOR EACH ROW EXECUTE FUNCTION public.sync_alert_status_from_report();


--
-- TOC entry 4089 (class 2620 OID 54409)
-- Name: reports trg_sync_alert_pet_status; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_sync_alert_pet_status AFTER INSERT OR UPDATE OF pet_status ON public.reports FOR EACH ROW EXECUTE FUNCTION public.sync_alert_pet_status_from_reports();


--
-- TOC entry 4032 (class 2606 OID 54419)
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4033 (class 2606 OID 54424)
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- TOC entry 4034 (class 2606 OID 54429)
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- TOC entry 4035 (class 2606 OID 54434)
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4036 (class 2606 OID 54439)
-- Name: oauth_authorizations oauth_authorizations_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- TOC entry 4037 (class 2606 OID 54444)
-- Name: oauth_authorizations oauth_authorizations_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4038 (class 2606 OID 54449)
-- Name: oauth_consents oauth_consents_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- TOC entry 4039 (class 2606 OID 54454)
-- Name: oauth_consents oauth_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4040 (class 2606 OID 54459)
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4041 (class 2606 OID 54464)
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- TOC entry 4042 (class 2606 OID 54469)
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- TOC entry 4043 (class 2606 OID 54474)
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- TOC entry 4044 (class 2606 OID 54479)
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- TOC entry 4045 (class 2606 OID 54484)
-- Name: sessions sessions_oauth_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_oauth_client_id_fkey FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- TOC entry 4046 (class 2606 OID 54489)
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4047 (class 2606 OID 54494)
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- TOC entry 4070 (class 2606 OID 111877)
-- Name: webauthn_challenges webauthn_challenges_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4069 (class 2606 OID 111860)
-- Name: webauthn_credentials webauthn_credentials_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4048 (class 2606 OID 54499)
-- Name: adoption_applications adoption_applications_applicant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.adoption_applications
    ADD CONSTRAINT adoption_applications_applicant_id_fkey FOREIGN KEY (applicant_id) REFERENCES public.profiles(id);


--
-- TOC entry 4049 (class 2606 OID 54504)
-- Name: adoption_applications adoption_applications_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.adoption_applications
    ADD CONSTRAINT adoption_applications_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.adoption_pets(id) ON DELETE CASCADE;


--
-- TOC entry 4050 (class 2606 OID 54509)
-- Name: adoption_pets adoption_pets_posted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.adoption_pets
    ADD CONSTRAINT adoption_pets_posted_by_fkey FOREIGN KEY (posted_by) REFERENCES public.profiles(id);


--
-- TOC entry 4051 (class 2606 OID 103697)
-- Name: adoption_pets adoption_pets_species_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.adoption_pets
    ADD CONSTRAINT adoption_pets_species_id_fkey FOREIGN KEY (species_id) REFERENCES public.animal_species(id);


--
-- TOC entry 4068 (class 2606 OID 103692)
-- Name: animal_species_aliases animal_species_aliases_species_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.animal_species_aliases
    ADD CONSTRAINT animal_species_aliases_species_id_fkey FOREIGN KEY (species_id) REFERENCES public.animal_species(id) ON DELETE CASCADE;


--
-- TOC entry 4052 (class 2606 OID 54514)
-- Name: profiles profiles_barangay_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_barangay_id_fkey FOREIGN KEY (barangay_id) REFERENCES public.barangays(id);


--
-- TOC entry 4053 (class 2606 OID 54519)
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4054 (class 2606 OID 54524)
-- Name: profiles profiles_shelter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_shelter_id_fkey FOREIGN KEY (shelter_id) REFERENCES public.shelters(id) ON DELETE SET NULL;


--
-- TOC entry 4067 (class 2606 OID 54798)
-- Name: qr_cards qr_cards_owner_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.qr_cards
    ADD CONSTRAINT qr_cards_owner_profile_id_fkey FOREIGN KEY (owner_profile_id) REFERENCES public.profiles(id);


--
-- TOC entry 4055 (class 2606 OID 103703)
-- Name: reports reports_species_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_species_id_fkey FOREIGN KEY (species_id) REFERENCES public.animal_species(id);


--
-- TOC entry 4056 (class 2606 OID 54529)
-- Name: reports reports_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- TOC entry 4057 (class 2606 OID 54534)
-- Name: reports reports_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- TOC entry 4058 (class 2606 OID 54539)
-- Name: shelters shelters_barangay_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shelters
    ADD CONSTRAINT shelters_barangay_id_fkey FOREIGN KEY (barangay_id) REFERENCES public.barangays(id) ON DELETE SET NULL;


--
-- TOC entry 4059 (class 2606 OID 54544)
-- Name: team_members team_members_profile_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_profile_fk FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- TOC entry 4060 (class 2606 OID 54549)
-- Name: team_members team_members_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- TOC entry 4061 (class 2606 OID 54554)
-- Name: team_members team_members_team_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_fk FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- TOC entry 4062 (class 2606 OID 54559)
-- Name: team_members team_members_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- TOC entry 4063 (class 2606 OID 54564)
-- Name: teams teams_barangay_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_barangay_fk FOREIGN KEY (barangay_id) REFERENCES public.barangays(id) ON DELETE SET NULL;


--
-- TOC entry 4064 (class 2606 OID 54569)
-- Name: teams teams_barangay_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_barangay_id_fkey FOREIGN KEY (barangay_id) REFERENCES public.barangays(id) ON DELETE CASCADE;


--
-- TOC entry 4065 (class 2606 OID 54574)
-- Name: teams teams_shelter_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_shelter_fk FOREIGN KEY (shelter_id) REFERENCES public.shelters(id) ON DELETE CASCADE;


--
-- TOC entry 4066 (class 2606 OID 54579)
-- Name: teams teams_shelter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_shelter_id_fkey FOREIGN KEY (shelter_id) REFERENCES public.shelters(id) ON DELETE CASCADE;


--
-- TOC entry 4244 (class 0 OID 53794)
-- Dependencies: 267
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4245 (class 0 OID 53800)
-- Dependencies: 268
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4246 (class 0 OID 53805)
-- Dependencies: 269
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4247 (class 0 OID 53812)
-- Dependencies: 270
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4248 (class 0 OID 53817)
-- Dependencies: 271
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4249 (class 0 OID 53822)
-- Dependencies: 272
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4250 (class 0 OID 53827)
-- Dependencies: 273
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4251 (class 0 OID 53868)
-- Dependencies: 277
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4252 (class 0 OID 53876)
-- Dependencies: 278
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4253 (class 0 OID 53882)
-- Dependencies: 280
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4254 (class 0 OID 53890)
-- Dependencies: 281
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4255 (class 0 OID 53896)
-- Dependencies: 282
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4256 (class 0 OID 53899)
-- Dependencies: 283
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4257 (class 0 OID 53904)
-- Dependencies: 284
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4258 (class 0 OID 53910)
-- Dependencies: 285
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4259 (class 0 OID 53916)
-- Dependencies: 286
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4260 (class 0 OID 53931)
-- Dependencies: 287
-- Name: adoption_applications; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.adoption_applications ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4261 (class 0 OID 53944)
-- Dependencies: 288
-- Name: adoption_pets; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.adoption_pets ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4271 (class 3256 OID 54609)
-- Name: adoption_pets adoption_pets_public_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY adoption_pets_public_read ON public.adoption_pets FOR SELECT USING (true);


--
-- TOC entry 4262 (class 0 OID 53956)
-- Dependencies: 289
-- Name: alerts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4272 (class 3256 OID 54610)
-- Name: alerts alerts_delete_own_reports; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY alerts_delete_own_reports ON public.alerts FOR DELETE TO authenticated USING (((source_table = 'reports'::text) AND (EXISTS ( SELECT 1
   FROM public.reports r
  WHERE ((r.id = alerts.source_id) AND ((r.user_id = auth.uid()) OR ((r.reporter_contact IS NOT NULL) AND ((auth.jwt() ->> 'email'::text) IS NOT NULL) AND (r.reporter_contact = (auth.jwt() ->> 'email'::text)))))))));


--
-- TOC entry 4273 (class 3256 OID 54611)
-- Name: alerts alerts_insert_own_reports; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY alerts_insert_own_reports ON public.alerts FOR INSERT TO authenticated WITH CHECK (((source_table = 'reports'::text) AND (EXISTS ( SELECT 1
   FROM public.reports r
  WHERE ((r.id = alerts.source_id) AND ((r.user_id = auth.uid()) OR ((r.reporter_contact IS NOT NULL) AND ((auth.jwt() ->> 'email'::text) IS NOT NULL) AND (r.reporter_contact = (auth.jwt() ->> 'email'::text)))))))));


--
-- TOC entry 4274 (class 3256 OID 54612)
-- Name: alerts alerts_public_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY alerts_public_read ON public.alerts FOR SELECT USING (true);


--
-- TOC entry 4275 (class 3256 OID 54613)
-- Name: alerts alerts_update_own_reports; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY alerts_update_own_reports ON public.alerts FOR UPDATE TO authenticated USING (((source_table = 'reports'::text) AND (EXISTS ( SELECT 1
   FROM public.reports r
  WHERE ((r.id = alerts.source_id) AND ((r.user_id = auth.uid()) OR ((r.reporter_contact IS NOT NULL) AND ((auth.jwt() ->> 'email'::text) IS NOT NULL) AND (r.reporter_contact = (auth.jwt() ->> 'email'::text))))))))) WITH CHECK (((source_table = 'reports'::text) AND (EXISTS ( SELECT 1
   FROM public.reports r
  WHERE ((r.id = alerts.source_id) AND ((r.user_id = auth.uid()) OR ((r.reporter_contact IS NOT NULL) AND ((auth.jwt() ->> 'email'::text) IS NOT NULL) AND (r.reporter_contact = (auth.jwt() ->> 'email'::text)))))))));


--
-- TOC entry 4276 (class 3256 OID 54615)
-- Name: adoption_applications allow_any_auth_user_delete_apps; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY allow_any_auth_user_delete_apps ON public.adoption_applications FOR DELETE TO authenticated USING (true);


--
-- TOC entry 4277 (class 3256 OID 54616)
-- Name: reports allow_any_auth_user_delete_reports; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY allow_any_auth_user_delete_reports ON public.reports FOR DELETE TO authenticated USING (true);


--
-- TOC entry 4269 (class 0 OID 103664)
-- Dependencies: 318
-- Name: animal_species; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.animal_species ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4270 (class 0 OID 103682)
-- Dependencies: 319
-- Name: animal_species_aliases; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.animal_species_aliases ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4292 (class 3256 OID 103711)
-- Name: animal_species_aliases animal_species_aliases_public_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY animal_species_aliases_public_read ON public.animal_species_aliases FOR SELECT USING (true);


--
-- TOC entry 4291 (class 3256 OID 103710)
-- Name: animal_species animal_species_public_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY animal_species_public_read ON public.animal_species FOR SELECT USING ((active = true));


--
-- TOC entry 4263 (class 0 OID 53968)
-- Dependencies: 290
-- Name: barangays; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.barangays ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4278 (class 3256 OID 54617)
-- Name: barangays barangays_super_admin_full; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY barangays_super_admin_full ON public.barangays TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.role = 'super-admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.role = 'super-admin'::text)))));


--
-- TOC entry 4279 (class 3256 OID 54619)
-- Name: alerts delete alerts via report ownership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "delete alerts via report ownership" ON public.alerts FOR DELETE TO authenticated USING (((source_table = 'reports'::text) AND (EXISTS ( SELECT 1
   FROM public.reports r
  WHERE ((r.id = alerts.source_id) AND (r.user_id = auth.uid()))))));


--
-- TOC entry 4280 (class 3256 OID 54620)
-- Name: adoption_applications insert adoption apps via email; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "insert adoption apps via email" ON public.adoption_applications FOR INSERT WITH CHECK (((auth.email() IS NOT NULL) AND (lower(email) = lower(auth.email()))));


--
-- TOC entry 4264 (class 0 OID 53976)
-- Dependencies: 291
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4281 (class 3256 OID 54621)
-- Name: profiles profiles_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


--
-- TOC entry 4282 (class 3256 OID 54622)
-- Name: profiles profiles_read_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_read_own ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- TOC entry 4283 (class 3256 OID 54623)
-- Name: profiles profiles_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- TOC entry 4284 (class 3256 OID 54624)
-- Name: reports read_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY read_own ON public.reports FOR SELECT USING (((user_id = auth.uid()) OR (reporter_contact = (auth.jwt() ->> 'email'::text))));


--
-- TOC entry 4265 (class 0 OID 53985)
-- Dependencies: 293
-- Name: reports; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4285 (class 3256 OID 54625)
-- Name: reports reports_barangay_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY reports_barangay_delete ON public.reports FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (lower(COALESCE(p.role, ''::text)) = 'barangay-admin'::text)))));


--
-- TOC entry 4286 (class 3256 OID 54626)
-- Name: reports reports_barangay_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY reports_barangay_insert ON public.reports FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (lower(COALESCE(p.role, ''::text)) = 'barangay-admin'::text)))));


--
-- TOC entry 4287 (class 3256 OID 54627)
-- Name: reports reports_barangay_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY reports_barangay_update ON public.reports FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (lower(COALESCE(p.role, ''::text)) = 'barangay-admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (lower(COALESCE(p.role, ''::text)) = 'barangay-admin'::text)))));


--
-- TOC entry 4288 (class 3256 OID 54629)
-- Name: reports reports_public_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY reports_public_read ON public.reports FOR SELECT USING (true);


--
-- TOC entry 4289 (class 3256 OID 54630)
-- Name: reports reports_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY reports_update_own ON public.reports FOR UPDATE TO authenticated USING (((auth.uid() = user_id) OR ((reporter_contact IS NOT NULL) AND ((auth.jwt() ->> 'email'::text) IS NOT NULL) AND ((auth.jwt() ->> 'email'::text) = reporter_contact)))) WITH CHECK (((auth.uid() = user_id) OR ((reporter_contact IS NOT NULL) AND ((auth.jwt() ->> 'email'::text) IS NOT NULL) AND ((auth.jwt() ->> 'email'::text) = reporter_contact))));


--
-- TOC entry 4290 (class 3256 OID 54631)
-- Name: adoption_applications select adoption apps via email; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "select adoption apps via email" ON public.adoption_applications FOR SELECT USING (((auth.email() IS NOT NULL) AND (lower(email) = lower(auth.email()))));


--
-- TOC entry 4266 (class 0 OID 53999)
-- Dependencies: 294
-- Name: shelters; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.shelters ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4293 (class 3256 OID 54632)
-- Name: shelters shelters_super_admin_full; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY shelters_super_admin_full ON public.shelters TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.role = 'super-admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.role = 'super-admin'::text)))));


--
-- TOC entry 4267 (class 0 OID 54007)
-- Dependencies: 295
-- Name: team_members; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4294 (class 3256 OID 54634)
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
-- TOC entry 4295 (class 3256 OID 54636)
-- Name: team_members team_members_ba_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY team_members_ba_select ON public.team_members FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.profiles pr
     JOIN public.teams t ON ((t.barangay_id = pr.barangay_id)))
  WHERE ((pr.id = auth.uid()) AND (pr.role = 'barangay-admin'::text) AND (t.id = team_members.team_id)))));


--
-- TOC entry 4296 (class 3256 OID 54637)
-- Name: team_members team_members_super_admin_full; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY team_members_super_admin_full ON public.team_members TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.role = 'super-admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.role = 'super-admin'::text)))));


--
-- TOC entry 4268 (class 0 OID 54011)
-- Dependencies: 296
-- Name: teams; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4297 (class 3256 OID 54639)
-- Name: teams teams_ba_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY teams_ba_insert ON public.teams FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.role = 'barangay-admin'::text) AND (pr.barangay_id = pr.barangay_id)))));


--
-- TOC entry 4298 (class 3256 OID 54640)
-- Name: teams teams_ba_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY teams_ba_select ON public.teams FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.role = 'barangay-admin'::text) AND (pr.barangay_id = teams.barangay_id)))));


--
-- TOC entry 4299 (class 3256 OID 54641)
-- Name: teams teams_ba_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY teams_ba_update ON public.teams FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.role = 'barangay-admin'::text) AND (pr.barangay_id = teams.barangay_id))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.role = 'barangay-admin'::text) AND (pr.barangay_id = teams.barangay_id)))));


--
-- TOC entry 4300 (class 3256 OID 54643)
-- Name: teams teams_super_admin_full; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY teams_super_admin_full ON public.teams TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.role = 'super-admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.role = 'super-admin'::text)))));


--
-- TOC entry 4301 (class 3256 OID 54645)
-- Name: adoption_applications update own adoption apps via email; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "update own adoption apps via email" ON public.adoption_applications FOR UPDATE USING (((auth.email() IS NOT NULL) AND (lower(email) = lower(auth.email())))) WITH CHECK (((auth.email() IS NOT NULL) AND (lower(email) = lower(auth.email()))));


-- Completed on 2026-03-29 10:00:45

--
-- PostgreSQL database dump complete
--

\unrestrict czClPSOgsSK90NYbvmNDHBoY8MNdK0zce2RM4ka46gCSt8BcN1oK7ZhKHNlknfe

