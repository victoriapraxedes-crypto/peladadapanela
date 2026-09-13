create or replace function public.impede_autopromocao_perfil()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role or new.acesso is distinct from old.acesso then
    raise exception 'Apenas administradores podem alterar papel ou status de acesso.'
      using errcode = '42501';
  end if;
  return new;
end;
$function$;

revoke execute on function public.impede_autopromocao_perfil() from public, anon, authenticated;

drop trigger if exists trg_profiles_impede_autopromocao on public.profiles;
create trigger trg_profiles_impede_autopromocao
  before update on public.profiles
  for each row execute function public.impede_autopromocao_perfil();