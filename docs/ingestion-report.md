# Ingestion report

Products written: **103,431** (live-eligible 100,398, held for review 3,033)

| Brand | Tier | Kept | Flagged | Skipped | Dup codes | Top skip reasons |
|---|---|---:|---:|---:|---:|---|
| NICE Chemicals | A | 1,833 | 20 | 0 | 1 | — |
| Cytiva / Whatman | A | 2,151 | 0 | 1,824 | 6 | already in primary file (1824) |
| Merck | B | 35,194 | 131 | 169 | 2,252 | empty name (143), price not readable (26) |
| Thermo Fisher Scientific | B | 3,922 | 5 | 49 | 0 | price not readable (43), empty name (6) |
| LOBA Chemie | B | 8,473 | 16 | 0 | 0 | — |
| SRL (Sisco Research Laboratories) | B | 13,230 | 34 | 0 | 30 | — |
| HiMedia Laboratories | B | 18,186 | 2,030 | 560 | 4,761 | price not readable (559), SKU before any product title (1) |
| Tarsons | B | 1,582 | 40 | 0 | 0 | — |
| PolyLab | B | 529 | 0 | 0 | 0 | — |
| Borosil | B | 2,534 | 12 | 313 | 213 | table has no price column (spec table) (231), coded row outside any priced table (68), no price in the price column (14) |
| JSGW | B | 3,515 | 128 | 192 | 3 | table has no price column (spec table) (138), coded row outside any priced table (38), no price in the price column (16) |
| JGW | B | 199 | 0 | 0 | 1 | — |
| OMSONS | B | 5,075 | 121 | 303 | 187 | table has no price column (spec table) (147), no price in the price column (147), coded row outside any priced table (9) |
| Riviera | B | 1,134 | 41 | 9 | 26 | table has no price column (spec table) (6), coded row outside any priced table (3) |
| NICE Glassware | B | 1,189 | 0 | 1 | 0 | no price in the price column (1) |
| JRM Thermometers | B | 325 | 0 | 0 | 0 | — |
| REMI | B | 179 | 0 | 0 | 2 | — |
| Labtronics | B | 154 | 0 | 0 | 0 | — |
| DP Labman | B | 203 | 0 | 0 | 0 | — |
| DP Wensar | B | 91 | 0 | 0 | 0 | — |
| Haxane India | B | 192 | 5 | 0 | 5 | — |
| Rakiro / Aquasol | B | 236 | 0 | 0 | 0 | — |
| DXBIDT (Ultimate 30) | B | 95 | 0 | 20 | 0 | DXBIDT block missing code or price (20) |
| OM Lab Products | B | 1,288 | 4 | 2 | 4 | no price (1), empty name (1) |
| Adarsh | B | 1,369 | 3 | 0 | 0 | — |
| SES Instruments | B | 110 | 0 | 0 | 2 | — |
| (Unconfirmed brand) | B | 118 | 118 | 0 | 0 | — |
| Ambassador / BP Industries | C | 20 | 20 | 0 | 1 | — |
| Ambey Labs | C | 305 | 305 | 0 | 3 | — |

## Files

- **NICE Chemicals** — `CHEMICAL PRICELIST 2026-27.xlsx`: parsed, 1833 rows
- **NICE Chemicals** — `CHEMICAL PRICELIST 2026-27- NICE.xls`: not parsed — content covered by CHEMICAL PRICELIST 2026-27.xlsx
- **NICE Chemicals** — `CHEMICAL PRICELIST FY-2026-27- NICE.pdf`: not parsed — content covered by CHEMICAL PRICELIST 2026-27.xlsx
- **Cytiva / Whatman** — `WHATMAN Cytiva_LF_2026_PL.xlsx`: parsed, 1997 rows
- **Cytiva / Whatman** — `Cytiva_LabFiltration_Price List 2026.pdf`: parsed, 1984 rows
- **Merck** — `Merck_Price_List_Oct_2026.pdf`: parsed, 37588 rows
- **Thermo Fisher Scientific** — `ThermoFisher Price List 2026-27.pdf`: parsed, 3928 rows
- **LOBA Chemie** — `LOBA 2026.27.pdf`: parsed, 8473 rows
- **SRL (Sisco Research Laboratories)** — `SRL_e-Catalogue_2026-27.pdf`: parsed, 13231 rows
- **HiMedia Laboratories** — `HIMEDIA PRICELIST 2026-27.pdf`: parsed, 22581 rows
- **Tarsons** — `TARSONS_Domestic_Price_List_2026-27 - Apr'26.pdf`: parsed, 1582 rows
- **PolyLab** — `Polylab Price List 2026 (Effective from 01.04.2026).pdf`: parsed, 529 rows
- **Borosil** — `Borosil Price List_2026-27.pdf`: parsed, 2735 rows
- **JSGW** — `JSGW Price List 2026-27.pdf`: parsed, 3515 rows
- **JGW** — `JGW - Price List w.e.f. 01.04.2026-D.pdf`: parsed, 200 rows
- **OMSONS** — `OMSONS 2026-27.pdf`: parsed, 5200 rows
- **Riviera** — `Riviera Price List.pdf`: parsed, 1160 rows
- **NICE Glassware** — `NICE GLASSWARE PRICE LIST 2025-26.pdf`: parsed, 1189 rows
- **JRM Thermometers** — `JRM THERMOMETER 2026.pdf`: parsed, 325 rows
- **REMI** — `REMI 2026-2027.pdf`: parsed, 181 rows
- **REMI** — `REMI Price List of New Introduction Apr 2026.pdf`: skipped — byte-identical to REMI 2026-2027.pdf
- **Labtronics** — `LABTRONICS Price List 2026.pdf`: parsed, 154 rows
- **DP Labman** — `DP LABMAN 2626-27.pdf`: parsed, 203 rows
- **DP Wensar** — `DP WENSAR 2026-27.pdf`: parsed, 91 rows
- **Haxane India** — `HAXANE INDIA FINAL PRICE LIST24Th MAY 2026_compressed.pdf`: parsed, 192 rows
- **Rakiro / Aquasol** — `1416RBS.pdf`: parsed, 236 rows
- **Rakiro / Aquasol** — `BRALL.pdf`: not parsed — content covered by product brochure with no prices — priced items come from 1416RBS.pdf
- **Rakiro / Aquasol** — `1416DLDIS.pdf`: not parsed — content covered by discount sheet — terms, not products
- **DXBIDT (Ultimate 30)** — `DXBIDT-ULTIMATE30.pdf`: parsed, 95 rows
- **DXBIDT (Ultimate 30)** — `ENZYMES DXBIDT-ULTIMATE30.pdf`: skipped — byte-identical to DXBIDT-ULTIMATE30.pdf
- **OM Lab Products** — `OM LAB PRODUCTS PRICE LIST 2026-27.pdf`: parsed, 1290 rows
- **Adarsh** — `Adarsh List 2019.pdf`: parsed, 1369 rows
- **SES Instruments** — `SES Pricelist GST 2026-27SIPL.pdf`: parsed, 84 rows
- **SES Instruments** — `SES TECHNO Pricelist GST_2026-27 TI.pdf`: parsed, 28 rows
- **(Unconfirmed brand)** — `PRICE LIST 2026-27 PDF.pdf`: parsed, 118 rows
- **Ambassador / BP Industries** — `Ambassadro BP Industries Prize list - 2026.pdf`: parsed, 20 rows
- **Ambey Labs** — `AMBEY LABS NEW COMPLETE CATALOGUE.pdf`: parsed, 308 rows

## Byte-identical uploads

- DXBIDT-ULTIMATE30.pdf == ENZYMES DXBIDT-ULTIMATE30.pdf
- REMI 2026-2027.pdf == REMI Price List of New Introduction Apr 2026.pdf

## Files not claimed by any brand

- none
