import { Link } from "react-router";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

export default function NotFoundPage() {
  useDocumentTitle("Not found");
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center sm:px-6">
      <h1 className="text-3xl font-medium text-ink-900">We can&apos;t find that page.</h1>
      <div className="mt-6 flex justify-center gap-4 text-sm font-medium">
        <Link to="/" className="underline-offset-4 hover:underline">
          Home
        </Link>
        <Link to="/verify" className="underline-offset-4 hover:underline">
          Verify
        </Link>
      </div>
    </div>
  );
}
