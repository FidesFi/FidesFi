// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {FidesZapper, IFidesVault, IZapRouter} from "../src/FidesZapper.sol";
import {FidesZapRouter} from "../src/FidesZapRouter.sol";
import {IPoolManager, PoolKey, Currency} from "../src/interfaces/IUniswapV4Minimal.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Deploys the one-click USDG zapper for a live FidesVault:
///         FidesZapRouter (exact-out/in single-hop v4) with each stock's verified USDG pool wired,
///         then FidesZapper pointed at the live vault. Pure periphery — no vault roles involved.
///
/// Env (same frontier.env used for the vault deploy, plus FIDES_VAULT_ADDRESS):
///   forge script script/DeployFidesZapper.s.sol:DeployFidesZapper \
///     --rpc-url <RHC> --account fides-deployer --broadcast --legacy --gas-estimate-multiplier 300
contract DeployFidesZapper is Script {
    function run() external {
        string[] memory syms = vm.envOr("FIDES_SYMBOLS", ",", _defaultSyms());
        address poolManager = vm.envAddress("FIDES_POOL_MANAGER");
        address usdg = vm.envAddress("FIDES_QUOTE");
        address owner = vm.envAddress("FIDES_OWNER");
        address vault = vm.envAddress("FIDES_VAULT_ADDRESS");
        address hooks = vm.envOr("FIDES_POOL_HOOKS", address(0));

        vm.startBroadcast();
        (, address broadcaster,) = vm.readCallers();

        // router starts owned by the broadcaster so pool wiring succeeds, then hands over
        FidesZapRouter zapRouter = new FidesZapRouter(IPoolManager(poolManager), usdg, broadcaster);
        for (uint256 i; i < syms.length; ++i) {
            address stock = vm.envAddress(_v(syms[i], "TOKEN"));
            uint24 fee = uint24(vm.envOr(_v(syms[i], "POOLFEE"), uint256(3000)));
            int24 spacing = int24(int256(vm.envOr(_v(syms[i], "POOLSPACING"), uint256(60))));
            (address c0, address c1) = usdg < stock ? (usdg, stock) : (stock, usdg);
            zapRouter.setPool(
                stock,
                PoolKey({
                    currency0: Currency.wrap(c0),
                    currency1: Currency.wrap(c1),
                    fee: fee,
                    tickSpacing: spacing,
                    hooks: hooks
                })
            );
        }
        if (owner != broadcaster) zapRouter.transferOwnership(owner);

        FidesZapper zapper = new FidesZapper(IFidesVault(vault), IERC20(usdg), IZapRouter(address(zapRouter)));

        vm.stopBroadcast();

        console2.log("FidesZapRouter:", address(zapRouter));
        console2.log("FidesZapper:", address(zapper));
    }

    function _v(string memory sym, string memory field) internal pure returns (string memory) {
        return string.concat("FIDES_", sym, "_", field);
    }

    function _defaultSyms() internal pure returns (string[] memory s) {
        s = new string[](5);
        s[0] = "NVDA";
        s[1] = "MSFT";
        s[2] = "TSLA";
        s[3] = "GOOGL";
        s[4] = "SPCX";
    }
}
