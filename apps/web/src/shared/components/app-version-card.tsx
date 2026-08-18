export function AppVersionCard() {
  const version = import.meta.env.VITE_APP_VERSION;

  if (!version) return null;

  return <p className="text-xs text-muted-foreground px-1">Seedarr v{version}</p>;
}
