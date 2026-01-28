import os
import requests

from django.conf import settings
from django.core.management.base import BaseCommand
from django.contrib.gis.gdal import DataSource
from django.db import transaction

from community.models import AdminUnit, CommunityHub, HubType
from community.utils import iso2_to_iso3


GADM_VERSION = "4.1"
GADM_FILE_VERSION = "41"
GADM_BASE_URL = "https://geodata.ucdavis.edu/gadm"


class Command(BaseCommand):
    help = (
        "Download and import GADM administrative boundaries and "
        "auto-create SYSTEM community hubs with parent hierarchy"
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--country",
            required=True,
            help="ISO-3166-1 alpha-2 country code (e.g. NG)",
        )
        parser.add_argument(
            "--max-level",
            type=int,
            default=2,
            help="Maximum administrative level to import (default: 2)",
        )

    def handle(self, *args, **options):
        country_code = options["country"].upper()
        max_level = options["max_level"]

        self.stdout.write(
            f"🌍 Importing GADM data for {country_code} (ADMIN_0 → ADMIN_{max_level})"
        )

        geopackage_path = self._get_or_download_geopackage(country_code)

        self._import_admin_units_and_hubs(
            country_code=country_code,
            geopackage_path=geopackage_path,
            max_level=max_level,
        )

        self.stdout.write(
            self.style.SUCCESS("✅ GADM import and SYSTEM hub bootstrap completed")
        )

    # ------------------------------------------------------------------
    # Download helpers
    # ------------------------------------------------------------------

    def _get_or_download_geopackage(self, country_code: str) -> str:
        iso3_code = iso2_to_iso3(country_code)

        data_dir = os.path.join(settings.BASE_DIR, "data", "gadm")
        os.makedirs(data_dir, exist_ok=True)

        filename = f"gadm{GADM_FILE_VERSION}_{iso3_code}.gpkg"
        file_path = os.path.join(data_dir, filename)

        if os.path.exists(file_path):
            self.stdout.write(f"📁 Using cached file: {file_path}")
            return file_path

        url = f"{GADM_BASE_URL}/gadm{GADM_VERSION}/gpkg/{filename}"
        self.stdout.write(f"⬇️  Downloading {url}")

        response = requests.get(url, stream=True, timeout=120)
        response.raise_for_status()

        with open(file_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    f.write(chunk)

        return file_path

    # ------------------------------------------------------------------
    # GADM field helpers
    # ------------------------------------------------------------------

    def _get_admin_code_and_name(self, feature, level: int):
        if level == 0:
            return feature.get("GID_0"), feature.get("COUNTRY")

        return feature.get(f"GID_{level}"), feature.get(f"NAME_{level}")

    def _get_parent_admin_code(self, feature, level: int):
        if level == 0:
            return None
        return feature.get(f"GID_{level - 1}")

    # ------------------------------------------------------------------
    # Core import logic
    # ------------------------------------------------------------------

    @transaction.atomic
    def _import_admin_units_and_hubs(
        self,
        country_code: str,
        geopackage_path: str,
        max_level: int,
    ):
        datasource = DataSource(geopackage_path)
        available_layers = {layer.name for layer in datasource}

        # (level, code) -> AdminUnit
        admin_unit_index = {}

        # AdminUnit.id -> CommunityHub
        system_hub_index = {}

        for level in range(0, max_level + 1):
            layer_name = f"ADM_ADM_{level}"

            if layer_name not in available_layers:
                self.stdout.write(
                    self.style.WARNING(f"⚠️ Layer {layer_name} not found, skipping")
                )
                continue

            layer = datasource[layer_name]
            self.stdout.write(f"📦 Importing ADMIN_{level}: {len(layer)} units")

            for feature in layer:
                admin_code, admin_name = self._get_admin_code_and_name(feature, level)
                if not admin_code or not admin_name:
                    continue

                parent_admin = None
                parent_code = self._get_parent_admin_code(feature, level)
                if parent_code:
                    parent_admin = admin_unit_index.get((level - 1, parent_code))

                admin_unit, _ = AdminUnit.objects.update_or_create(
                    country_code=country_code,
                    level=level,
                    code=admin_code,
                    defaults={
                        "name": admin_name,
                        "geom": feature.geom.geos,
                        "parent": parent_admin,
                    },
                )

                admin_unit_index[(level, admin_code)] = admin_unit

                # --------------------------------------------------
                # SYSTEM hub creation (ADMIN_0, ADMIN_1, ADMIN_2...)
                # --------------------------------------------------

                parent_hub = None
                if parent_admin:
                    parent_hub = system_hub_index.get(parent_admin.id)

                system_hub, _ = CommunityHub.objects.get_or_create(
                    admin_unit=admin_unit,
                    hub_type=HubType.SYSTEM,
                    defaults={
                        "name": admin_unit.name,
                        "parent": parent_hub,
                        "is_verified": True,
                        "is_active": True,
                    },
                )

                system_hub_index[admin_unit.id] = system_hub

        self.stdout.write(
            self.style.SUCCESS(
                f"🏘️  SYSTEM hubs ensured for ADMIN_0 → ADMIN_{max_level}"
            )
        )
