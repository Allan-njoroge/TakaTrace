import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { config } from "../../config";

export default function AboutPage() {
  useDocumentTitle("About");

  return (
    <div className="mx-auto max-w-[700px] px-4 py-16 sm:px-6">
      <p className="text-xs font-medium tracking-wide text-ink-600">About</p>
      <h1 className="mt-2 text-3xl font-medium text-ink-900">Built for SDG 12.5.</h1>

      <div className="mt-8 flex flex-col gap-8 text-base leading-relaxed text-ink-600">
        <section>
          <h2 className="text-lg font-semibold text-ink-900">SDG 12.5 alignment</h2>
          <p className="mt-2">
            Sustainable Development Goal 12.5 calls for substantially reducing waste generation through prevention,
            reduction, recycling and reuse. TakaTrace gives every weigh-in a tamper-evident record, so the kilograms
            a buying centre buys, a picker is paid for, and a brand claims toward its recovery target are all the
            same number.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-ink-900">Kenya&apos;s EPR context</h2>
          <p className="mt-2">
            Kenya&apos;s Sustainable Waste Management (Extended Producer Responsibility) Regulations, 2024 require
            producers to report how much of the packaging they place on the market is recovered. TakaTrace is built
            to make that reporting verifiable by anyone, not just the brand submitting it.
          </p>
        </section>
        {config.demoMode && (
          <section className="rounded-input bg-amber-100 px-4 py-3 text-sm text-amber-700">
            This is a demonstration environment. The State, counties, organisations, people and figures shown
            throughout this site are fictional, and all data is synthetic.
          </section>
        )}
        <section>
          <h2 className="text-lg font-semibold text-ink-900">References</h2>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>
              Republic of Kenya. (2024). <em>Sustainable Waste Management (Extended Producer Responsibility) Regulations, 2024.</em>
            </li>
            <li>
              United Nations. (2015). <em>Transforming our world: the 2030 Agenda for Sustainable Development.</em>
            </li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-ink-900">Image credits</h2>
          <p className="mt-2">Photography placeholders are used throughout this build; see FRONTEND_PROGRESS.md.</p>
        </section>
      </div>
    </div>
  );
}
