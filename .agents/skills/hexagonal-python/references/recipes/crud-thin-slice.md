# Recipe: CRUD thin slice

## Problem

A supporting subdomain (product catalog, reference data, settings) needs create/read/update/delete endpoints. There are no business rules beyond input shape and uniqueness. Full aggregates, domain events and a unit of work would add files without removing any pain.

## Use it when / skip it when

- Use when: the feature is data in, data out; the only rules are "exists" and "is unique"; one table backs it.
- Skip when: state transitions appear ("a product can only be discontinued if..."), several entities must change atomically, or other contexts need to react to changes. Move to the full slice in `../idioms.md` for that feature only.

## Design

- One module in the application layer holds the record type, the port and the use cases. No `domain/` package.
- The port still exists: it keeps SQL out of the use cases, lets tests run without a database, and costs one small `Protocol`.
- Errors reuse the shared-kernel families (`NotFoundError`, `ConflictError`), so the HTTP adapter maps them without changes.
- `Decimal` is fine for money here; there is no arithmetic that needs a `Money` value object yet.

## Code

```python
# src/shop/catalog/application/products.py
"""Thin slice: a supporting subdomain with no business rules beyond input shape.

No aggregate, no domain events, one small module. The port still keeps SQL out of the use cases,
so tests need no database and the storage can change later.
"""

from dataclasses import dataclass
from decimal import Decimal
from typing import Protocol

from shop.shared_kernel.errors import ConflictError, NotFoundError


@dataclass(frozen=True, slots=True)
class Product:
    sku: str
    name: str
    price: Decimal
    currency: str


class ProductCatalog(Protocol):
    def get(self, sku: str) -> Product | None: ...

    def add(self, product: Product) -> None:
        """Raises ConflictError when the sku already exists."""
        ...


class CreateProduct:
    def __init__(self, catalog: ProductCatalog) -> None:
        self._catalog = catalog

    def execute(self, product: Product) -> Product:
        if self._catalog.get(product.sku) is not None:
            raise ConflictError(f"product {product.sku} already exists")
        self._catalog.add(product)
        return product


class GetProduct:
    def __init__(self, catalog: ProductCatalog) -> None:
        self._catalog = catalog

    def execute(self, sku: str) -> Product:
        product = self._catalog.get(sku)
        if product is None:
            raise NotFoundError(f"product {sku} not found")
        return product
```

Checking `get` before `add` gives a clear error in the common case; the adapter still translates the unique-constraint violation to `ConflictError` for the race where two requests create the same sku at once.

## Tests

```python
# tests/catalog/test_products.py
from decimal import Decimal

import pytest

from shop.catalog.application.products import CreateProduct, GetProduct, Product
from shop.shared_kernel.errors import ConflictError, NotFoundError


class InMemoryProductCatalog:
    def __init__(self) -> None:
        self.products: dict[str, Product] = {}

    def get(self, sku: str) -> Product | None:
        return self.products.get(sku)

    def add(self, product: Product) -> None:
        if product.sku in self.products:
            raise ConflictError(f"product {product.sku} already exists")
        self.products[product.sku] = product


LAMP = Product(sku="LAMP-1", name="Desk lamp", price=Decimal("39.90"), currency="USD")


def test_created_product_can_be_read_back() -> None:
    catalog = InMemoryProductCatalog()

    CreateProduct(catalog).execute(LAMP)

    assert GetProduct(catalog).execute("LAMP-1") == LAMP


def test_duplicate_sku_is_a_conflict() -> None:
    catalog = InMemoryProductCatalog()
    CreateProduct(catalog).execute(LAMP)

    with pytest.raises(ConflictError):
        CreateProduct(catalog).execute(LAMP)


def test_unknown_sku_is_not_found() -> None:
    with pytest.raises(NotFoundError):
        GetProduct(InMemoryProductCatalog()).execute("missing")
```

The fake lives in the test module because only these tests use it. Move it to `tests/support/fakes.py` when a second test module needs it.

## Wiring

- Outbound: a `SqlAlchemyProductCatalog` with `get` (select by sku) and `add` (insert, `IntegrityError` → `ConflictError`), following `../persistence/sqlalchemy.md`. With no unit of work, the adapter commits its own short transaction: acceptable for a single-row write, not for anything that must be atomic with another write.
- Inbound: a router or blueprint with `POST /products` and `GET /products/{sku}`, schemas in the adapter, exactly as in `../frameworks/`.
- Architecture: the `catalog` context never imports `orders`, and vice versa. The `import-linter` independence contract in `../idioms.md` enforces it.
