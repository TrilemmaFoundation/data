# Apps source coverage review

Reviewed 2026-09-28 against the six product revisions recorded in
[`src/content/apps/other.ts`](../src/content/apps/other.ts) and
[`src/content/apps/travelcanary.ts`](../src/content/apps/travelcanary.ts).
Those revisions, rather than whatever a product checkout later points to, define
this snapshot. TravelCanary's country partitions and their named warning systems
are recorded in [`national-warning-systems.json`](../src/content/apps/national-warning-systems.json).

| App | Source families outside country partitions | Exact guide links | Exclusions |
| --- | ---: | ---: | ---: |
| TitanSkies | 9 | 8 | 1 |
| HyperOptions | 4 | 2 | 2 |
| TravelCanary | 45 | 38 | 7 |
| HouseHunter | 21 | 19 | 2 |
| RockyRoad | 3 | 2 | 1 |
| StackingSats | 6 | 5 | 1 |
| **Total** | **88** | **74** | **14** |

TravelCanary also has 45 country coverage rows. Expanding them yields 83 named
warning-system entries (67 distinct system IDs): 27 entries have exact guide
links and 56 have a specific exclusion reason. Country rows are display
partitions, not datasets. Across all apps, 101 distinct exact guide IDs are
referenced; 92 guides were added in this review and nine were already active.

Each linked [guide](../data/datasets) records the official source and reuse
URLs, update frequency or maintenance program, access steps, interpretation
limits, and a Python starting example. The source snapshot records the role,
availability, and exact guide relationship. A source or national system without
a qualifying guide retains its official link and a specific `noGuideReason`.
Restricted personal imports, project-authored rules, and StackingSats' pinned
historical parquet remain cited without a new dataset guide. Bitview is linked
as related current data, not as the historical parquet's exact match.

Guide identity was checked against the feed or artifact used by the pinned
product. In particular, HouseHunter's FEMA National Risk Index is separate
from FEMA's flood layers; RockyRoad's Geofabrik extract is separate from OSM
Overpass; HouseHunter's EPA water-system tables, FCC county summary, and NOAA
station normals retain their pinned vintages. TravelCanary's warning-system
links are per system, including multi-feed country partitions. A guide link
does not assert that a configured, gated, blocked, pinned, or historical source
is currently live in the app.

The exclusions follow the catalog policy in [`CONTRIBUTING.md`](../CONTRIBUTING.md):
an exact source needs verified access, maintenance, permitted analysis, and a
runnable example. Lack of an approved automated feed, unpublished reuse terms,
unavailable credentials, and broken exact endpoints are reasons to keep a
source citation without adding a guide. Free noncommercial sources qualify
when their published terms permit the guide's analysis; their limits are stated
in the guide. Review the source snapshot and its recorded revision whenever a
product's feeds change and at least every 90 days.
