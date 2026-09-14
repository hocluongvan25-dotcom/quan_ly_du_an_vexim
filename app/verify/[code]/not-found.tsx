import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFoundCert() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#fff8ec] px-6">
      <div className="max-w-sm text-center">
        <Logo className="justify-center" />
        <h1 className="mt-6 font-display text-2xl font-extrabold text-navy-900">
          Certificate Not Found
        </h1>
        <p className="mt-2 text-sm text-navy-900/60">
          Invalid QR code or record has not been published.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
