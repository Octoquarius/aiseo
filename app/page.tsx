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
          Web siteniz AI&apos;a <span className="text-primary">görünür</span> mü?
        </h1>
        <p className="mx-auto max-w-xl text-lg text-muted-foreground">
          URL&apos;nizi ekleyin; ChatGPT, Perplexity ve Claude gibi AI motorlarının
          sitenizi ne kadar anladığını ve önerebileceğini ölçelim. Her sorun için
          kopyala-yapıştır kod düzeltmesi alın.
        </p>
      </div>
      <div className="flex gap-3">
        {user ? (
          <Button size="lg" render={<Link href="/dashboard" />}>Panele Git</Button>
        ) : (
          <>
            <Button size="lg" render={<Link href="/signup" />}>Ücretsiz Başla</Button>
            <Button size="lg" variant="outline" render={<Link href="/login" />}>Giriş Yap</Button>
          </>
        )}
      </div>
    </div>
  );
}
