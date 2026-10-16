"""Source manifest: which files belong to which brand, how to parse them, and
what each list says about its own prices. One entry per brand."""
from __future__ import annotations

from dataclasses import dataclass, field

from .model import PriceBasis


@dataclass(frozen=True)
class SourceFile:
    filename: str
    parser: str
    # Files whose content is already covered by another file (not byte-identical,
    # so hashing can't catch them). Recorded in the report, never parsed.
    superseded_by: str | None = None
    # A supplement only contributes codes the brand's earlier files did not have;
    # it never overrides or collides with them.
    supplement: bool = False


@dataclass(frozen=True)
class Brand:
    slug: str
    name: str
    tier: str                       # "A" spreadsheet, "B" text PDF, "C" scanned/OCR
    files: tuple[SourceFile, ...]
    price_basis: PriceBasis = "unknown"
    basis_evidence: str | None = None
    price_as_of: str | None = None  # ISO date the list took effect, when the list states it
    country: str | None = "India"
    active: bool = True             # False keeps the brand out of the public catalogue
    note: str | None = None


B = Brand
F = SourceFile

BRANDS: list[Brand] = [
    B("nice-chemicals", "NICE Chemicals", "A",
      (F("CHEMICAL PRICELIST 2026-27.xlsx", "nice-chemicals-xlsx"),
       F("CHEMICAL PRICELIST 2026-27- NICE.xls", "-", superseded_by="CHEMICAL PRICELIST 2026-27.xlsx"),
       F("CHEMICAL PRICELIST FY-2026-27- NICE.pdf", "-", superseded_by="CHEMICAL PRICELIST 2026-27.xlsx")),
      price_as_of="2026-04-01"),
    B("cytiva-whatman", "Cytiva / Whatman", "A",
      (F("WHATMAN Cytiva_LF_2026_PL.xlsx", "whatman-xlsx"),
       F("Cytiva_LabFiltration_Price List 2026.pdf", "cytiva-pdf", supplement=True)),
      price_basis="excl_gst", basis_evidence="Cytiva PDF p1: 'Prices mentioned are excluding GST'",
      price_as_of="2026-01-01", country="USA / India"),
    B("merck", "Merck", "B", (F("Merck_Price_List_Oct_2026.pdf", "merck"),), price_as_of="2026-10-01", country="Germany / India"),
    B("thermofisher", "Thermo Fisher Scientific", "B", (F("ThermoFisher Price List 2026-27.pdf", "thermofisher"),),
      price_as_of="2026-04-01", country="USA / India"),
    B("loba-chemie", "LOBA Chemie", "B", (F("LOBA 2026.27.pdf", "loba"),), price_as_of="2026-04-01"),
    B("srl", "SRL (Sisco Research Laboratories)", "B", (F("SRL_e-Catalogue_2026-27.pdf", "srl"),),
      price_basis="excl_gst", basis_evidence="SRL p248: 'unit prices exclusive of GST taxes & any levies'",
      price_as_of="2026-04-01"),
    B("himedia", "HiMedia Laboratories", "B", (F("HIMEDIA PRICELIST 2026-27.pdf", "himedia"),), price_as_of="2026-04-01"),
    B("tarsons", "Tarsons", "B", (F("TARSONS_Domestic_Price_List_2026-27 - Apr'26.pdf", "tarsons"),), price_as_of="2026-04-01"),
    B("polylab", "PolyLab", "B", (F("Polylab Price List 2026 (Effective from 01.04.2026).pdf", "polylab"),),
      price_basis="excl_gst", basis_evidence="Polylab p11: 'G.S.T will be charged extra'", price_as_of="2026-04-01"),
    B("borosil", "Borosil", "B", (F("Borosil Price List_2026-27.pdf", "borosil"),), price_as_of="2026-04-01",
      price_basis="excl_gst", basis_evidence="Borosil page footer: 'PRICES EXCLUSIVE OF TAXES'"),
    B("jsgw", "JSGW", "B", (F("JSGW Price List 2026-27.pdf", "jsgw"),), price_as_of="2026-04-01"),
    B("jgw", "JGW", "B", (F("JGW - Price List w.e.f. 01.04.2026-D.pdf", "jgw"),),
      price_basis="excl_gst", basis_evidence="JGW p7: 'GST Extra as applicable'", price_as_of="2026-04-01"),
    B("omsons", "OMSONS", "B", (F("OMSONS 2026-27.pdf", "omsons"),),
      price_basis="excl_gst", basis_evidence="OMSONS p452: 'Prices are Exclusive of Taxes'", price_as_of="2026-04-01"),
    B("riviera", "Riviera", "B", (F("Riviera Price List.pdf", "riviera"),),
      price_basis="excl_gst", basis_evidence="Riviera p3: 'GST Extra as applicable'"),
    B("nice-glassware", "NICE Glassware", "B", (F("NICE GLASSWARE PRICE LIST 2025-26.pdf", "nice-glassware"),),
      price_basis="excl_gst", basis_evidence="NICE glassware p5: 'Taxes and duties ... will be charged'",
      price_as_of="2025-04-01", note="2025-26 list — prices may be stale"),
    B("jrm", "JRM Thermometers", "B", (F("JRM THERMOMETER 2026.pdf", "jrm"),), price_as_of="2026-01-01"),
    B("remi", "REMI", "B",
      (F("REMI 2026-2027.pdf", "remi"), F("REMI Price List of New Introduction Apr 2026.pdf", "remi")),
      price_basis="excl_gst", basis_evidence="REMI p16: 'G.S.T @ 18% charged extra'", price_as_of="2026-04-01"),
    B("labtronics", "Labtronics", "B", (F("LABTRONICS Price List 2026.pdf", "labtronics"),),
      price_basis="excl_gst", basis_evidence="Labtronics p52: 'Taxes will be charged extra'", price_as_of="2026-01-01"),
    B("dp-labman", "DP Labman", "B", (F("DP LABMAN 2626-27.pdf", "dp"),),
      price_basis="excl_gst", basis_evidence="DP Labman p53: 'GST @ 18% Extra'", price_as_of="2026-04-01"),
    B("dp-wensar", "DP Wensar", "B", (F("DP WENSAR 2026-27.pdf", "dp"),),
      price_basis="excl_gst", basis_evidence="DP Wensar p30: 'GST @ 18% Extra'", price_as_of="2026-04-01"),
    B("haxane", "Haxane India", "B", (F("HAXANE INDIA FINAL PRICE LIST24Th MAY 2026_compressed.pdf", "haxane"),),
      price_as_of="2026-05-20"),
    B("rakiro-aquasol", "Rakiro / Aquasol", "B",
      (F("1416RBS.pdf", "rakiro"), F("BRALL.pdf", "-", superseded_by="product brochure with no prices — priced items come from 1416RBS.pdf"), F("1416DLDIS.pdf", "-", superseded_by="discount sheet — terms, not products")),
      price_as_of="2026-04-01", note="Listed rate is the dealer price (DP); MRP kept in specs"),
    B("dxbidt", "DXBIDT (Ultimate 30)", "B",
      (F("DXBIDT-ULTIMATE30.pdf", "dxbidt"), F("ENZYMES DXBIDT-ULTIMATE30.pdf", "dxbidt")),
      price_basis="excl_gst", basis_evidence="DXBIDT p2: 'GST will be extra'"),
    B("om-lab", "OM Lab Products", "B", (F("OM LAB PRODUCTS PRICE LIST 2026-27.pdf", "om-lab"),),
      price_basis="excl_gst", basis_evidence="OM Lab p50: 'GST ... will be Extra'", price_as_of="2026-04-01"),
    B("adarsh", "Adarsh", "B", (F("Adarsh List 2019.pdf", "adarsh"),), price_as_of="2019-04-01",
      note="2019 list — prices are indicative and likely stale"),
    B("ses", "SES Instruments", "B",
      (F("SES Pricelist GST 2026-27SIPL.pdf", "ses"), F("SES TECHNO Pricelist GST_2026-27 TI.pdf", "ses")),
      price_basis="excl_gst", basis_evidence="SES SIPL p8: 'GST as applicable extra'", price_as_of="2026-04-01"),
    B("unconfirmed-physics", "(Unconfirmed brand)", "B", (F("PRICE LIST 2026-27 PDF.pdf", "physics-meters"),),
      price_as_of="2026-04-01", active=False, note="Physics/electronics list with no maker named — awaiting client"),
    B("ambassador-bp", "Ambassador / BP Industries", "C",
      (F("Ambassadro BP Industries Prize list - 2026.pdf", "ocr-ambassador"),), active=False,
      price_basis="excl_gst", basis_evidence="Ambassador T&C p3: '18% GST will be charged extra'", price_as_of="2026-04-01",
      note="Scanned list — OCR rows held for review"),
    B("ambey-labs", "Ambey Labs", "C", (F("AMBEY LABS NEW COMPLETE CATALOGUE.pdf", "ocr-ambey"),), active=False,
      note="Scanned catalogue — OCR rows held for review"),
]

# Company paperwork in the source folder that is not a price list.
NON_CATALOGUE_FILES = {"ISM GST RC NEW.pdf": "ISM's own GST registration certificate"}
