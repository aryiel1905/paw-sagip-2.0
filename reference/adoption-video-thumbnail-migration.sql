alter table public.adoption_pets
add column if not exists video_thumbnail_path text;

create or replace function public.promote_report_to_adoption(p_report_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  v_exists uuid;
  v_new_pet_id uuid;
begin
  select promoted_to_pet_id into v_exists
  from public.reports
  where id = p_report_id and report_type = 'adoption';

  if v_exists is not null then
    return v_exists;
  end if;

  insert into public.adoption_pets (
    species,
    pet_name,
    age_size,
    features,
    location,
    status,
    photo_path,
    video_thumbnail_path,
    landmark_media_paths,
    latitude,
    longitude
  )
  select
    r.species,
    r.pet_name,
    r.age_size,
    r.features,
    r.location,
    'available',
    r.photo_path,
    r.video_thumbnail_path,
    coalesce(r.landmark_media_paths, '{}'),
    r.latitude,
    r.longitude
  from public.reports r
  where r.id = p_report_id and r.report_type = 'adoption'
  returning id into v_new_pet_id;

  update public.reports
  set promoted_to_pet_id = v_new_pet_id
  where id = p_report_id;

  delete from public.alerts
  where source_table = 'reports' and source_id = p_report_id;

  return v_new_pet_id;
end $$;
