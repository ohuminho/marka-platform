import VerifyEmailClient from "@/frontend/features/auth/components/VerifyEmailClient";

type VerifyEmailPageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const params = await searchParams;

  const token =
    typeof params.token === "string"
      ? params.token
      : "";

  return <VerifyEmailClient token={token} />;
}
