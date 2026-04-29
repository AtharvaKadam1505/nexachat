import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M4 8C4 5.79 5.79 4 8 4h12c2.21 0 4 1.79 4 4v8c0 2.21-1.79 4-4 4h-2l-4 4-4-4H8c-2.21 0-4-1.79-4-4V8z" fill="white"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Welcome to NexaChat</h1>
          <p className="text-muted-foreground text-sm mt-1">Sign in to continue messaging</p>
        </div>
        <SignIn />
      </div>
    </div>
  );
}
