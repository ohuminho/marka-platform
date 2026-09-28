import LoginForm from "@/frontend/features/auth/components/LoginForm";


export default function LoginPage() {

  return (

    <main
      className="
        min-h-screen
        flex
        items-center
        justify-center
        bg-[var(--theme-background)]
      "
    >

      <LoginForm />

    </main>

  );

}
