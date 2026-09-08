CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  admin_emails text[] := array['victoriapraxedes@gmail.com','ennenataly@gmail.com','pvalvesrocha8@gmail.com'];
  eh_dona boolean := lower(new.email) = any(admin_emails);
begin
  insert into public.profiles (id, nome, email, avatar_url, role, acesso)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url',
    case when eh_dona then 'admin'::public.user_role else 'jogador'::public.user_role end,
    case when eh_dona then 'aprovado'::public.acesso_status else 'pendente'::public.acesso_status end
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;

UPDATE public.profiles p
   SET role = 'admin'::public.user_role,
       acesso = 'aprovado'::public.acesso_status
  FROM auth.users u
 WHERE u.id = p.id
   AND lower(u.email) = any(array['victoriapraxedes@gmail.com','ennenataly@gmail.com','pvalvesrocha8@gmail.com'])
   AND (p.role <> 'admin'::public.user_role OR p.acesso <> 'aprovado'::public.acesso_status);