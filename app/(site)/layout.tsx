import { Footer } from "@/components/layout/Footer";

/** Natural-scroll pages: same header, reference footer underneath. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main id="main" className="page">{children}</main>
      <Footer />
    </>
  );
}
