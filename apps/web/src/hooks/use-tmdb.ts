import { useEffect, useState } from "react";
import { TMDB } from "tmdb-ts";

const TMDB_API_KEY_STORAGE_KEY = "tmdb_api_key";

export function useTmdb() {
  const [apiKey, setApiKey] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(TMDB_API_KEY_STORAGE_KEY);
    }
    return null;
  });

  const [tmdb, setTmdb] = useState<TMDB | null>(null);

  useEffect(() => {
    if (apiKey) {
      const instance = new TMDB(apiKey);
      setTmdb(instance);
    } else {
      setTmdb(null);
    }
  }, [apiKey]);

  const updateApiKey = (key: string | null) => {
    if (key) {
      localStorage.setItem(TMDB_API_KEY_STORAGE_KEY, key);
    } else {
      localStorage.removeItem(TMDB_API_KEY_STORAGE_KEY);
    }
    setApiKey(key);
  };

  const isLogged = !!apiKey && apiKey.length > 0;

  return {
    apiKey,
    isLogged,
    updateApiKey,
    tmdb,
  };
}
