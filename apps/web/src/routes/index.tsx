import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { signOut, useSession } from "@/lib/auth";

export const Route = createFileRoute("/")({
  component: App,
});

function App() {
  const { data } = useSession();
  console.log(data);

  return (
    <div className="size-full flex flex-col">
      Hello
      {data ? (
        <Button onClick={() => signOut()}>Sign Out</Button>
      ) : (
        <Button to="/login">Sign In</Button>
      )}
    </div>
  );
}
