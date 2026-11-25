import { useState } from "react";
import { Link } from "react-router";
import { Play, ShieldCheck, Sprout } from "lucide-react";
import { Pill } from "../../components/ui/Pill";
import { LinkButton } from "../../components/ui/LinkButton";
import { Skeleton } from "../../components/ui/Skeleton";
import { Modal } from "../../components/ui/Modal";
import { Seal } from "../../components/brand/Seal";
import { StatBlock } from "../../components/brand/StatBlock";
import { FeatureRow } from "../../components/brand/FeatureRow";
import { AvatarStack } from "../../components/brand/AvatarStack";
import { MaterialRow } from "../../components/brand/MaterialRow";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { usePublicMaterials, usePublicPartners, usePublicStats } from "../../hooks/usePublicStats";
import { formatKg } from "../../lib/format";

const HOW_IT_WORKS = [
  {
    icon: Sprout,
    title: "Weigh and record.",
    description:
      "The buying centre weighs the plastic, photographs the scale and saves the weigh-in. The picker gets an SMS receipt straight away.",
  },
  {
    icon: ShieldCheck,
    title: "Fingerprint on the blockchain.",
    description:
      "A unique fingerprint of the record is stored on a public blockchain. If anyone edits the record later, the fingerprint stops matching.",
  },
  {
    icon: ShieldCheck,
    title: "Claim once, verify forever.",
    description: "A brand claims the recycling credit for its EPR report. The blockchain refuses any second claim, and anyone can check the receipt.",
  },
];

export default function HomePage() {
  useDocumentTitle("Home");
  const stats = usePublicStats();
  const materials = usePublicMaterials();
  const partners = usePublicPartners();
  const [videoOpen, setVideoOpen] = useState(false);

  const anchoredRatio =
    stats.data && stats.data.receiptsRecorded > 0 ? stats.data.receiptsAnchored / stats.data.receiptsRecorded : undefined;
  const claimedRatio =
    stats.data && stats.data.receiptsAnchored > 0 ? stats.data.receiptsClaimed / stats.data.receiptsAnchored : undefined;

  return (
    <div>
      {/* Hero */}
      <section className="bg-forest-700 px-4 pb-16 pt-4 text-white sm:px-6">
        <div className="mx-auto grid max-w-[1200px] gap-8 md:grid-cols-2 md:items-center">
          <h1 className="text-4xl font-medium leading-tight sm:text-5xl">Every kilogram, on the record.</h1>
          <div>
            <p className="text-base text-white/85">
              Weigh-ins recorded at the scale, fingerprinted on a blockchain, claimed once.
            </p>
            <LinkButton to="/verify" className="mt-6">
              Verify a receipt
            </LinkButton>
          </div>
        </div>
        <div className="relative mx-auto mt-12 max-w-[1200px]">
          <div className="aspect-[16/7] w-full overflow-hidden rounded-card bg-forest-800 sm:rounded-panel" role="img" aria-label="Buying centre weighing sorted plastic bales">
            <div className="flex size-full items-center justify-center text-white/40">
              <ShieldCheck className="size-16" aria-hidden="true" />
            </div>
          </div>
          <div className="absolute -left-3 -top-8 sm:-left-6 sm:-top-10">
            <Seal spin size={88} className="sm:hidden" />
            <Seal spin size={120} className="hidden sm:block" />
          </div>
        </div>
      </section>

      {/* Why it matters */}
      <section className="px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto grid max-w-[1200px] gap-10 md:grid-cols-2">
          <div>
            <Pill>Why it matters</Pill>
            <h2 className="mt-4 text-3xl font-medium text-ink-900 sm:text-4xl">
              When every weigh-in is on the record, nobody gets short-changed.
            </h2>
            <p className="mt-4 max-w-prose text-base text-ink-600">
              Kenya&apos;s Sustainable Waste Management (Extended Producer Responsibility) Regulations, 2024 require
              producers to prove how much packaging they recover. TakaTrace gives pickers, buying centres, brands and
              regulators one record that none of them can quietly change.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8">
            {stats.isLoading ? (
              <>
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </>
            ) : stats.data ? (
              <>
                <StatBlock
                  icon={ShieldCheck}
                  value={formatKg(stats.data.kgAnchored)}
                  caption="recovered and verified"
                  ratio={anchoredRatio}
                  ratioLabel={anchoredRatio !== undefined ? `${Math.round(anchoredRatio * 100)}% of recorded weigh-ins are anchored` : undefined}
                />
                <StatBlock
                  icon={ShieldCheck}
                  value={stats.data.doubleClaims}
                  caption="credits counted twice"
                  ratio={claimedRatio}
                  ratioLabel={claimedRatio !== undefined ? `${Math.round(claimedRatio * 100)}% claimed once` : undefined}
                />
              </>
            ) : (
              <>
                <StatBlock icon={ShieldCheck} value={"—"} caption="Live figures unavailable" />
                <StatBlock icon={ShieldCheck} value={"—"} caption="Live figures unavailable" />
              </>
            )}
          </div>
        </div>

        <div className="mx-auto mt-16 max-w-[1200px]">
          {partners.data && partners.data.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 border-t border-line-200 pt-10">
              {partners.data.map((partner) => (
                <span key={partner.name} className="text-sm font-medium text-ink-600">
                  {partner.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-cream-100 px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-[1200px]">
          <Pill>How it works</Pill>
          <h2 className="mt-4 max-w-xl text-3xl font-medium text-ink-900 sm:text-4xl">
            Three steps from the scale to the report.
          </h2>
          <div className="mt-10 grid gap-10 md:grid-cols-2">
            <div>
              <button
                type="button"
                onClick={() => setVideoOpen(true)}
                className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-card bg-forest-700/90"
              >
                <span className="flex size-14 items-center justify-center rounded-full bg-paper text-forest-700">
                  <Play className="size-6 fill-current" aria-hidden="true" />
                </span>
                <span className="sr-only">Play the TakaTrace demo video</span>
              </button>
            </div>
            <div className="flex flex-col gap-6">
              {HOW_IT_WORKS.map((item, index) => (
                <FeatureRow key={item.title} {...item} withDivider={index < HOW_IT_WORKS.length - 1} />
              ))}
              <AvatarStack
                initials={["J", "M", "A"]}
                count={stats.data?.pickersPaidThisMonth ?? 0}
                label="pickers paid this month"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Materials */}
      <section className="px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-[1200px]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Pill>Materials we track</Pill>
              <h2 className="mt-4 text-3xl font-medium text-ink-900 sm:text-4xl">Every material, every centre, one shared record.</h2>
            </div>
            <LinkButton to="/verify" variant="secondary">
              Verify a receipt
            </LinkButton>
          </div>
          <div className="mt-10">
            {materials.isLoading ? (
              <div className="flex flex-col gap-4">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : materials.data && materials.data.length > 0 ? (
              materials.data.map((material, index) => (
                <MaterialRow
                  key={material.material}
                  title={material.label}
                  meta={`${formatKg(material.kgAnchored)} · ${material.centres} centres`}
                  to="/transparency"
                  withDivider={index < materials.data.length - 1}
                />
              ))
            ) : (
              <p className="text-sm text-ink-600">Live figures unavailable.</p>
            )}
          </div>
        </div>
      </section>

      <Modal isOpen={videoOpen} onClose={() => setVideoOpen(false)} title="How TakaTrace works">
        <video controls autoPlay className="w-full rounded-input" onError={(event) => event.currentTarget.closest("div")?.classList.add("hidden")}>
          <source src="/video/demo.mp4" type="video/mp4" />
        </video>
        <p className="mt-3 text-sm text-ink-600">
          If the video doesn&apos;t play, watch the walkthrough on the{" "}
          <Link to="/how-it-works" className="underline" onClick={() => setVideoOpen(false)}>
            How it works
          </Link>{" "}
          page instead.
        </p>
      </Modal>
    </div>
  );
}
