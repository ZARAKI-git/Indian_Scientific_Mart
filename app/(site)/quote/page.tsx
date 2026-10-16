import type { Metadata } from "next";
import { Reveal } from "@/components/motion/Reveal";
import { QuotePageBody } from "@/components/quote/QuotePageBody";
import { PageHero } from "@/components/ui/PageHero";

export const metadata: Metadata = {
  title: "Request a quote",
  description: "Send your list to Indian Scientific Mart, Cuttack. No account or minimum order; the office replies with a price against current stock.",
  alternates: { canonical: "/quote" },
};

export default function QuotePage() {
  return (
    <>
      <PageHero tag="Request a quote" crumbs={[{ href: "/", label: "Home" }, { label: "Request a quote" }]}
        title={<>Send your list, <span className="grad-text">get a price.</span></>}
        lede="Review the items you added, adjust quantities, and send. No payment here: the office replies with a quotation priced against current stock and quantity." />
      <Reveal as="section" className="section alt">
        <div className="wrap"><QuotePageBody /></div>
      </Reveal>
    </>
  );
}
