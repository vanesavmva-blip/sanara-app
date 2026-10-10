/* SANARA — customer access list
 *
 * Manage customers inside the app: log in with your OWNER code → 👑 Owner menu.
 * Only a scrambled fingerprint (hash) of each code is stored here, so nobody can read the real codes from this file.
 * role: "owner" unlocks the Owner menu. Every other entry is a customer.
 */
const ACCESS_CODES = [
  { customer: "Owner (you)", email: "", hash: "135b1dc9ae8a5979b8602f3cd0081c08208dde031d3c0eb87fe93fabed6b754b", expires: "", active: true, role: "owner", added: "2026-10-10" },
];
