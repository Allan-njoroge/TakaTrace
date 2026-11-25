import { useNavigate } from "react-router";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import PickerRegistrationForm from "./PickerRegistrationForm";

export default function PickerNewPage() {
  useDocumentTitle("Register picker");
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-semibold text-ink-900">Register picker</h1>
      <div className="mt-6">
        <PickerRegistrationForm onRegistered={(picker) => navigate(`/app/centre/pickers/${picker.id}`)} />
      </div>
    </div>
  );
}
