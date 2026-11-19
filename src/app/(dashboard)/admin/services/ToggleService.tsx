"use client";

export default function ToggleService({ serviceId, isActive }: { serviceId: string; isActive: boolean }) {
  async function handleClick() {
    const res = await fetch(`/api/admin/services?id=${serviceId}`, {
      method: isActive ? "DELETE" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !isActive }),
    });
    if (res.ok) window.location.reload();
  }

  return (
    <button
      onClick={handleClick}
      className={`text-xs px-2 py-1 rounded font-medium ${
        isActive
          ? "bg-red-50 text-red-700 hover:bg-red-100"
          : "bg-green-50 text-green-700 hover:bg-green-100"
      }`}
    >
      {isActive ? "Deactivate" : "Activate"}
    </button>
  );
}
