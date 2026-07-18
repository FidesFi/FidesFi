# FIDES — Spec Eksekusi

Kontrak inti = **`FidesVault`**. Satu kontrak reusable, di-deploy per basket (Fides Frontier / Fides Blue). Foundry + MIT. Chain: Robinhood Chain (mainnet 4663, testnet 46630).

Prinsip non-negosiasi (dari konsep, framing B):
- **Custody trustless** — agent bisa *ngatur*, gak bisa *narik*.
- **Redeem gak pernah bisa di-pause.**
- **Guardian gak boleh nyentuh dana user.** Kalau desain butuh itu → redesign.

---

## 1. Spec kontrak `FidesVault` (ERC-20 share token yang megang konstituen)

Vault = token share ERC-20 (mis. `FRONTIER`). Megang N stock token. Mint in-kind, redeem in-kind.

### Fungsi publik
| Fungsi | Signature | Akses |
|---|---|---|
| mint | `mint(uint256 shares, address to)` | siapa aja |
| redeem | `redeem(uint256 shares, address to)` | holder — **gak bisa dipause** |
| rebalance | `rebalance(Swap[] swaps, bytes32 rationale)` | **rebalancer (agent) doang** |
| units | `units() → uint256[]` | view |
| nav / isFullyBacked | view | view |
| setMintPaused | `setMintPaused(bool)` | guardian |
| setSupplyCap | `setSupplyCap(uint256)` | guardian (≤ ceiling immutable) |
| setFeeRecipient | `setFeeRecipient(address)` | guardian |
| setRebalancer | `setRebalancer(address)` | guardian |

### State
- `address[] assets` — **whitelist, di-set saat deploy, IMMUTABLE.**
- `uint256[] _units` — jumlah tiap aset per-share. **Mutable, TAPI cuma via `rebalance`.**
- `supplyCap` (guardian, ≤ `SUPPLY_CEILING` immutable), `mintPaused` (guardian; redeem TIDAK).
- `guardian` (Safe), `rebalancer` (agent key/session), `feeRecipient` (guardian-swappable), `mintFeeBps` (immutable, cap 50).
- `router` (DEX whitelist, immutable), `oracle[i]` (Chainlink per aset, immutable).
- Guardrail rebalance (immutable): `maxSlippageBps`, `maxTurnoverBps`, `rebalanceCooldown`; `lastRebalance`.

### Mekanik
- **mint(shares):** tarik `ceil(shares × units[i] / 1e18)` tiap aset dari user → mint `shares` (fee `mintFeeBps` dalam bentuk share ke feeRecipient, sisanya ke user). Backing tetap utuh.
- **redeem(shares):** burn share → kirim `floor(shares × units[i] / 1e18)` tiap aset. **Gak ada gate/pause.**
- **rebalance(swaps, rationale):** cuma rebalancer, cooldown lewat. Eksekusi swap **antar aset whitelist via router doang**. Cek: `navAfter ≥ navBefore × (1 − maxSlippage)` (nilai gak boleh bocor > slippage), `turnover ≤ maxTurnover`. Terus **recompute `units[i] = balance[i] × 1e18 / supply`** (units = cerminan saldo asli → dijamin fully-backed). Emit rationale (hash IPFS) buat transparansi.

### 🔒 INVARIANT (harus SELALU benar)
- **INV1 — backing:** ∀ i, `assets[i].balanceOf(vault) ≥ totalSupply × _units[i] / 1e18`. (redeem selalu solvent)
- **INV2 — no drain:** token keluar vault CUMA lewat (a) redeem ke redeemer, (b) swap ke `router` pas rebalance. Gak ada jalur lain. Gak ada `transfer` arbitrer.
- **INV3 — redeem liveness:** `redeem()` gak pernah revert karena aksi admin (gak ada pause di redeem).
- **INV4 — whitelist tertutup:** set aset fixed saat deploy; rebalance gak bisa masukin aset non-whitelist.
- **INV5 — batas guardian:** guardian cuma bisa: pause *mint*, turunin cap (≤ ceiling), ganti feeRecipient, ganti rebalancer. **Gak bisa: sentuh saldo, ubah units, pause redeem.**

### Immutable vs guardian vs agent
| Dikunci selamanya | Guardian bisa ubah | Agent (rebalancer) bisa |
|---|---|---|
| set aset, router, oracle, mintFeeBps, ceiling, guardrail | mintPaused, supplyCap(↓), feeRecipient, rebalancer | `_units` (via rebalance ber-guardrail doang) |

---

## 2. Spec agent (ini yang bikin Virtuals valid)

- **Keputusan otonom:** (1) bobot target tiap aset (momentum), (2) sizing swap tiap rebalance, (3) timing dalam window (cooldown mingguan + trigger drift > cap).
- **Trigger:** jadwal mingguan **atau** total drift > threshold. Bukan permintaan user.
- **Batas kewenangan:** cuma bisa panggil `rebalance`. **Gak bisa** mint/redeem/withdraw/ubah guardian.
- **Policy gate = KONTRAK.** Slippage, turnover, whitelist, cooldown, backing di-enforce on-chain. **Walau model agent ngaco/adversarial, kontrak nolak apapun yang langgar guardrail.** Agent gak perlu dipercaya buat keamanan dana — cuma buat kualitas keputusan.
- **Custody:** key user gak pernah dipegang server. Rebalancer = **session key terbatas** yang cuma bisa `rebalance`. Kalau key bocor → attacker paling banter bisa rebalance jelek dalam guardrail (rugi slippage kecil), **gak bisa narik dana.**
- **ACP framework:** declare framework agent di Agent Registry (mis. G.A.M.E / custom). [TBD saat setup Virtuals]
- **Agent mati → dana aman?** ✅ Ya. Redeem in-kind selalu jalan tanpa agent. Vault beku di bobot terakhir, user tetap bisa keluar penuh. **Buktiin di test:** `redeem` sukses setelah rebalancer di-set address(0).

---

## 3. Threat model (jujur, ditulis duluan)

### Diwarisi (gak bisa gue hapus)
- **Issuer RHJ:** stock token = debt instrument Robinhood Jersey; mereka bisa **freeze**. Kalau 1 konstituen freeze → redeem aset itu revert (all-or-nothing, sama kayak Vimen). ⚠️ akui.
- **Oracle Chainlink:** dipake buat cek slippage/turnover pas rebalance. Stale/manipulated feed → agent bisa lolosin rebalance yang value-nya turun. Mitigasi: Chainlink + bound ketat; **oracle TIDAK dipake buat mint/redeem** (itu in-kind, gak butuh harga).
- **Sequencer RHC tunggal (Robinhood) + Virtuals (token di Base).**

### Gue ciptain
- **Kompleksitas rebalance + dependency router** — permukaan risiko terbesar. Swap bisa kena MEV/slippage. Mitigasi: minOut per swap, slippage+turnover cap on-chain, cooldown.
- **Agent key (rebalancer)** — kalau bocor, bisa rebalance jelek (rugi kecil dalam guardrail). Gak bisa narik dana (INV2). Mitigasi: session key, guardian bisa ganti rebalancer instan.
- **Oracle manipulation window** — lihat atas.

### Gak bisa dihapus (akui)
- **Freeze issuer bikin redeem macet all-or-nothing** — keputusan produk (LOCKED 17 Jul): `redeem` tetap in-kind semua aset, satu freeze = seluruh basket tunggu unfreeze. Alternatif partial-per-asset ditolak karena: (1) bank-run inversi (yang tunggu terakhir dapat aset frozen lebih banyak), (2) butuh oracle di redeem → buka MEV & manipulation, (3) +100 LOC & permukaan bug permanen buat kasus yang jarang & sementara. Kebukti di test `FidesVaultFreezeTest`: revert bersih, state utuh. Messaging publik: "konsekuensi debt instrument RH Jersey, sama untuk semua produk yang pegang stock token RHC."
- Trust ke Chainlink buat guardrail rebalance.
- Rebalance = swap = pasti ada slippage (biaya nyata).

---

## 4. Test plan (bar: 107 test Vimen)
- **Unit** — tiap fungsi publik ≥ 1 test (mint, redeem, rebalance, tiap setter, akses kontrol).
- **Fuzz** — mint/redeem jumlah acak; rebalance param acak.
- **Invariant** — INV1 backing gak pernah pecah lewat sekuens acak mint/redeem/rebalance. INV2 no-drain.
- **Fork** — lawan stock token RHC mainnet asli (alamat di konsep-fides.md).
- **Agent sim (adversarial)** — rebalance yang: masukin aset non-whitelist → revert; slippage > cap → revert; turnover > cap → revert; sebelum cooldown → revert; berhasil nurunin backing → revert.
- **Liveness** — redeem sukses walau mintPaused=true & rebalancer=address(0).
- CI: `forge fmt --check` + `forge test` tiap push.

## 5. Milestone (Standard Launch, bukan Genesis)
```
[x] Spec + invariant tertulis           ← ini
[ ] FidesVault.sol + test lengkap (107+)
[ ] Agent runtime + policy gate + test adversarial
[ ] Testnet RHC (46630) end-to-end
[ ] Deploy mainnet + VERIFY source (wajib, bukan opsional)
[ ] Cap kecil ($ rendah) → naik bertahap
[ ] Audit sebelum cap gede
[ ] Standard Launch di Virtuals (bikin agent ~100 VIRTUAL, Green dev-lock)
[ ] UI wiring (Next.js + wagmi) — PALING AKHIR
```

## 6. Jangan jadi 🟡 deployed-idle
- **Tx nyata pertama:** dev (kita) mint basket AI pertama di testnet, publish rationale rebalance perdana.
- **Siapa eksekusi & kenapa:** kita — buat bootstrap track record on-chain yang bisa diikutin (build-in-public), sebelum ada user luar.
- **Nol user minggu 1:** kalau produk jalan tapi sepi → **masalah distribusi**, bukan produk. Solusi: xyapper + build-in-public dari commit pertama (udah siap).

## 7. Naratif launch
- **Pitch 1 kalimat:** "Managed stock indexes on Robinhood Chain — every rebalance published on-chain, and the agent can't touch your funds."
- **Kontras incumbent:** Vimen = basket pasif, produk nganggur (3 holder) → Fides aktif + kepake. Vimen akui sendiri "no rebalance, weights drift" → **kita justru rebalance-nya, transparan.** The Index = 1 EOA pegang treasury → Fides custody trustless.
- **Bukti:** tx rebalance on-chain + track record agent + source verified + (nanti) audit.
- **Sosial:** build-in-public dari commit pertama (@FidesFi). Jangan launch dari nol footprint.
