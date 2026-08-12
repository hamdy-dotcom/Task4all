export interface FileItemProp {
  id: string;
  file_name: string;
  size_bytes: number | null;
  mime_type: string | null;
  storage_path: string;
  uploaded_by: string;
  uploader_name: string | null;
  created_at: string;
  signed_url: string | null; // pre-generated for images; null for non-images
}

export interface HistoryEntryProp {
  id: string;
  action: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_avatar: string | null;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  metadata: unknown;
  created_at: string;
}
