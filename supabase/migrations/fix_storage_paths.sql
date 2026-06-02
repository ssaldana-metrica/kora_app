-- Policy de storage: solo el dueño puede escribir en su carpeta
CREATE POLICY IF NOT EXISTS "storage: solo dueno escribe"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documentos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy para que el dueño pueda leer sus propios archivos
CREATE POLICY IF NOT EXISTS "storage: solo dueno lee"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documentos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
