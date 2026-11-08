"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteMediaFile } from "@/app/admin/media/actions";

/** Tombol hapus berkas unggahan — konfirmasi dulu, lalu hapus via server action. */
export default function DeleteMediaButton({
  relPath,
  name,
}: {
  relPath: string;
  name: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Hapus berkas "${name}"?`)) return;
          startTransition(async () => {
            const res = await deleteMediaFile(relPath);
            if (!res.ok) setMessage(res.message);
            else router.refresh();
          });
        }}
        className="inline-flex min-h-8 items-center rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-600 disabled:opacity-50"
      >
        {pending ? "…" : "Hapus"}
      </button>
      {message ? <span className="text-xs text-red-600">{message}</span> : null}
    </span>
  );
}
