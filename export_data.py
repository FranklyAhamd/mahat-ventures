# -*- coding: utf-8 -*-
"""Export data.py to JSON for the web pricelist."""

import json
import re
from pathlib import Path

import data

OUT = Path(__file__).resolve().parent / "pricelist" / "data" / "catalog.json"


def slug(text: str) -> str:
    s = text.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-") or "section"


def flatten_catalog():
    categories = []
    for page in data.PAGES:
        for col in page:
            for section in col:
                categories.append({
                    "id": slug(section["header"]),
                    "name": section["header"],
                    "items": [
                        {"title": title, "price": price or ""}
                        for title, price in section["rows"]
                    ],
                })
    return categories


def main():
    payload = {
        "brand": data.BRAND,
        "edition": data.EDITION,
        "phones": data.PHONES,
        "categories": flatten_catalog(),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Exported {len(payload['categories'])} categories to {OUT}")


if __name__ == "__main__":
    main()
