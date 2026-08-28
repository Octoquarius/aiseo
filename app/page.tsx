import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-20 text-center">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Is your website <span className="text-primary">visible</span> to AI?
        </h1>
        <p className="mx-auto max-w-xl text-lg text-muted-foreground">
          Add your URL; we&apos;ll measure how well AI engines like ChatGPT, Perplexity, and
          Claude understand and can recommend your site. Get copy-paste code fixes for every
          issue.
        </p>
      </div>
      <div className="flex gap-3">
        {user ? (
          <Button size="lg" render={<Link href="/dashboard" />}>Go to Dashboard</Button>
        ) : (
          <>
            <Button size="lg" render={<Link href="/signup" />}>Get Started Free</Button>
            <Button size="lg" variant="outline" render={<Link href="/login" />}>Log In</Button>
          </>
        )}
      </div>
    </div>
  );
}
