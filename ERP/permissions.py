"""Role -> permission matrix. Mirrors Phase 1 design; Django maps these codenames to Permission rows."""
ALL = {
 "dashboard.view","products.view","products.edit","partners.view","partners.edit",
 "inventory.view","inventory.adjust","inventory.transfer",
 "sales.view","sales.create","sales.post","sales.cancel","sales.sell_below_min_price",
 "purchases.view","purchases.create","purchases.post","purchases.cancel",
 "payments.create","cashbox.view","cashbox.manage","expenses.view","expenses.create",
 "accounting.view","accounting.post_manual","accounting.close_period",
 "reports.view","users.manage","audit.view","settings.manage",
}
ROLES = {
 "admin": set(ALL),
 "manager": ALL - {"users.manage","settings.manage","accounting.close_period"},
 "accountant": {"dashboard.view","partners.view","sales.view","purchases.view","payments.create",
   "cashbox.view","cashbox.manage","expenses.view","expenses.create","accounting.view",
   "accounting.post_manual","accounting.close_period","reports.view","inventory.view","products.view"},
 "sales": {"dashboard.view","products.view","partners.view","partners.edit","inventory.view",
   "sales.view","sales.create","sales.post","payments.create"},
 "warehouse": {"products.view","inventory.view","inventory.adjust","inventory.transfer",
   "purchases.view","sales.view"},
}

def has_perm(role: str, perm: str) -> bool:
    if perm not in ALL: raise KeyError(f"unknown permission {perm}")
    return perm in ROLES.get(role, set())
