-- Talind private profile documents storage
-- Re-run safely in the Supabase SQL Editor.
-- Uses current Supabase Storage ownership/JWT patterns.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-documents',
  'profile-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Talind users upload own documents" on storage.objects;
drop policy if exists "Talind users read own documents" on storage.objects;
drop policy if exists "Talind users update own documents" on storage.objects;
drop policy if exists "Talind users delete own documents" on storage.objects;

-- Upload only into a top-level folder named with the authenticated user's UUID.
create policy "Talind users upload own documents"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-documents'
  and (storage.foldername(name))[1] = (select auth.jwt()->>'sub')
);

-- Storage assigns owner_id from the authenticated user's JWT.
-- This SELECT is also required so Storage can return metadata after an upload.
create policy "Talind users read own documents"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'profile-documents'
  and owner_id = (select auth.jwt()->>'sub')
);

create policy "Talind users update own documents"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-documents'
  and owner_id = (select auth.jwt()->>'sub')
)
with check (
  bucket_id = 'profile-documents'
  and owner_id = (select auth.jwt()->>'sub')
);

create policy "Talind users delete own documents"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-documents'
  and owner_id = (select auth.jwt()->>'sub')
);
