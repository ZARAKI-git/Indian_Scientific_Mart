import Link from "next/link";
import { HomeEngine } from "@/components/home/HomeEngine";
import { HeroWindows } from "@/components/home/HeroWindows";
import { OrderingSteps } from "@/components/home/OrderingSteps";
import { ServeTabs } from "@/components/home/ServeTabs";
import { StockExplorer } from "@/components/home/StockExplorer";
import { SupplyCats } from "@/components/home/SupplyCats";
import { Footer } from "@/components/layout/Footer";
import { ContactAside } from "@/components/quote/ContactAside";
import { QuoteForm } from "@/components/quote/QuoteForm";
import { Arrow, ListIcon } from "@/components/ui/icons";
import { unsplash, unsplashSet } from "@/lib/images";

/**
 * Home: the seven scenes of the approved reference, unchanged, driven by the
 * fullpage scene engine (home only). The Quote scene now submits for real and
 * links into the catalogue / quote list.
 */
export default function Home() {
  return (
    <>
      <main id="main">
        {/* ================= 01 HERO ================= */}
        <section className="scene hero" id="top" data-label="Home">
          <div className="sky-bg" /><div className="grid-bg" />
          <div className="spot" id="spot" aria-hidden="true" />
          <div className="frame">
            <div className="wrap">
              <div className="hero-copy">
                <p className="pill" data-a><b>Since 2013</b> Wholesale lab supplier · Cuttack, Odisha</p>
                <h1 data-split>Lab glassware &amp; equipment, <span className="grad-text">stocked for every bench.</span></h1>
                <p className="lede" data-a>Glassware, volumetric ware, plastic labware and bench instruments, held in stock and supplied to schools, colleges, research institutes and hospital laboratories across Odisha.</p>
                <div className="hero-cta" data-a>
                  <Link href="/quote" className="btn btn-primary">Request a quote <Arrow /></Link>
                  <a href="#supply" className="btn btn-ghost">See what we stock</a>
                </div>
                <div className="facts" data-a>
                  <div><b>2013</b><span>Established</span></div>
                  <div><b>11–25</b><span>People on the team</span></div>
                  <div><b>2017</b><span>GST registered</span></div>
                  <div><b>6</b><span>Stock categories</span></div>
                </div>
              </div>
              <div className="hero-visual" data-a>
                <HeroWindows />
                <div className="windows-badge">
                  <i><ListIcon size={20} /></i>
                  <span><b>Send a list, get a price</b><small>Typed or a photo of a handwritten indent.</small></span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= 02 SUPPLY ================= */}
        <section className="scene alt" id="supply" data-label="Supply">
          <div className="frame"><div className="wrap">
            <div className="shead">
              <div><span className="tag" data-a>What we supply</span><h2 data-split>Six categories. One simple way to order.</h2></div>
              <p className="lede" data-a>Pick a category to start a quote. Everything is priced against what is actually on the shelf, and you are told plainly what is not.</p>
            </div>
            <SupplyCats />
          </div></div>
        </section>

        {/* ================= 03 STOCK EXPLORER ================= */}
        <section className="scene" id="stock" data-label="Stock">
          <div className="sky-bg" />
          <div className="frame"><div className="wrap">
            <StockExplorer />
          </div></div>
        </section>

        {/* ================= 04 WHO WE SERVE ================= */}
        <section className="scene deep" id="serve" data-label="Who we serve" data-dark>
          <div className="deep-glow" />
          <div className="frame"><div className="wrap">
            <div className="shead">
              <div><span className="tag" data-a>Who we serve</span><h2 data-split>Four kinds of bench.</h2></div>
              <p className="lede" data-a>A single carton of test tubes is quoted the same way as a departmental indent. Small orders are normal orders here.</p>
            </div>
            <ServeTabs />
          </div></div>
        </section>

        {/* ================= 05 ORDERING ================= */}
        <section className="scene alt" id="ordering" data-label="Ordering">
          <div className="grid-bg" />
          <div className="frame"><div className="wrap">
            <div className="shead">
              <div><span className="tag" data-a>How ordering works</span><h2 data-split>Four steps, no procurement theatre.</h2></div>
              <p className="lede" data-a>You are buying from a small team, so the process is short and someone answers the phone.</p>
            </div>
            <OrderingSteps />
            <div className="ordering-note" data-a>
              <a href="#quote" className="btn btn-primary">Start with step 01 <Arrow /></a>
              <span>No account or minimum order needed. Or <Link href="/catalogue" style={{ color: "var(--brand-dk)", fontWeight: 600 }}>browse the catalogue</Link> and build a list.</span>
            </div>
          </div></div>
        </section>

        {/* ================= 06 ABOUT ================= */}
        <section className="scene" id="about" data-label="About">
          <div className="sky-bg" />
          <div className="frame"><div className="wrap">
            <div className="about">
              <div>
                <span className="tag" data-a>About</span>
                <h2 data-split>A supplier, and honest about being one.</h2>
                <p data-a>Indian Scientific Mart has supplied laboratory glassware, plastic labware and equipment from Cuttack, Odisha since 2013, as a wholesaler, distributor and trading company. Not a manufacturer, and not a turnkey laboratory builder.</p>
                <p data-a>That distinction matters when you are buying. What we hold is everyday working stock. What comes with it is a quick, plain quote from a team you can reach directly.</p>
                <dl className="dl" data-a>
                  <div><dt>Established</dt><dd>2013</dd></div>
                  <div><dt>Legal status</dt><dd>Proprietorship</dd></div>
                  <div><dt>Team</dt><dd>11–25 people</dd></div>
                  <div><dt>Proprietor</dt><dd>Manabhanjan Swain</dd></div>
                </dl>
              </div>
              <div className="about-img" data-a>
                <span className="ring" aria-hidden="true" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={unsplash("1766297247072-93fd815afef3", 1100, 72)} srcSet={unsplashSet("1766297247072-93fd815afef3", [560, 820, 1100], 72)}
                  sizes="(max-width:980px) 92vw, 44vw" alt="Laboratory shelves stocked with glassware and equipment" loading="lazy" decoding="async" />
                <div className="stamp"><div><b>13+</b><small>years in<br />supply</small></div></div>
              </div>
            </div>
          </div></div>
        </section>

        {/* ================= 07 QUOTE ================= */}
        <section className="scene alt" id="quote" data-label="Request a quote">
          <div className="frame"><div className="wrap scroller" id="quoteScroller">
            <div className="quote-grid">
              <QuoteForm variant="scene" />
              <ContactAside />
            </div>
            <Footer bare />
          </div></div>
        </section>
      </main>
      <HomeEngine />
    </>
  );
}
