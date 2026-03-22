"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";

export function useClientId() {
  const [clientId, setClientId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setClientId(data.user?.user_metadata?.client_id ?? "");
      setLoading(false);
    });
  }, []);

  return { clientId, loading };
}
