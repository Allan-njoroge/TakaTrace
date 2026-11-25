import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { Pill } from "../../components/ui/Pill";

const SECTIONS = [
  {
    heading: "The problem",
    body: (
      <>
        <p>
          Waste pickers are often paid whatever a buying centre chooses to write down, with no independent record of
          the actual weight bought. Brands reporting against Kenya&apos;s Extended Producer Responsibility (EPR)
          targets have no shared way to prove a kilogram of recovered plastic was only counted once. And because
          paper and spreadsheet records can be edited after the fact, nobody outside the buying centre can be
          certain a receipt wasn&apos;t changed later.
        </p>
      </>
    ),
  },
  {
    heading: "Why a blockchain and not just a database",
    body: (
      <p>
        A blockchain earns its keep only when three things are all true: several parties who don&apos;t fully trust
        each other need to agree on the same facts; no single one of them should own or control the record; and
        people outside the system need to be able to verify it themselves. TakaTrace&apos;s receipts fit all three —
        pickers, buying centres, brands and regulators all have a stake in the same weigh-in, and anyone with the
        receipt ID can check it without asking TakaTrace for permission.
      </p>
    ),
  },
  {
    heading: "Architecture",
    body: (
      <p>
        A buying centre's browser talks to the TakaTrace server for everything except the blockchain itself: photo
        storage, SMS, USSD and M-Pesa payouts all go through the server. The browser signs transactions directly
        with the buying centre, brand or admin's own wallet, and reads the blockchain independently when verifying a
        receipt, so the server can never fake a "genuine" result.
      </p>
    ),
  },
  {
    heading: "What is stored where",
    body: (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line-200 text-left text-ink-600">
              <th scope="col" className="py-2 pr-4 font-medium">
                Off-chain (TakaTrace database)
              </th>
              <th scope="col" className="py-2 font-medium">
                On-chain (the smart contract)
              </th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Picker name, phone number, photo file", "Receipt ID"],
              ["Prices and payouts", "Fingerprint (hash) of the record"],
              ["SMS and USSD message content", "Recording buying centre's wallet address"],
              ["Dispute messages", "Time recorded"],
              ["", "Claimed flag and claiming brand's wallet address"],
              ["", "Dispute flag"],
            ].map(([off, on]) => (
              <tr key={`${off}-${on}`} className="border-b border-line-200 last:border-0">
                <td className="py-2 pr-4 align-top text-ink-900">{off}</td>
                <td className="py-2 align-top text-ink-900">{on}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
  },
  {
    heading: "Privacy",
    body: (
      <p>
        No personal data — no names, phone numbers or photos of people — is ever sent to the blockchain. Pickers are
        identified on-chain only by the buying centre's wallet address that recorded their weigh-in; their own
        identity stays in TakaTrace's database, visible only to the buying centre that registered them and to
        admins.
      </p>
    ),
  },
  {
    heading: "Limits",
    body: (
      <p>
        A blockchain record proves a receipt hasn&apos;t been edited since it was anchored. It can&apos;t prove the
        scale itself was accurate or honest at the moment of weighing — that still depends on the photograph taken
        at the scale, the picker's own SMS receipt as an independent check, and the dispute process when something
        looks wrong.
      </p>
    ),
  },
  {
    heading: "References",
    body: (
      <ul className="list-inside list-disc space-y-1 text-ink-600">
        <li>
          Republic of Kenya. (2024). <em>Sustainable Waste Management (Extended Producer Responsibility) Regulations, 2024.</em>{" "}
          Nairobi: National Environment Management Authority.
        </li>
        <li>
          United Nations. (2015). <em>Sustainable Development Goal 12: Ensure sustainable consumption and production patterns.</em>
        </li>
      </ul>
    ),
  },
];

export default function HowItWorksPage() {
  useDocumentTitle("How it works");

  return (
    <div className="mx-auto max-w-[800px] px-4 py-16 sm:px-6">
      <Pill>How it works</Pill>
      <h1 className="mt-4 text-4xl font-medium text-ink-900">From a weigh-in to a verified receipt.</h1>
      <div className="mt-12 flex flex-col gap-12">
        {SECTIONS.map((section) => (
          <section key={section.heading}>
            <h2 className="text-xl font-semibold text-ink-900">{section.heading}</h2>
            <div className="mt-3 max-w-prose text-base leading-relaxed text-ink-600">{section.body}</div>
          </section>
        ))}
      </div>
    </div>
  );
}
