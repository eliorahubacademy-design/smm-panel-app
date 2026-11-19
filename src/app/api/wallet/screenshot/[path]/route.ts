import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { path } = await params;
  const filePath = decodeURIComponent(path);

  // Verify this screenshot belongs to the user (or user is admin)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  const isOwner = filePath.startsWith(`${user.id}/`);

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Generate a signed URL valid for 10 minutes
  const adminClient = createAdminClient();
  const { data, error } = await adminClient.storage
    .from("payment-screenshots")
    .createSignedUrl(filePath, 600); // 10 minutes

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  // Redirect to the signed URL
  return NextResponse.redirect(data.signedUrl);
}
