#!/usr/bin/env python3
"""Build this project's public/db JSON files from Resonance BinaryConfig.

The script reads the game's BinaryConfig *.bin files directly, decodes the
factory records, then writes the JSON shape consumed by this Next.js app.

Default behavior includes new IDs from BinaryConfig. Use --existing-only only
when you intentionally want to update records that are already present in
public/db without adding new characters, cards, skills, equipment, or tags.
"""

from __future__ import annotations

import argparse
import datetime as dt
import filecmp
import http.client
import json
import csv
import shutil
import struct
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Iterable


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE_CANDIDATES = [
    Path("G:/Resonance/\u96f7\u7d22\u7eb3\u65af_Data/Patch/BinaryConfig"),
    Path("G:/\u96f7\u7d22\u7eb3\u65afwiki/\u4ee3\u7801/BinaryConfig"),
]
DEFAULT_WIKI_IMAGE_ROOT = Path("G:/\u96f7\u7d22\u7eb3\u65afwiki/\u6587\u4ef6/\u7d20\u6750\u56fe\u7247")
DEFAULT_OUTPUT = PROJECT_ROOT / "public" / "db"
DEFAULT_WIKI_MANIFEST = Path("G:/\u96f7\u7d22\u7eb3\u65afwiki/\u6587\u4ef6/\u56fe\u7247\u4e0a\u4f20\u5ba1\u6838/png_manifest.csv")
DEFAULT_WIKI_URL_CACHE = PROJECT_ROOT / "scripts" / "wiki_image_url_cache.json"
DEFAULT_MISSING_IMAGE_REPORT = PROJECT_ROOT / "scripts" / "missing_wiki_images.json"
WIKI_API_URL = "https://wiki.biligame.com/resonance/api.php"
WIKI_API_BATCH_SIZE = 50
WIKI_API_DELAY_SECONDS = 0.35
WIKI_API_RETRIES = 3
PUBLIC_LANGUAGE_DIRS = ["cn", "en", "jp", "ko", "tw"]

FACTORIES = {
    "BookFactory": "BookFactory.bin",
    "BreakthroughFactory": "BreakthroughFactory.bin",
    "CardFactory": "CardFactory.bin",
    "EquipmentFactory": "EquipmentFactory.bin",
    "HomeSkillFactory": "HomeSkillFactory.bin",
    "SkillFactory": "SkillFactory.bin",
    "TagFactory": "TagFactory.bin",
    "TalentFactory": "TalentFactory.bin",
    "TextFactory": "TextFactory.bin",
    "UnitFactory": "UnitFactory.bin",
    "UnitViewFactory": "UnitViewFactory.bin",
}

GENERATED_FILES = [
    "break_db.json",
    "card_db.json",
    "char_db.json",
    "char_skill_map.json",
    "equip_db.json",
    "home_skill_db.json",
    "img_db.json",
    "item_skill_map.json",
    "lang_cn.json",
    "skill_db.json",
    "tag_db.json",
    "talent_db.json",
    "version_info.json",
]


class BinReader:
    def __init__(self, path: Path):
        self.path = path
        self.f = path.open("rb")

    def close(self) -> None:
        self.f.close()

    def read_byte(self) -> int:
        data = self.f.read(1)
        if len(data) != 1:
            raise EOFError(f"Unexpected EOF in {self.path}")
        return data[0]

    def read_bool(self) -> bool:
        return struct.unpack("?", self.f.read(1))[0]

    def read_int(self) -> int:
        return struct.unpack("i", self.f.read(4))[0]

    def read_long(self) -> int:
        return struct.unpack("q", self.f.read(8))[0]

    def read_double(self) -> float:
        return struct.unpack("d", self.f.read(8))[0]

    def readstr_size(self, size: int = -1) -> tuple[str, int]:
        size = size if size > 0 else self.read_byte()
        if size == 0:
            return "", 0

        add_size = 0
        marker = self.read_byte()
        if marker < 32:
            size += 128 * (marker - 1)
            add_size += 1
        else:
            self.f.seek(-1, 1)

        raw = self.f.read(size)
        return raw.decode("utf-8"), size + add_size

    def readstr(self, size: int = -1) -> str:
        return self.readstr_size(size)[0]

    def read_str_pool(self) -> dict[int, str]:
        pool: dict[int, str] = {}
        size = self.read_int()
        read_size = 0
        while read_size < size:
            pool[read_size], str_len = self.readstr_size()
            read_size += str_len + 1
        return pool

    def read_dynamic(self, value_type: int, str_pool: dict[int, str]) -> Any:
        if value_type in (0, 6):
            return self.read_int()
        if value_type == 1:
            return self.read_double()
        if value_type in (2, 15):
            return self.read_long()
        if value_type == 3:
            return self.read_bool()
        if value_type in (7, 8):
            return self.read_array_info(str_pool)
        if value_type == 99:
            return self.read_property_map(str_pool)
        return str_pool[self.read_int()]

    def read_array_info(self, str_pool: dict[int, str]) -> list[Any]:
        self.read_int()
        value_type = self.read_byte()
        num = self.read_int()
        return [self.read_dynamic(value_type, str_pool) for _ in range(num)]

    def read_meta_section(self) -> dict[str, Any]:
        self.read_int()
        return {
            "author": self.readstr(),
            "date": self.read_long(),
            "etc": self.readstr(),
        }

    def read_ca_index(self, str_pool: dict[int, str]) -> dict[str, Any]:
        size = self.read_int()
        if size != 12:
            raise ValueError(f"Unexpected CA index size {size} in {self.path}")
        return {
            "id": self.read_int(),
            "idCN": str_pool[self.read_int()],
            "index": self.read_int(),
        }

    def read_menu_section(self, str_pool: dict[int, str]) -> dict[int, dict[str, Any]]:
        self.read_int()
        num = self.read_int()
        menu: dict[int, dict[str, Any]] = {}
        for _ in range(num):
            ca = self.read_ca_index(str_pool)
            index = ca.pop("index")
            menu[index] = ca
        return menu

    def read_ca_property(self, str_pool: dict[int, str]) -> tuple[str, Any]:
        self.read_int()
        key = str_pool[self.read_int()]
        value_type = self.read_byte()
        return key, self.read_dynamic(value_type, str_pool)

    def read_property_map(self, str_pool: dict[int, str]) -> dict[str, Any]:
        self.read_int()
        num = self.read_int()
        props: dict[str, Any] = {}
        for _ in range(num):
            key, value = self.read_ca_property(str_pool)
            props[key] = value
        return props

    def read_data_section(self, str_pool: dict[int, str]) -> list[dict[str, Any]]:
        self.read_int()
        num = self.read_int()
        return [self.read_property_map(str_pool) for _ in range(num)]

    def read_single_bin(self, str_pool: dict[int, str]) -> dict[str, Any]:
        self.read_int()
        return {
            "meta": self.read_meta_section(),
            "menu": self.read_menu_section(str_pool),
            "data": self.read_data_section(str_pool),
        }


def decode_bin(path: Path) -> list[dict[str, Any]]:
    reader = BinReader(path)
    try:
        reader.read_byte()
        reader.readstr()
        str_pool = reader.read_str_pool()
        return reader.read_single_bin(str_pool)["data"]
    finally:
        reader.close()


def load_factories(source: Path) -> dict[str, list[dict[str, Any]]]:
    missing = [name for name in FACTORIES.values() if not (source / name).is_file()]
    if missing:
        raise FileNotFoundError(f"Missing BinaryConfig files: {', '.join(missing)}")

    factories: dict[str, list[dict[str, Any]]] = {}
    for factory_name, file_name in FACTORIES.items():
        factories[factory_name] = decode_bin(source / file_name)
    return factories


def detect_default_source() -> Path:
    available = [path for path in DEFAULT_SOURCE_CANDIDATES if (path / "UnitFactory.bin").is_file()]
    if not available:
        candidates = ", ".join(str(path) for path in DEFAULT_SOURCE_CANDIDATES)
        raise FileNotFoundError(f"No default BinaryConfig source found. Checked: {candidates}")
    return max(available, key=lambda path: (path / "UnitFactory.bin").stat().st_mtime)


def load_json(path: Path, default: Any) -> Any:
    if not path.is_file():
        return default
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def dump_json(path: Path, data: Any) -> None:
    with path.open("w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def id_key(row: dict[str, Any]) -> str:
    return str(row["id"])


def keyed(rows: Iterable[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {id_key(row): row for row in sorted(rows, key=lambda item: int(item["id"]))}


def compact(row: dict[str, Any], fields: Iterable[str]) -> dict[str, Any]:
    return {field: row[field] for field in fields if field in row}


def key_ref(prefix: str, entity_id: int, suffix: str | None = None) -> str:
    if suffix:
        return f"{prefix}_{entity_id}_{suffix}"
    return f"{prefix}_{entity_id}"


def add_lang(lang: dict[str, str], key: str, value: Any) -> None:
    if value is None:
        return
    if isinstance(value, str) and value == "":
        return
    lang[key] = str(value)


def id_filter(output_dir: Path, file_name: str, include_new: bool) -> set[int] | None:
    if include_new:
        return None
    current = load_json(output_dir / file_name, {})
    if not isinstance(current, dict) or not current:
        return None
    return {int(key) for key in current.keys() if str(key).isdigit()}


def keep_row(row: dict[str, Any], allowed_ids: set[int] | None) -> bool:
    if allowed_ids is None:
        return not row.get("isInformalData", False)
    return int(row["id"]) in allowed_ids


def book_character_ids(book_rows: list[dict[str, Any]]) -> set[int]:
    for row in book_rows:
        if row.get("id") == 80900001:
            return {int(item["id"]) for item in row.get("unitList", []) if "id" in item}
    return set()


def book_equipment_ids(book_rows: list[dict[str, Any]]) -> set[int]:
    ids: set[int] = set()
    for row in book_rows:
        for item in row.get("equipmentList", []):
            entity_id = item.get("id")
            if isinstance(entity_id, int) and entity_id > 0:
                ids.add(entity_id)
    return ids


def build_lang_cn(f: dict[str, list[dict[str, Any]]], output_dir: Path) -> dict[str, str]:
    lang: dict[str, str] = load_json(output_dir / "lang_cn.json", {})

    for row in f["TextFactory"]:
        add_lang(lang, key_ref("text", int(row["id"])), row.get("text"))

    for row in f["UnitFactory"]:
        entity_id = int(row["id"])
        add_lang(lang, key_ref("char_name", entity_id), row.get("name"))
        add_lang(lang, key_ref("char_identity", entity_id), row.get("identity"))
        add_lang(lang, key_ref("char_ability", entity_id), row.get("ability"))

    for row in f["CardFactory"]:
        add_lang(lang, key_ref("card_name", int(row["id"])), row.get("name"))

    for row in f["SkillFactory"]:
        entity_id = int(row["id"])
        add_lang(lang, key_ref("skill_name", entity_id), row.get("name"))
        add_lang(lang, key_ref("skill_description", entity_id), row.get("description"))
        add_lang(lang, key_ref("skill_detailDescription", entity_id), row.get("detailDescription"))
        add_lang(lang, key_ref("skill_leaderCardConditionDesc", entity_id), row.get("leaderCardConditionDesc"))

    for row in f["BreakthroughFactory"]:
        entity_id = int(row["id"])
        add_lang(lang, key_ref("break_name", entity_id), row.get("name"))
        add_lang(lang, key_ref("break_desc", entity_id), row.get("desc"))

    for row in f["TalentFactory"]:
        entity_id = int(row["id"])
        add_lang(lang, key_ref("talent_name", entity_id), row.get("name"))
        add_lang(lang, key_ref("talent_desc", entity_id), row.get("desc"))

    gallery_equipment_ids = book_equipment_ids(f["BookFactory"])
    for row in f["EquipmentFactory"]:
        if gallery_equipment_ids and int(row["id"]) not in gallery_equipment_ids:
            continue
        entity_id = int(row["id"])
        add_lang(lang, key_ref("equip_name", entity_id), row.get("name"))
        add_lang(lang, key_ref("equip_des", entity_id), row.get("des"))
        for index, getway in enumerate(row.get("Getway", [])):
            add_lang(
                lang,
                key_ref("equip_Getway", entity_id, f"{index}_DisplayName"),
                getway.get("DisplayName"),
            )

    for row in f["HomeSkillFactory"]:
        entity_id = int(row["id"])
        add_lang(lang, key_ref("home_skill_name", entity_id), row.get("name"))
        add_lang(lang, key_ref("home_skill_desc", entity_id), row.get("desc"))

    for row in f["TagFactory"]:
        entity_id = int(row["id"])
        add_lang(lang, key_ref("tag_tagName", entity_id), row.get("tagName"))
        add_lang(lang, key_ref("tag_detail", entity_id), row.get("detail"))

    return dict(sorted(lang.items(), key=lambda item: item[0]))


def transform_characters(f: dict[str, list[dict[str, Any]]], output_dir: Path, include_new: bool) -> dict[str, Any]:
    allowed = id_filter(output_dir, "char_db.json", include_new)
    if allowed is None:
        allowed = book_character_ids(f["BookFactory"])

    fields = [
        "id",
        "quality",
        "sideId",
        "passiveSkillList",
        "skillList",
        "tk_SN",
        "hp_SN",
        "def_SN",
        "atk_SN",
        "atkSpeed_SN",
        "luck_SN",
        "talentList",
        "breakthroughList",
        "line",
        "subLine",
        "controllerId",
        "equipmentSlotList",
        "homeSkillList",
    ]
    rows = []
    for row in f["UnitFactory"]:
        if row.get("mod") != "玩家角色" or not keep_row(row, allowed):
            continue
        entity_id = int(row["id"])
        item = compact(row, fields)
        item["name"] = key_ref("char_name", entity_id)
        item["identity"] = key_ref("char_identity", entity_id)
        item["ability"] = key_ref("char_ability", entity_id)
        rows.append(item)
    return keyed(rows)


def transform_cards(f: dict[str, list[dict[str, Any]]], output_dir: Path, include_new: bool) -> dict[str, Any]:
    allowed = id_filter(output_dir, "card_db.json", include_new)
    fields = ["id", "idCN", "color", "cost_SN", "cardType", "ExCondList", "ExActList", "tagList"]
    rows = []
    for row in f["CardFactory"]:
        if not keep_row(row, allowed):
            continue
        entity_id = int(row["id"])
        item = compact(row, fields)
        item["name"] = key_ref("card_name", entity_id)
        rows.append(item)
    return keyed(rows)


def transform_skills(f: dict[str, list[dict[str, Any]]], output_dir: Path, include_new: bool) -> dict[str, Any]:
    allowed = id_filter(output_dir, "skill_db.json", include_new)
    fields = ["id", "mod", "ExSkillList", "cardID", "desParamList", "skillParamList"]
    rows = []
    for row in f["SkillFactory"]:
        if not keep_row(row, allowed):
            continue
        entity_id = int(row["id"])
        item = compact(row, fields)
        item["name"] = key_ref("skill_name", entity_id)
        item["description"] = key_ref("skill_description", entity_id)
        item["detailDescription"] = key_ref("skill_detailDescription", entity_id)
        item["leaderCardConditionDesc"] = key_ref("skill_leaderCardConditionDesc", entity_id)
        rows.append(item)
    return keyed(rows)


def transform_breakthroughs(f: dict[str, list[dict[str, Any]]], output_dir: Path, include_new: bool) -> dict[str, Any]:
    allowed = id_filter(output_dir, "break_db.json", include_new)
    rows = []
    for row in f["BreakthroughFactory"]:
        if not keep_row(row, allowed):
            continue
        entity_id = int(row["id"])
        rows.append(
            {
                "id": entity_id,
                "name": key_ref("break_name", entity_id),
                "desc": key_ref("break_desc", entity_id),
                "attributeList": row.get("attributeList", []),
            }
        )
    return keyed(rows)


def transform_talents(f: dict[str, list[dict[str, Any]]], output_dir: Path, include_new: bool) -> dict[str, Any]:
    allowed = id_filter(output_dir, "talent_db.json", include_new)
    rows = []
    for row in f["TalentFactory"]:
        if not keep_row(row, allowed):
            continue
        entity_id = int(row["id"])
        rows.append(
            {
                "id": entity_id,
                "name": key_ref("talent_name", entity_id),
                "desc": key_ref("talent_desc", entity_id),
                "awakeLv": row.get("awakeLv", 0),
                "skillParamOffsetList": row.get("skillParamOffsetList") or None,
            }
        )
    return keyed(rows)


def transform_equipment(f: dict[str, list[dict[str, Any]]], output_dir: Path, include_new: bool) -> dict[str, Any]:
    allowed = id_filter(output_dir, "equip_db.json", include_new)
    gallery_equipment_ids = book_equipment_ids(f["BookFactory"])
    rows = []
    for row in f["EquipmentFactory"]:
        if not keep_row(row, allowed):
            continue
        entity_id = int(row["id"])
        if gallery_equipment_ids and entity_id not in gallery_equipment_ids:
            continue
        getways = []
        for index, getway in enumerate(row.get("Getway", [])):
            mapped = dict(getway)
            mapped["DisplayName"] = key_ref("equip_Getway", entity_id, f"{index}_DisplayName")
            getways.append(mapped)
        rows.append(
            {
                "id": entity_id,
                "name": key_ref("equip_name", entity_id),
                "des": key_ref("equip_des", entity_id),
                "equipTagId": row.get("equipTagId"),
                "quality": row.get("quality"),
                "skillList": row.get("skillList", []),
                "Getway": getways,
            }
        )
    return keyed(rows)


def transform_home_skills(f: dict[str, list[dict[str, Any]]], output_dir: Path, include_new: bool) -> dict[str, Any]:
    allowed = id_filter(output_dir, "home_skill_db.json", include_new)
    rows = []
    for row in f["HomeSkillFactory"]:
        if not keep_row(row, allowed):
            continue
        entity_id = int(row["id"])
        rows.append(
            {
                "id": entity_id,
                "name": key_ref("home_skill_name", entity_id),
                "desc": key_ref("home_skill_desc", entity_id),
                "param": row.get("param"),
                "homeSkillType": row.get("homeSkillType"),
            }
        )
    return keyed(rows)


def transform_tags(f: dict[str, list[dict[str, Any]]], output_dir: Path, include_new: bool) -> dict[str, Any]:
    allowed = id_filter(output_dir, "tag_db.json", include_new)
    rows = []
    for row in f["TagFactory"]:
        if not keep_row(row, allowed):
            continue
        entity_id = int(row["id"])
        rows.append(
            {
                "id": entity_id,
                "idCN": row.get("idCN", ""),
                "tagName": key_ref("tag_tagName", entity_id),
                "mod": row.get("mod", ""),
                "detail": key_ref("tag_detail", entity_id) if row.get("detail") else "",
            }
        )
    return keyed(rows)


def related_skill_ids(skill_rows: list[dict[str, Any]], root_skill_ids: Iterable[int]) -> list[int]:
    by_id = {int(row["id"]): row for row in skill_rows}
    seen: set[int] = set()
    result: list[int] = []
    stack = list(root_skill_ids)
    root = set(stack)
    while stack:
        skill_id = stack.pop(0)
        row = by_id.get(skill_id)
        if not row:
            continue
        for item in row.get("ExSkillList", []):
            ex_id = int(item.get("ExSkillName", -1))
            if ex_id < 0 or ex_id in root or ex_id in seen:
                continue
            seen.add(ex_id)
            result.append(ex_id)
            stack.append(ex_id)
    return result


def transform_char_skill_map(f: dict[str, list[dict[str, Any]]], char_db: dict[str, Any]) -> dict[str, Any]:
    result = {}
    for char_id, row in char_db.items():
        skills = [int(item["skillId"]) for item in row.get("skillList", []) if "skillId" in item]
        result[char_id] = {
            "skills": skills,
            "relatedSkills": related_skill_ids(f["SkillFactory"], skills),
            "notFromCharacters": [],
        }
    return result


def transform_item_skill_map(f: dict[str, list[dict[str, Any]]], equip_db: dict[str, Any]) -> dict[str, Any]:
    result = {}
    for equip_id, row in equip_db.items():
        skills = [int(item["skillId"]) for item in row.get("skillList", []) if "skillId" in item]
        related = related_skill_ids(f["SkillFactory"], skills)
        if related:
            result[equip_id] = {"relatedSkills": related}
    return result


def normalize_asset_path(value: Any) -> str | None:
    if not isinstance(value, str) or not value:
        return None
    return value.replace("\\", "/")


def is_wiki_image_src(value: Any) -> bool:
    return isinstance(value, str) and value.startswith("https://patchwiki.biligame.com/")


def is_usable_image_src(value: Any) -> bool:
    if not isinstance(value, str) or not value:
        return False
    return is_wiki_image_src(value) or value.startswith("http://") or value.startswith("images/")


def copy_public_image(source: Path, relative_path: str, dry_run: bool = False) -> None:
    for lang in PUBLIC_LANGUAGE_DIRS:
        target = PROJECT_ROOT / "public" / lang / relative_path
        if dry_run:
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)


def first_existing(paths: Iterable[Path]) -> Path | None:
    for path in paths:
        if path.is_file():
            return path
    return None


def local_char_image(wiki_image_root: Path, char_name: str) -> Path | None:
    return first_existing(
        [
            wiki_image_root / "\u4e58\u5458" / "\u534a\u8eab\u7acb\u7ed8" / f"{char_name}-\u534a\u8eab\u7acb\u7ed8.png",
            wiki_image_root / "\u4e58\u5458" / "\u57fa\u7840\u7acb\u7ed8-\u7b80" / f"{char_name}-\u57fa\u7840\u7acb\u7ed8-\u7b80\u8baf.png",
            wiki_image_root / "\u4e58\u5458" / "\u57fa\u7840\u7acb\u7ed8" / f"{char_name}-\u57fa\u7840\u7acb\u7ed8.png",
            wiki_image_root / "\u4e58\u5458" / "\u5934\u50cf" / f"{char_name}-\u5934\u50cf.png",
        ]
    )


def local_skill_image(wiki_image_root: Path, char_name: str, skill_name: str) -> Path | None:
    return first_existing(
        [
            wiki_image_root / "\u4e58\u5458" / "\u6280\u80fd" / f"{char_name}-{skill_name}.png",
            wiki_image_root / "\u4e58\u5458" / "\u6280\u80fd\u5f3a\u5316" / f"{char_name}-\u6280\u80fd\u5f3a\u5316-{skill_name}.png",
        ]
    )


def skill_owner_name(skill_row: dict[str, Any]) -> str | None:
    id_cn = skill_row.get("idCN")
    if not isinstance(id_cn, str):
        return None
    parts = [part for part in id_cn.split("/") if part]
    if len(parts) < 2:
        return None
    return parts[-2]


def load_uploaded_wiki_filenames(manifest_path: Path) -> set[str]:
    if not manifest_path.is_file():
        return set()
    with manifest_path.open("r", encoding="utf-8-sig", newline="") as f:
        rows = csv.DictReader(f)
        return {
            row["wiki_filename"]
            for row in rows
            if row.get("status") == "uploaded" and row.get("wiki_filename")
        }


def load_local_wiki_filenames(wiki_image_root: Path) -> set[str]:
    if not wiki_image_root.is_dir():
        return set()
    return {path.name for path in wiki_image_root.rglob("*.png") if path.is_file()}


def load_url_cache(cache_path: Path) -> dict[str, str | None]:
    if not cache_path.is_file():
        return {}
    with cache_path.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_url_cache(cache_path: Path, cache: dict[str, str | None]) -> None:
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    dump_json(cache_path, dict(sorted(cache.items())))


def fetch_wiki_imageinfo_payload(batch: list[str]) -> dict[str, Any]:
    titles = "|".join(f"File:{name}" for name in batch)
    params = urllib.parse.urlencode(
        {
            "action": "query",
            "titles": titles,
            "prop": "imageinfo",
            "iiprop": "url",
            "format": "json",
            "utf8": "1",
        },
        safe=":|",
    )
    request = urllib.request.Request(
        f"{WIKI_API_URL}?{params}",
        headers={
            "User-Agent": "resonanceDeckBuilder-data-maintenance/1.0",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def query_wiki_image_urls(filenames: Iterable[str], cache: dict[str, str | None]) -> dict[str, str | None]:
    unique = [name for name in dict.fromkeys(filenames) if name and not cache.get(name)]
    for index in range(0, len(unique), WIKI_API_BATCH_SIZE):
        batch = unique[index : index + WIKI_API_BATCH_SIZE]
        payload: dict[str, Any] | None = None
        for attempt in range(WIKI_API_RETRIES):
            try:
                payload = fetch_wiki_imageinfo_payload(batch)
                break
            except (
                urllib.error.HTTPError,
                urllib.error.URLError,
                TimeoutError,
                http.client.RemoteDisconnected,
                json.JSONDecodeError,
                UnicodeDecodeError,
            ):
                time.sleep(WIKI_API_DELAY_SECONDS * (attempt + 1))
        if payload is None:
            if len(batch) > 1:
                for name in batch:
                    query_wiki_image_urls([name], cache)
            else:
                cache[batch[0]] = None
            continue

        normalized = {
            item.get("to", "").split(":", 1)[-1]: item.get("from", "").split(":", 1)[-1]
            for item in payload.get("query", {}).get("normalized", [])
        }
        found: dict[str, str] = {}
        for page in payload.get("query", {}).get("pages", {}).values():
            title = page.get("title", "").split(":", 1)[-1]
            requested = normalized.get(title, title)
            imageinfo = page.get("imageinfo") or []
            if imageinfo and imageinfo[0].get("url"):
                found[requested] = imageinfo[0]["url"]

        for name in batch:
            cache[name] = found.get(name)
        time.sleep(WIKI_API_DELAY_SECONDS)
    return cache


def filename_candidates(*parts: str | None) -> list[str]:
    clean = [part for part in parts if part]
    if not clean:
        return []
    return ["-".join(clean) + ".png"]


def first_wiki_url(candidates: Iterable[str], url_cache: dict[str, str | None]) -> str | None:
    for filename in candidates:
        url = url_cache.get(filename)
        if url:
            return url
    return None


def register_missing(report: dict[str, list[str]], key: str, candidates: Iterable[str]) -> None:
    values = [item for item in candidates if item]
    report[key] = values


def build_wiki_image_candidates(
    f: dict[str, list[dict[str, Any]]],
    lang_cn: dict[str, str],
) -> tuple[dict[str, list[str]], dict[str, str]]:
    candidates: dict[str, list[str]] = {}
    card_aliases: dict[str, str] = {}

    char_by_id = {int(row["id"]): row for row in f["UnitFactory"] if "id" in row}
    char_name_by_id = {
        char_id: lang_cn.get(key_ref("char_name", char_id)) or row.get("name")
        for char_id, row in char_by_id.items()
    }

    skill_by_id = {int(row["id"]): row for row in f["SkillFactory"] if "id" in row}
    for row in f["UnitFactory"]:
        if row.get("mod") != "\u73a9\u5bb6\u89d2\u8272" or row.get("isInformalData", False):
            continue
        entity_id = int(row["id"])
        char_name = char_name_by_id.get(entity_id)
        candidates[key_ref("char", entity_id)] = [
            *filename_candidates(char_name, "\u534a\u8eab\u7acb\u7ed8"),
            *filename_candidates(char_name, "\u57fa\u7840\u7acb\u7ed8-\u7b80\u8baf"),
            *filename_candidates(char_name, "\u57fa\u7840\u7acb\u7ed8"),
            *filename_candidates(char_name, "\u5934\u50cf"),
        ]
        for item in row.get("talentList", []):
            talent_id = item.get("talentId")
            if talent_id:
                talent_name = lang_cn.get(key_ref("talent_name", int(talent_id)))
                candidates[key_ref("talent", int(talent_id))] = filename_candidates(
                    char_name, "\u5171\u632f", talent_name
                )
        for item in row.get("breakthroughList", []):
            break_id = item.get("breakthroughId")
            if break_id:
                break_name = lang_cn.get(key_ref("break_name", int(break_id)))
                candidates[key_ref("break", int(break_id))] = filename_candidates(
                    char_name, "\u89c9\u9192", break_name
                )

    for skill_id, row in skill_by_id.items():
        skill_name = lang_cn.get(key_ref("skill_name", skill_id)) or row.get("name")
        char_name = skill_owner_name(row)
        skill_candidates = [
            *filename_candidates(char_name, skill_name),
            *filename_candidates(char_name, "\u6280\u80fd\u5f3a\u5316", skill_name),
            *filename_candidates(skill_name),
            *filename_candidates("\u6280\u80fd\u5f3a\u5316", skill_name),
        ]
        candidates[key_ref("skill", skill_id)] = skill_candidates
        card_id = row.get("cardID")
        if isinstance(card_id, int) and card_id > 0:
            card_key = key_ref("card", card_id)
            card_aliases[card_key] = key_ref("skill", skill_id)
            candidates[card_key] = skill_candidates

    gallery_equipment_ids = book_equipment_ids(f["BookFactory"])
    for row in f["EquipmentFactory"]:
        entity_id = int(row["id"])
        if gallery_equipment_ids and entity_id not in gallery_equipment_ids:
            continue
        equip_name = lang_cn.get(key_ref("equip_name", entity_id)) or row.get("name")
        candidates[key_ref("equip", entity_id)] = filename_candidates(equip_name)

    return candidates, card_aliases


def apply_wiki_image_urls(
    images: dict[str, str],
    f: dict[str, list[dict[str, Any]]],
    lang_cn: dict[str, str],
    manifest_path: Path,
    wiki_image_root: Path,
    cache_path: Path,
    missing_report_path: Path,
    dry_run: bool,
) -> dict[str, str]:
    candidates_by_key, card_aliases = build_wiki_image_candidates(f, lang_cn)
    cache = load_url_cache(cache_path)

    candidate_names = sorted({name for names in candidates_by_key.values() for name in names if name})
    if candidate_names:
        query_wiki_image_urls(candidate_names, cache)
        if not dry_run:
            save_url_cache(cache_path, cache)

    for key, candidates in candidates_by_key.items():
        if is_wiki_image_src(images.get(key)):
            continue
        url = first_wiki_url(candidates, cache)
        if url:
            images[key] = url
            continue
        alias = card_aliases.get(key)
        if alias and is_wiki_image_src(images.get(alias)):
            images[key] = images[alias]
    return images


def write_missing_wiki_image_report(
    images: dict[str, str],
    f: dict[str, list[dict[str, Any]]],
    lang_cn: dict[str, str],
    missing_report_path: Path,
    dry_run: bool,
) -> None:
    if dry_run:
        return
    candidates_by_key, _ = build_wiki_image_candidates(f, lang_cn)
    missing: dict[str, list[str]] = {}
    for key, src in images.items():
        if key.split("_", 1)[0] not in {"char", "skill", "card", "break", "talent", "equip"}:
            continue
        if is_wiki_image_src(src):
            continue
        register_missing(missing, key, candidates_by_key.get(key, []))
    dump_json(missing_report_path, dict(sorted(missing.items())))


def sync_local_images(
    images: dict[str, str],
    f: dict[str, list[dict[str, Any]]],
    lang_cn: dict[str, str],
    wiki_image_root: Path,
    dry_run: bool,
) -> dict[str, str]:
    if not wiki_image_root.is_dir():
        return images

    for row in f["UnitFactory"]:
        if row.get("mod") != "\u73a9\u5bb6\u89d2\u8272" or row.get("isInformalData", False):
            continue
        entity_id = int(row["id"])
        key = key_ref("char", entity_id)
        if is_usable_image_src(images.get(key)):
            continue
        char_name = lang_cn.get(key_ref("char_name", entity_id)) or row.get("name")
        if not char_name:
            continue
        source = local_char_image(wiki_image_root, char_name)
        if not source:
            continue
        relative_path = f"images/generated/characters/{entity_id}{source.suffix.lower()}"
        copy_public_image(source, relative_path, dry_run=dry_run)
        images[key] = relative_path

    for row in f["SkillFactory"]:
        entity_id = int(row["id"])
        key = key_ref("skill", entity_id)
        card_id = row.get("cardID")
        card_key = key_ref("card", int(card_id)) if isinstance(card_id, int) and card_id > 0 else None
        if is_usable_image_src(images.get(key)) and (not card_key or is_usable_image_src(images.get(card_key))):
            continue
        char_name = skill_owner_name(row)
        skill_name = lang_cn.get(key_ref("skill_name", entity_id)) or row.get("name")
        if not char_name or not skill_name:
            continue
        source = local_skill_image(wiki_image_root, char_name, skill_name)
        if not source:
            continue
        relative_path = f"images/generated/skills/{entity_id}{source.suffix.lower()}"
        copy_public_image(source, relative_path, dry_run=dry_run)
        images[key] = relative_path
        if card_key and not is_usable_image_src(images.get(card_key)):
            images[card_key] = relative_path

    return images


def transform_images(
    f: dict[str, list[dict[str, Any]]],
    output_dir: Path,
    include_new: bool,
    lang_cn: dict[str, str],
    wiki_image_root: Path,
    manifest_path: Path,
    cache_path: Path,
    missing_report_path: Path,
    dry_run: bool,
) -> dict[str, str]:
    images: dict[str, str] = load_json(output_dir / "img_db.json", {})
    if include_new:
        gallery_equipment_ids = book_equipment_ids(f["BookFactory"])
        for row in f["UnitFactory"]:
            path = normalize_asset_path(row.get("roleListResUrl") or row.get("face"))
            if path:
                images.setdefault(key_ref("char", int(row["id"])), path)
        for row in f["CardFactory"]:
            path = normalize_asset_path(row.get("iconPath"))
            if path:
                images.setdefault(key_ref("card", int(row["id"])), path)
        for row in f["SkillFactory"]:
            path = normalize_asset_path(row.get("iconPath"))
            if path:
                images.setdefault(key_ref("skill", int(row["id"])), path)
        for row in f["EquipmentFactory"]:
            if gallery_equipment_ids and int(row["id"]) not in gallery_equipment_ids:
                continue
            path = normalize_asset_path(row.get("iconPath") or row.get("tipsPath"))
            if path:
                images.setdefault(key_ref("equip", int(row["id"])), path)
    gallery_equipment_ids = book_equipment_ids(f["BookFactory"])
    if gallery_equipment_ids:
        images = {
            key: value
            for key, value in images.items()
            if not key.startswith("equip_") or int(key.split("_", 1)[1]) in gallery_equipment_ids
        }
    images = apply_wiki_image_urls(
        images,
        f,
        lang_cn,
        manifest_path=manifest_path,
        wiki_image_root=wiki_image_root,
        cache_path=cache_path,
        missing_report_path=missing_report_path,
        dry_run=dry_run,
    )
    images = sync_local_images(images, f, lang_cn, wiki_image_root, dry_run=dry_run)
    write_missing_wiki_image_report(images, f, lang_cn, missing_report_path, dry_run)
    return dict(sorted(images.items(), key=lambda item: item[0]))


def transform_version_info(output_dir: Path, source: Path) -> dict[str, Any]:
    current = load_json(output_dir / "version_info.json", {})
    now = dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z")
    active = current.get("activeGameData", {}) if isinstance(current, dict) else {}
    active.update(
        {
            "sourceRegion": active.get("sourceRegion", "CN"),
            "clientVersion": active.get("clientVersion", "unknown"),
            "lastUpdated": now,
            "sourcePath": str(source),
        }
    )
    result = dict(current) if isinstance(current, dict) else {}
    result["activeGameData"] = active
    return result


def build_all(
    source: Path,
    output_dir: Path,
    include_new: bool,
    wiki_image_root: Path,
    manifest_path: Path,
    cache_path: Path,
    missing_report_path: Path,
    dry_run: bool,
) -> dict[str, Any]:
    factories = load_factories(source)
    char_db = transform_characters(factories, output_dir, include_new)
    equip_db = transform_equipment(factories, output_dir, include_new)
    lang_cn = build_lang_cn(factories, output_dir)
    return {
        "break_db.json": transform_breakthroughs(factories, output_dir, include_new),
        "card_db.json": transform_cards(factories, output_dir, include_new),
        "char_db.json": char_db,
        "char_skill_map.json": transform_char_skill_map(factories, char_db),
        "equip_db.json": equip_db,
        "home_skill_db.json": transform_home_skills(factories, output_dir, include_new),
        "img_db.json": transform_images(
            factories,
            output_dir,
            include_new,
            lang_cn,
            wiki_image_root,
            manifest_path,
            cache_path,
            missing_report_path,
            dry_run,
        ),
        "item_skill_map.json": transform_item_skill_map(factories, equip_db),
        "lang_cn.json": lang_cn,
        "skill_db.json": transform_skills(factories, output_dir, include_new),
        "tag_db.json": transform_tags(factories, output_dir, include_new),
        "talent_db.json": transform_talents(factories, output_dir, include_new),
        "version_info.json": transform_version_info(output_dir, source),
    }


def write_outputs(outputs: dict[str, Any], output_dir: Path, dry_run: bool) -> int:
    output_dir.mkdir(parents=True, exist_ok=True)
    backup_dir = output_dir.parent / f"{output_dir.name}_backup_{dt.datetime.now():%Y%m%d_%H%M%S}"
    changed = 0

    with tempfile.TemporaryDirectory() as temp_name:
        temp_dir = Path(temp_name)
        for file_name, data in outputs.items():
            dump_json(temp_dir / file_name, data)

        for file_name in GENERATED_FILES:
            generated = temp_dir / file_name
            target = output_dir / file_name
            if not generated.exists():
                continue
            is_changed = not target.exists() or not filecmp.cmp(generated, target, shallow=False)
            status = "changed" if is_changed else "unchanged"
            size = generated.stat().st_size
            print(f"{status:9} {file_name:22} {size:>10} bytes")
            if not is_changed:
                continue
            changed += 1
            if dry_run:
                continue
            if target.exists():
                backup_dir.mkdir(parents=True, exist_ok=True)
                shutil.copy2(target, backup_dir / file_name)
            shutil.copy2(generated, target)

    if not dry_run and backup_dir.exists():
        print(f"backup: {backup_dir}")
    return changed


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source",
        type=Path,
        default=None,
        help="BinaryConfig directory; defaults to the newest known local BinaryConfig",
    )
    parser.add_argument(
        "--wiki-image-root",
        type=Path,
        default=DEFAULT_WIKI_IMAGE_ROOT,
        help="local wiki image root used to fill missing img_db entries",
    )
    parser.add_argument(
        "--wiki-manifest",
        type=Path,
        default=DEFAULT_WIKI_MANIFEST,
        help="local uploaded wiki image manifest used to limit image URL lookups",
    )
    parser.add_argument(
        "--wiki-url-cache",
        type=Path,
        default=DEFAULT_WIKI_URL_CACHE,
        help="cache file for resolved patchwiki image URLs",
    )
    parser.add_argument(
        "--missing-image-report",
        type=Path,
        default=DEFAULT_MISSING_IMAGE_REPORT,
        help="JSON report for image keys that could not be resolved to wiki URLs",
    )
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="target public/db directory")
    parser.add_argument(
        "--include-new",
        action="store_true",
        help="include new IDs from BinaryConfig; kept for compatibility and now enabled by default",
    )
    parser.add_argument(
        "--existing-only",
        action="store_true",
        help="only update IDs that already exist in public/db",
    )
    parser.add_argument("--dry-run", action="store_true", help="show changed files without writing")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    source = (args.source or detect_default_source()).resolve()
    output = args.output.resolve()

    if not source.is_dir():
        print(f"source directory not found: {source}", file=sys.stderr)
        return 2

    outputs = build_all(
        source,
        output,
        include_new=not args.existing_only,
        wiki_image_root=args.wiki_image_root.resolve(),
        manifest_path=args.wiki_manifest.resolve(),
        cache_path=args.wiki_url_cache.resolve(),
        missing_report_path=args.missing_image_report.resolve(),
        dry_run=args.dry_run,
    )
    changed = write_outputs(outputs, output, dry_run=args.dry_run)
    mode = "dry-run" if args.dry_run else "write"
    print(f"{mode}: {changed} file(s) changed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
