"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .substring(0, 100);
}

async function getAuthedClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function uploadFiles(
  workItemId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const [{ supabase, user }, tc] = await Promise.all([getAuthedClient(), getTranslations("common")]);
  if (!user) return { error: tc("notAuthenticated") };

  // Authorization: super_admin, creator, or assigned
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isSuperAdmin = profile?.role === "super_admin";

  if (!isSuperAdmin) {
    const { data: item } = await supabase
      .from("work_items")
      .select("created_by")
      .eq("id", workItemId)
      .single();
    const { data: assignment } = await supabase
      .from("work_item_assignees")
      .select("user_id")
      .eq("work_item_id", workItemId)
      .eq("user_id", user.id)
      .maybeSingle();
    const canUpload = item?.created_by === user.id || !!assignment;
    if (!canUpload) return { error: tc("forbidden") };
  }

  const files = formData.getAll("files") as File[];
  if (files.length === 0) return { error: tc("noFiles") };

  const errors: string[] = [];

  for (const file of files) {
    if (!(file instanceof File) || file.size === 0) continue;

    const uuid = crypto.randomUUID();
    const sanitized = sanitizeFilename(file.name);
    const storagePath = `${workItemId}/${uuid}-${sanitized}`;

    const { error: storageError } = await supabase.storage
      .from("work-item-files")
      .upload(storagePath, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (storageError) {
      errors.push(`${file.name}: ${storageError.message}`);
      continue;
    }

    const { error: dbError } = await supabase
      .from("work_item_attachments")
      .insert({
        work_item_id: workItemId,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type || null,
        size_bytes: file.size,
        uploaded_by: user.id,
      });

    if (dbError) {
      // Clean up the storage object if DB insert fails
      await supabase.storage.from("work-item-files").remove([storagePath]);
      errors.push(`${file.name}: ${dbError.message}`);
    }
  }

  revalidatePath(`/tasks/${workItemId}`);
  revalidatePath(`/initiatives/${workItemId}`);
  revalidatePath(`/subtasks/${workItemId}`);

  if (errors.length > 0) return { error: errors.join("; ") };
  return {};
}

export async function deleteFile(
  attachmentId: string
): Promise<{ error?: string }> {
  const [{ supabase, user }, tc] = await Promise.all([getAuthedClient(), getTranslations("common")]);
  if (!user) return { error: tc("notAuthenticated") };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isSuperAdmin = profile?.role === "super_admin";

  const { data: attachment } = await supabase
    .from("work_item_attachments")
    .select("uploaded_by, storage_path, work_item_id")
    .eq("id", attachmentId)
    .single();

  if (!attachment) return { error: tc("notFound") };
  if (!isSuperAdmin && attachment.uploaded_by !== user.id) {
    return { error: tc("forbidden") };
  }

  // Remove from storage first
  const { error: storageError } = await supabase.storage
    .from("work-item-files")
    .remove([attachment.storage_path]);

  if (storageError) return { error: storageError.message };

  const { error: dbError } = await supabase
    .from("work_item_attachments")
    .delete()
    .eq("id", attachmentId);

  if (dbError) return { error: dbError.message };

  const wid = attachment.work_item_id;
  revalidatePath(`/tasks/${wid}`);
  revalidatePath(`/initiatives/${wid}`);
  revalidatePath(`/subtasks/${wid}`);

  return {};
}

export async function getDownloadUrl(
  storagePath: string
): Promise<string | null> {
  const { supabase, user } = await getAuthedClient();
  if (!user) return null;

  const { data } = await supabase.storage
    .from("work-item-files")
    .createSignedUrl(storagePath, 60); // 60-second window

  return data?.signedUrl ?? null;
}
