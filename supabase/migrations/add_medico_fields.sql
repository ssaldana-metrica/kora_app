-- Agrega campos de especialidad, ubicacion y bio a profiles para médicos
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS especialidad TEXT,
  ADD COLUMN IF NOT EXISTS ubicacion TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT;

-- Policy: cualquier paciente autenticado puede buscar médicos por nombre/especialidad
-- (la policy por defecto "own" bloquea esto)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'profiles'
    AND policyname = 'profiles: pacientes pueden buscar medicos'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "profiles: pacientes pueden buscar medicos"
        ON public.profiles FOR SELECT
        USING (role = 'medico');
    $policy$;
  END IF;
END $$;
