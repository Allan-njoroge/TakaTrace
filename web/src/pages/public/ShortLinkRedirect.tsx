import { Navigate, useParams } from "react-router";

/** /v/:receiptId -> /verify/:receiptId (spec 5.1, the short link used in SMS/QR). */
export default function ShortLinkRedirectPage() {
  const { receiptId } = useParams();
  return <Navigate to={`/verify/${receiptId}`} replace />;
}
