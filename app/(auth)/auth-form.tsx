"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { AuthState } from "./actions";

type Action = (prev: AuthState, formData: FormData) => Promise<AuthState>;

interface Props {
  mode: "login" | "signup";
  action: Action;
}

export function AuthForm({ mode, action }: Props) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, {});
  const isLogin = mode === "login";

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{isLogin ? "Log In" : "Create Account"}</CardTitle>
        <CardDescription>
          {isLogin
            ? "Log in to access your AI SEO dashboard."
            : "Start making your website more visible to AI."}
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required autoComplete={isLogin ? "current-password" : "new-password"} />
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state.message && <p className="text-sm text-emerald-600">{state.message}</p>}
        </CardContent>
        <CardFooter className="flex-col gap-3 pt-2">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Processing…" : isLogin ? "Log In" : "Sign Up"}
          </Button>
          <p className="text-sm text-muted-foreground">
            {isLogin ? (
              <>
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="text-primary underline">Sign up</Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link href="/login" className="text-primary underline">Log in</Link>
              </>
            )}
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
