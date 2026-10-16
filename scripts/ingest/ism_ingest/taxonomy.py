"""Unified cross-brand category taxonomy and the rules that map products into it.

Each brand has a default category plus ordered keyword rules (first match wins),
matched against the product name and the nearest source heading. Adding a brand
means adding one BRAND_RULES entry; nothing else changes.
"""
from __future__ import annotations

import re

CATEGORIES: list[tuple[str, str]] = [
    ("chemicals", "Laboratory Chemicals & Reagents"),
    ("life-science", "Life Science & Biochemicals"),
    ("microbiology", "Culture Media & Microbiology"),
    ("glassware", "Laboratory Glassware"),
    ("plasticware", "Plasticware & Consumables"),
    ("filtration", "Filtration"),
    ("analytical-instruments", "Analytical Instruments"),
    ("balances", "Balances & Weighing"),
    ("lab-equipment", "General Lab Equipment"),
    ("thermometers", "Thermometers & Hydrometers"),
    ("education", "Physics & Teaching Apparatus"),
    ("water-testing", "Water Testing"),
    ("general", "Other Lab Supplies"),
]
CATEGORY_SLUGS = {s for s, _ in CATEGORIES}

Rule = tuple[str, str]  # (regex, category_slug)

# Shared rules, tried after a brand's own rules.
COMMON_RULES: list[Rule] = [
    (r"\bbalance|weighing|weight box|analytical balance", "balances"),
    (r"thermometer|hydrometer|lactometer|butyrometer|alcoholometer|hygrometer", "thermometers"),
    (r"filter paper|syringe filter|membrane|filtration|filter holder|\bfilters?\b", "filtration"),
    (r"test kit|water test|turbidity|chlorine|hardness", "water-testing"),
    (r"spectrophotometer|ph meter|\bph\b.*meter|conductivity|refractometer|colorimeter|"
     r"flame photometer|titrator|polarimeter|turbidimeter|tds meter|viscometer|"
     r"melting point|electrode|nephelometer|ftir|chromatograph", "analytical-instruments"),
    (r"stirrer|centrifuge|oven|incubator|water bath|hot plate|shaker|homogeni[sz]er|"
     r"vortex|autoclave|furnace|distillation unit|laminar|fume hood|vacuum pump|"
     r"mantle|rotary evaporator|desiccator cabinet|refrigerator|freezer|microscope|sonicator", "lab-equipment"),
    (r"galvanometer|ammeter|voltmeter|rheostat|\bmagnet|trainer\b|\bprism|"
     r"\blens\b|pendulum|tuning fork|\bglobe\b|\bchart\b", "education"),
    (r"\bmedia\b|agar|broth|culture|antibiotic disc|petri", "microbiology"),
    (r"antibod|enzyme|\bpcr\b|mastermix|\bbuffer|\bdna\b|\brna\b|protein|primer|polymerase|elisa", "life-science"),
    (r"\b(pp|hdpe|ldpe|pmp|ptfe|polypropylene|polycarbonate|plastic)\b|tips?\b|"
     r"cryo|microcentrifuge tube|centrifuge tube|wash bottle", "plasticware"),
    (r"beaker|flask|pipette|burette|cylinder|funnel|condenser|desiccator|test tube|"
     r"bottle|petri dish|glass|adapter|stopcock|column|joint|watch glass|retort", "glassware"),
]

BRAND_RULES: dict[str, tuple[str, list[Rule]]] = {
    # brand slug: (default category, brand-specific rules)
    "nice-chemicals": ("chemicals", []),
    "nice-glassware": ("glassware", []),
    "merck": ("chemicals", [(r"anti-|antibod|clone|zoomab|kit\b|enzyme", "life-science"),
                            (r"millex|filter|membrane|steritop|stericup", "filtration"),
                            (r"agar|broth|medium|granucult|chromocult", "microbiology")]),
    "thermofisher": ("chemicals", []),
    "loba-chemie": ("chemicals", [(r"\bmedia\b|agar|broth", "microbiology")]),
    "srl": ("chemicals", [(r"agar|broth|medium|media|disc", "microbiology"),
                          (r"enzyme|antibod|dna|protein|amino acid|bioreagent", "life-science")]),
    "himedia": ("microbiology", [(r"Laboratory Chemicals|Chemicals$|Biochemicals|Analytical Reagents", "chemicals"),
                                 (r"filter|membrane", "filtration"),
                                 (r"plasticware|tube|tips|petri plate", "plasticware"),
                                 (r"cell culture|serum|dna|rna|pcr|enzyme|antibod", "life-science")]),
    "cytiva-whatman": ("filtration", []),
    "tarsons": ("plasticware", [(r"pump|centrifuge|shaker|vortex|spinwin|incubator|bath|stirrer", "lab-equipment"),
                                (r"filter", "filtration")]),
    "polylab": ("plasticware", []),
    "borosil": ("glassware", [(r"\bmodel\b|instrument|unit|meter", "lab-equipment")]),
    "jsgw": ("glassware", []),
    "jgw": ("glassware", [(r"lactometer|butyrometer|hydrometer|thermometer", "thermometers")]),
    "omsons": ("glassware", []),
    "riviera": ("glassware", []),
    "jrm": ("thermometers", []),
    "remi": ("lab-equipment", []),
    "labtronics": ("analytical-instruments", []),
    "dp-labman": ("lab-equipment", []),
    "dp-wensar": ("balances", []),
    "haxane": ("analytical-instruments", []),
    "rakiro-aquasol": ("water-testing", []),
    "dxbidt": ("life-science", []),
    "om-lab": ("education", []),
    "adarsh": ("education", []),
    "ses": ("education", []),
    "unconfirmed-physics": ("education", []),
    "ambassador-bp": ("education", []),
    "ambey-labs": ("education", []),
}

# Which shared keyword rules may override a brand's default. A glassware maker's
# "PP screw cap" bottle is still glassware; an instrument maker's rotor is not glassware.
OVERRIDABLE: dict[str, set[str]] = {
    "glassware": {"thermometers", "filtration", "lab-equipment", "analytical-instruments", "balances"},
    "plasticware": {"lab-equipment", "filtration", "glassware"},
    "lab-equipment": {"balances", "analytical-instruments", "thermometers", "filtration"},
    "analytical-instruments": {"balances", "lab-equipment", "water-testing", "thermometers"},
    "balances": set(),
    "education": {"thermometers", "lab-equipment", "glassware", "balances", "analytical-instruments"},
    "filtration": set(),
    "general": set(c for c, _ in CATEGORIES),
}

_compiled: dict[str, list[tuple[re.Pattern[str], str]]] = {}


def categorise(brand_slug: str, name: str, section: str | None) -> str:
    default, rules = BRAND_RULES.get(brand_slug, ("general", []))
    key = brand_slug
    if key not in _compiled:
        _compiled[key] = [(re.compile(p, re.I), c) for p, c in rules + COMMON_RULES]
    hay_primary = f"{section or ''} {name}"
    for rx, cat in _compiled[key][: len(rules)]:
        if rx.search(hay_primary):
            return cat
    # Brands whose whole list is one category should not be re-sorted by loose common keywords.
    if default in ("chemicals", "microbiology", "life-science", "thermometers", "water-testing"):
        return default
    allowed = OVERRIDABLE.get(default, set())
    for rx, cat in _compiled[key][len(rules):]:
        if cat in allowed and rx.search(hay_primary):
            return cat
    return default
