import { useState } from "react";

const INDEXER_TYPE_KEY = "torrent_indexer_type";
const JACKETT_API_KEY = "jackett_api_key";
const PROWLARR_API_KEY = "prowlarr_api_key";

export type IndexerType = "jackett" | "prowlarr";

export function useTorrentIndexer() {
  const [indexerType, setIndexerTypeState] = useState<IndexerType>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem(INDEXER_TYPE_KEY) as IndexerType) || "jackett";
    }
    return "jackett";
  });

  const [jackettApiKey, setJackettApiKeyState] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(JACKETT_API_KEY);
    }
    return null;
  });

  const [prowlarrApiKey, setProwlarrApiKeyState] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(PROWLARR_API_KEY);
    }
    return null;
  });

  const setIndexerType = (type: IndexerType) => {
    localStorage.setItem(INDEXER_TYPE_KEY, type);
    setIndexerTypeState(type);
  };

  const updateJackettApiKey = (key: string | null) => {
    if (key) {
      localStorage.setItem(JACKETT_API_KEY, key);
    } else {
      localStorage.removeItem(JACKETT_API_KEY);
    }
    setJackettApiKeyState(key);
  };

  const updateProwlarrApiKey = (key: string | null) => {
    if (key) {
      localStorage.setItem(PROWLARR_API_KEY, key);
    } else {
      localStorage.removeItem(PROWLARR_API_KEY);
    }
    setProwlarrApiKeyState(key);
  };

  return {
    indexerType,
    setIndexerType,
    jackettApiKey,
    updateJackettApiKey,
    prowlarrApiKey,
    updateProwlarrApiKey,
  };
}
