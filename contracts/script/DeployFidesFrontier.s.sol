// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {FidesVault} from "../src/FidesVault.sol";
import {FidesUniV4Router} from "../src/FidesUniV4Router.sol";
import {IPoolManager, PoolKey, Currency} from "../src/interfaces/IUniswapV4Minimal.sol";

/// @notice Deploys the Fides Frontier basket (6 AI/semi stocks) + its Uniswap v4 router adapter on
///         Robinhood Chain, then wires every asset<->asset swap route through a common quote currency.
///
/// All RHC-specific addresses come from env (see script/DEPLOY.md) so nothing is hardcoded to guesses.
/// Missing/zero values revert loudly, listing what still needs filling. Run:
///   forge script script/DeployFidesFrontier.s.sol:DeployFidesFrontier \
///     --rpc-url $RHC_RPC --private-key $PK --broadcast
///
/// Note: mint/redeem go live the moment the vault is deployed. Routes only matter once the agent
/// starts rebalancing, so a partial deploy (no routes) is still a usable product.
contract DeployFidesFrontier is Script {
    // Fides Frontier universe (order fixed; edit here to change the basket).
    string[6] internal SYMS = ["NVDA", "AMD", "MU", "PLTR", "GOOGL", "SPCX"];

    function run() external {
        // --- shared / infra addresses ---
        address poolManager = vm.envAddress("FIDES_POOL_MANAGER"); // RHC Uniswap v4 PoolManager
        address quote = vm.envAddress("FIDES_QUOTE"); // USD-like currency with v4 liquidity vs each stock
        address owner = vm.envAddress("FIDES_OWNER"); // router owner (sets routes)

        // --- per-asset addresses (token + Chainlink aggregator + initial unit per 1e18 shares) ---
        address[] memory tokens = new address[](6);
        address[] memory oracles = new address[](6);
        uint256[] memory units = new uint256[](6);
        for (uint256 i; i < 6; ++i) {
            tokens[i] = vm.envAddress(_v(SYMS[i], "TOKEN"));
            oracles[i] = vm.envAddress(_v(SYMS[i], "ORACLE"));
            units[i] = vm.envUint(_v(SYMS[i], "UNIT"));
        }

        // --- vault guardrails / roles ---
        FidesVault.Config memory cfg = FidesVault.Config({
            supplyCeiling: vm.envUint("FIDES_SUPPLY_CEILING"),
            supplyCap: vm.envUint("FIDES_SUPPLY_CAP"),
            mintFeeBps: uint16(vm.envUint("FIDES_MINT_FEE_BPS")),
            maxSlippageBps: uint16(vm.envUint("FIDES_MAX_SLIPPAGE_BPS")),
            maxTurnoverBps: uint16(vm.envUint("FIDES_MAX_TURNOVER_BPS")),
            rebalanceCooldown: uint64(vm.envUint("FIDES_REBALANCE_COOLDOWN")),
            guardian: vm.envAddress("FIDES_GUARDIAN"),
            rebalancer: vm.envAddress("FIDES_REBALANCER"),
            feeRecipient: vm.envAddress("FIDES_FEE_RECIPIENT"),
            router: address(0) // set after router is deployed
        });

        // shared v4 pool params for each stock<->quote pool
        uint24 poolFee = uint24(vm.envUint("FIDES_POOL_FEE"));
        int24 poolSpacing = int24(int256(vm.envUint("FIDES_POOL_SPACING")));
        address poolHooks = vm.envOr("FIDES_POOL_HOOKS", address(0));

        vm.startBroadcast();

        FidesUniV4Router router = new FidesUniV4Router(IPoolManager(poolManager), owner);
        cfg.router = address(router);

        FidesVault vault = new FidesVault("Fides Frontier", "fFRNT", tokens, units, oracles, cfg);

        _wireRoutesViaQuote(router, tokens, quote, poolFee, poolSpacing, poolHooks);

        vm.stopBroadcast();

        console2.log("FidesUniV4Router:", address(router));
        console2.log("FidesVault (Frontier):", address(vault));
    }

    /// @dev register a<->b routes for every ordered pair, hopping through the quote currency.
    function _wireRoutesViaQuote(
        FidesUniV4Router router,
        address[] memory tokens,
        address quote,
        uint24 fee,
        int24 spacing,
        address hooks
    ) internal {
        for (uint256 i; i < tokens.length; ++i) {
            for (uint256 j; j < tokens.length; ++j) {
                if (i == j) continue;
                FidesUniV4Router.Hop[] memory hops = new FidesUniV4Router.Hop[](2);
                hops[0] = _hop(tokens[i], quote, fee, spacing, hooks);
                hops[1] = _hop(quote, tokens[j], fee, spacing, hooks);
                router.setRoute(tokens[i], tokens[j], hops);
            }
        }
    }

    function _hop(address from, address to, uint24 fee, int24 spacing, address hooks)
        internal
        pure
        returns (FidesUniV4Router.Hop memory)
    {
        (address c0, address c1) = from < to ? (from, to) : (to, from);
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(c0), currency1: Currency.wrap(c1), fee: fee, tickSpacing: spacing, hooks: hooks
        });
        return FidesUniV4Router.Hop({key: key, zeroForOne: from < to});
    }

    function _v(string memory sym, string memory field) internal pure returns (string memory) {
        return string.concat("FIDES_", sym, "_", field);
    }
}
