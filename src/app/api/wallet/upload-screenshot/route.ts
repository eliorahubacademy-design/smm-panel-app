import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Only images are allowed." },
      { status: 400 }
    );
  }

  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 5MB." },
      { status: 400 }
    );
  }

  const fileExt = file.name.split(".").pop() ?? "jpg";
  const fileName = `${user.id}/${Date.now()}.${fileExt}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  // Use admin client to bypass RLS for upload (storage policies handle access)
  const adminClient = createAdminClient();
  const { data, error } = await adminClient.storage
    .from("payment-screenshots")
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error("Storage upload error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }

  // Return the storage path (not a public URL — we'll generate signed URLs when needed)
  return NextResponse.json({ path: data.path }, { status: 201 });
}
