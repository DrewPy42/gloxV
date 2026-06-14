# Location Hierarchy and Continuation Design

## Purpose

The collection needs to support more accurate physical storage tracking for insurance, retrieval, and inventory management.

Historically, a location could describe a cabinet, drawer, divider, shelf, display, or digital path using several optional fields. That works for flat location records, but it does not cleanly represent locations inside other locations.

The new model treats locations as a physical hierarchy.

Example:
Cabinet 1
    └── Drawer 1
        └── Divider A

Copies are assigned to the most specific known physical location.

Example:
Copy → Cabinet 1 / Drawer 1 / Divider A


This allows a copy to have one exact current location while parent locations can roll up totals for all contents underneath them.

## Goals

- Accurately locate a specific copy.
- Support nested physical storage.
- Support duplicate child names under different parents.
- Support bulk assignment of copies to a location.
- Support moving an entire location without updating every copy inside it.
- Support roll-up copy counts and values for insurance reporting.
- Support overflow/continuation between locations.
- Avoid over-modeling manual per-copy filing order for now.

## Physical Containment

Physical containment is represented by `location.parent_location_id`.

Example:
Cabinet 1
    └── Drawer 1
        └── Divider A

In this example:

A location with no parent is a root location.

Example root locations:
Cabinet 1
Cabinet 2
Bookshelf 1
Display Case
Digital Collection


## Moving Locations

Moving a location updates only its parent.

Example before move:
Cabinet 1
    └── Drawer 1
        └── Divider A
            ├── Copy 101
            └── Copy 102


Move `Divider A` to `Cabinet 3 / Drawer 2`.

Only changes these:
Divider A.parent_location_id = Drawer 2.location_id

Example after move:
Cabinet 3
    └── Drawer 2
        └── Divider A
            ├── Copy 101
            └── Copy 102


The copies do not need to be updated because they still point to the same divider.

## Duplicate Location Names

Duplicate location names are allowed when the full path is different.

This is valid:

Cabinet 1
    └── Drawer 1
        └── Divider A
Cabinet 2
    └── Drawer 1
        └── Divider A


The display name alone is not treated as globally unique. The full path is the meaningful identifier for humans.

## Copy Assignment

A copy should normally be assigned to the most specific known location.

Preferred:

Copy → Cabinet 1 / Drawer 1 / Divider A

Copies are assigned to the most specific known physical location.


Allowed when the exact location is unknown or temporary:

Copy → Cabinet 1 / Drawer 1


When assigning copies to a non-leaf location, the UI should warn the user that child locations exist.

## Roll-Up Counts and Value

Locations should expose both direct and rolled-up totals.

Direct totals count only copies assigned directly to the location.

Rolled-up totals include all descendant locations.

Example:
Cabinet 1 — 350 copies total — $2,850 total
    └── Drawer 1 — 175 copies total — $1,400 total
        └── Divider A — 80 copies (direct) — $620 (direct)


For insurance and high-level reporting, rolled-up totals are usually more useful.

## Continuation and Overflow

Overflow is not physical containment.

If `Divider A` in Drawer 1 overflows into `Divider A` in Drawer 2, the second divider is not inside the first divider. They are separate physical locations.

Physical structure:
Cabinet 1
    ├── Drawer 1
    │   └── Divider A
    └── Drawer 2
        └── Divider A

Continuation relationship:
Cabinet 1 / Drawer 1 / Divider A continues to Cabinet 1 / Drawer 2 / Divider A


The continuation relationship is stored separately from the physical parent/child hierarchy.

From the source location, the UI should display:
Continues to: Cabinet 1 / Drawer 2 / Divider A

From the destination location, the UI should display:
Overflow from: Cabinet 1 / Drawer 1 / Divider A


## location_link Table

The continuation relationship is stored in a `location_link` table with the following fields:

| Field | Type | Description |
|---|---|---|
| `location_link_id` | integer PK | |
| `from_location_id` | integer FK → location | The location that overflows |
| `to_location_id` | integer FK → location | The location that receives overflow |
| `notes` | text, nullable | Optional label (e.g. "Spider-Man titles continue here") |
| `created_at` | timestamp | Audit field |

A pair of locations can have at most one link in each direction. Circular links (A→B→A) should be rejected at the application layer.

## Continuation Notes

Continuation links can have optional notes.

Examples:
Spider-Man titles continue here
Amazing Spider-Man #226-current.


This gives enough context without requiring a complex issue-range model.

## Sorting Contents Within a Location

Manual per-copy ordering is intentionally not part of the first version.

Copies inside a location should be sorted using existing comic metadata:

1. `sort_title` (series)
2. `volume_number`
3. `issue_sort_order`
4. `copy_id` (tiebreak)



This matches the current real-world filing approach without adding high-maintenance position tracking.

## Location Types

Supported location types should include:

- `cabinet`
- `drawer`
- `divider`
- `bookshelf`
- `shelf`
- `display`
- `box`
- `folder`
- `digital`

Note: `drawer` and `shelf` are new — the current `StorageType` enum does not include them yet. Phase 1 adds them.


Recommended physical hierarchies:
cabinet
    └── drawer
        └── divider

box
    └── divider

bookshelf
    └── shelf

display
    └── shelf

digital
    └── folder
        └── folder


The application should guide users toward sensible combinations but should not be overly restrictive at first.

## Validation Rules

The application must prevent circular location nesting.

Invalid example (what must be rejected):
Divider A
    └── Cabinet 1   ← Cabinet 1 is an ancestor of Divider A; this creates a cycle

`Cabinet 1` cannot be moved inside `Divider A` because `Divider A` is already a descendant of `Cabinet 1`.

A location also cannot be moved into itself.

## Initial Implementation Phases

### Phase 1: Data Foundation

- Add `parent_location_id` to `location`.
- Expand location storage types.
- Add `location_link` table for continuation relationships.
- Update TypeScript models.

### Phase 2: Backend API

- Return hierarchical location tree.
- Return full location paths.
- Move a location to a new parent.
- Create/update continuation links.
- Compute direct and rolled-up counts/value.

### Phase 3: Frontend Tree UI

- Display locations as an expandable tree.
- Show copy counts and total value.
- Show continuation/overflow indicators.
- Add location actions:
    - view copies
    - assign copies here
    - add child location
    - move location
    - set continuation
    - edit
    - delete/archive

### Phase 4: Copy Discovery

- Show full location path wherever copies appear.
- Allow searching/filtering by location.
- Show copies within a selected location sorted by filing metadata.

## Deferred Ideas

These are intentionally not part of the first implementation:

- Manual per-copy physical ordering.
- Formal issue ranges per divider.
- Location capacity warnings.
- Location movement history.
- Barcode/QR code labels.