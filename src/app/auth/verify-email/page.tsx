import VerifyEmailClient from "@/frontend/features/auth/components/VerifyEmailClient";

type VerifyEmailPageProps = {
  searchParams: Promise<{
    token?: string | string[];
  }>;
};

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const params = await searchParams;
  const token =
    typeof params.token === "string"
      ? params.token.trim()
      : "";

  return <VerifyEmailClient token={token} />;
}
