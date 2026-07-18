// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {FidesVault} from "../src/FidesVault.sol";
import {FidesVaultTestBase, MockToken, MockOracle, MockRouter} from "./FidesVault.t.sol";

// ===========================================================================
// Boundary tests — prove guardrails are tight to the exact wei / bps / second
// ===========================================================================

contract FidesVaultBoundaryTest is FidesVaultTestBase {
    function setUp() public {
        _deployVault(0, 100, 5_000, DEFAULT_CAP);
    }

    function testCooldownBoundaryExactSecondPasses() public {
        _mintShares(alice, 100e18);
        _seedRouter(assetB, 1_000e18);
        router.setRate(address(assetA), address(assetB), 10_000);

        // First rebalance stamps lastRebalance = block.timestamp.
        vm.warp(block.timestamp + COOLDOWN + 1);
        vm.prank(rebalancer);
        vault.rebalance(_oneSwap(address(assetA), address(assetB), 5e18, 5e18), keccak256("first"));

        // Warp to exactly lastRebalance + COOLDOWN — cooldown uses `<`, so this is legal.
        vm.warp(uint256(vault.lastRebalance()) + COOLDOWN);
        vm.prank(rebalancer);
        vault.rebalance(_oneSwap(address(assetA), address(assetB), 5e18, 5e18), keccak256("boundary"));
    }

    function testCooldownBoundaryOneSecondEarlyReverts() public {
        _mintShares(alice, 100e18);
        _seedRouter(assetB, 1_000e18);
        router.setRate(address(assetA), address(assetB), 10_000);

        vm.warp(block.timestamp + COOLDOWN + 1);
        vm.prank(rebalancer);
        vault.rebalance(_oneSwap(address(assetA), address(assetB), 5e18, 5e18), keccak256("first"));

        vm.warp(uint256(vault.lastRebalance()) + COOLDOWN - 1);
        vm.prank(rebalancer);
        vm.expectRevert(FidesVault.Cooldown.selector);
        vault.rebalance(_oneSwap(address(assetA), address(assetB), 5e18, 5e18), keccak256("too-early"));
    }

    function testSlippageBoundaryExactCapPasses() public {
        // maxSlippageBps = 100 → allowed navAfter/navBefore ≥ 99%.
        // 100e18 A swapped at rate 9600 → 96e18 B → nav drops from 400e18 to 396e18 (exactly 1%).
        _mintShares(alice, 100e18);
        _seedRouter(assetB, 1_000e18);
        router.setRate(address(assetA), address(assetB), 9_600);

        vm.warp(block.timestamp + COOLDOWN + 1);
        vm.prank(rebalancer);
        vault.rebalance(_oneSwap(address(assetA), address(assetB), 100e18, 96e18), keccak256("edge"));

        assertEq(vault.nav(), 396e18);
        assertTrue(vault.isFullyBacked());
    }

    function testSlippageBoundaryOneBpsBeyondReverts() public {
        // Rate 9599 → 95.99e18 out → nav 395.99e18 → 1.0025% drop → over cap.
        _mintShares(alice, 100e18);
        _seedRouter(assetB, 1_000e18);
        router.setRate(address(assetA), address(assetB), 9_599);

        vm.warp(block.timestamp + COOLDOWN + 1);
        vm.expectRevert(FidesVault.SlippageTooHigh.selector);
        vm.prank(rebalancer);
        vault.rebalance(_oneSwap(address(assetA), address(assetB), 100e18, 0), keccak256("bleed"));
    }

    function testTurnoverBoundaryExactCapPasses() public {
        // maxTurnoverBps = 1000 → allowed turnover ≤ 10% of nav (40e18 of a 400e18 nav).
        _deployVault(0, 100, 1_000, DEFAULT_CAP);
        _mintShares(alice, 100e18);
        _seedRouter(assetB, 1_000e18);
        router.setRate(address(assetA), address(assetB), 10_000);

        vm.warp(block.timestamp + COOLDOWN + 1);
        vm.prank(rebalancer);
        vault.rebalance(_oneSwap(address(assetA), address(assetB), 40e18, 40e18), keccak256("edge"));

        assertTrue(vault.isFullyBacked());
    }

    function testTurnoverBoundaryOneWeiBeyondReverts() public {
        _deployVault(0, 100, 1_000, DEFAULT_CAP);
        _mintShares(alice, 100e18);
        _seedRouter(assetB, 1_000e18);
        router.setRate(address(assetA), address(assetB), 10_000);

        vm.warp(block.timestamp + COOLDOWN + 1);
        vm.expectRevert(FidesVault.TurnoverTooHigh.selector);
        vm.prank(rebalancer);
        vault.rebalance(_oneSwap(address(assetA), address(assetB), 40e18 + 1, 40e18), keccak256("beyond"));
    }
}

// ===========================================================================
// Reentrant router — proves function-level access control is enough
// (vault doesn't need a reentrancy guard because every re-entry hits a check)
// ===========================================================================

contract ReentrantRouter {
    using SafeERC20 for IERC20;

    FidesVault public vault;
    bytes public reentryCallData;

    error Reentered();

    function arm(FidesVault vault_, bytes calldata callData) external {
        vault = vault_;
        reentryCallData = callData;
    }

    function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256) external returns (uint256) {
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenOut).safeTransfer(msg.sender, amountIn);

        // Try to re-enter the vault mid-swap. Every path should be blocked.
        (bool ok, bytes memory returned) = address(vault).call(reentryCallData);
        if (ok) revert Reentered(); // if reentry succeeded, the test must fail
        // bubble the inner revert selector up so we can assert on it
        assembly {
            revert(add(returned, 0x20), mload(returned))
        }
    }
}

contract FidesVaultReentrancyTest is FidesVaultTestBase {
    ReentrantRouter internal evilRouter;

    function setUp() public {
        assetA = new MockToken("Stock A", "A", 18);
        assetB = new MockToken("Stock B", "B", 18);
        assetC = new MockToken("Stock C", "C", 18);
        oracleA = new MockOracle(1e8, 8);
        oracleB = new MockOracle(1e8, 8);
        evilRouter = new ReentrantRouter();

        FidesVault.Config memory cfg = FidesVault.Config({
            supplyCeiling: SUPPLY_CEILING,
            supplyCap: DEFAULT_CAP,
            mintFeeBps: 0,
            maxSlippageBps: 500,
            maxTurnoverBps: 10_000,
            rebalanceCooldown: COOLDOWN,
            guardian: guardian,
            rebalancer: rebalancer,
            feeRecipient: feeRecipient,
            router: address(evilRouter)
        });

        vault = new FidesVault("Reentrant", "REEN", _newAssets(), _newUnits(), _newOracles(), cfg);
    }

    function testReentrancyIntoRebalanceIsBlockedByAccessControl() public {
        _mintShares(alice, 100e18);
        assetB.mint(address(evilRouter), 1_000e18);

        // Arm the router to try calling rebalance() from within its own swap.
        FidesVault.Swap[] memory innerSwap = _oneSwap(address(assetB), address(assetA), 1e18, 1e18);
        bytes memory reentry = abi.encodeCall(FidesVault.rebalance, (innerSwap, keccak256("reentry")));
        evilRouter.arm(vault, reentry);

        vm.warp(block.timestamp + COOLDOWN + 1);
        vm.expectRevert(FidesVault.NotRebalancer.selector);
        vm.prank(rebalancer);
        vault.rebalance(_oneSwap(address(assetA), address(assetB), 5e18, 5e18), keccak256("outer"));
    }

    function testReentrancyIntoRedeemStillGoverned() public {
        _mintShares(alice, 100e18);
        assetB.mint(address(evilRouter), 1_000e18);

        // Router (which holds zero shares) tries to redeem 1 share → burn reverts.
        bytes memory reentry = abi.encodeCall(FidesVault.redeem, (1, address(evilRouter)));
        evilRouter.arm(vault, reentry);

        vm.warp(block.timestamp + COOLDOWN + 1);
        vm.expectRevert(); // OZ ERC20InsufficientBalance
        vm.prank(rebalancer);
        vault.rebalance(_oneSwap(address(assetA), address(assetB), 5e18, 5e18), keccak256("outer"));
    }
}

// ===========================================================================
// Freeze scenario — matches the "issuer RHJ can freeze" threat in SPEC.md.
// Verifies redeem/mint/rebalance behave predictably (all-or-nothing) when
// one asset stops honoring transfers.
// ===========================================================================

contract FreezableToken is ERC20 {
    bool public frozen;

    constructor() ERC20("Freezable", "FRZ") {}

    function setFrozen(bool frozen_) external {
        frozen = frozen_;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 value) internal override {
        require(!frozen, "TOKEN_FROZEN");
        super._update(from, to, value);
    }
}

contract FidesVaultFreezeTest is Test {
    uint256 internal constant UNIT_A = 15e17;
    uint256 internal constant UNIT_B = 25e17;

    address internal guardian = address(0xA11CE);
    address internal rebalancer = address(0xB0B);
    address internal feeRecipient = address(0xFEE);
    address internal alice = address(0xA1A1);

    FreezableToken internal frzA;
    MockToken internal assetB;
    MockOracle internal oracleA;
    MockOracle internal oracleB;
    MockRouter internal router;
    FidesVault internal vault;

    function setUp() public {
        frzA = new FreezableToken();
        assetB = new MockToken("Stock B", "B", 18);
        oracleA = new MockOracle(1e8, 8);
        oracleB = new MockOracle(1e8, 8);
        router = new MockRouter();

        address[] memory assets = new address[](2);
        assets[0] = address(frzA);
        assets[1] = address(assetB);
        uint256[] memory units_ = new uint256[](2);
        units_[0] = UNIT_A;
        units_[1] = UNIT_B;
        address[] memory oracles = new address[](2);
        oracles[0] = address(oracleA);
        oracles[1] = address(oracleB);

        FidesVault.Config memory cfg = FidesVault.Config({
            supplyCeiling: 1_000_000e18,
            supplyCap: 1_000e18,
            mintFeeBps: 0,
            maxSlippageBps: 100,
            maxTurnoverBps: 5_000,
            rebalanceCooldown: 1 days,
            guardian: guardian,
            rebalancer: rebalancer,
            feeRecipient: feeRecipient,
            router: address(router)
        });
        vault = new FidesVault("Freeze", "FRZ-VLT", assets, units_, oracles, cfg);
    }

    function _fundAndMint(uint256 shares) internal {
        uint256 needA = (shares * UNIT_A + 1e18 - 1) / 1e18;
        uint256 needB = (shares * UNIT_B + 1e18 - 1) / 1e18;
        frzA.mint(alice, needA);
        assetB.mint(alice, needB);

        vm.startPrank(alice);
        frzA.approve(address(vault), type(uint256).max);
        assetB.approve(address(vault), type(uint256).max);
        vault.mint(shares, alice);
        vm.stopPrank();
    }

    function testFrozenAssetBlocksRedeemAllOrNothing() public {
        _fundAndMint(10e18);
        frzA.setFrozen(true);

        uint256 sharesBefore = vault.balanceOf(alice);
        uint256 balABefore = frzA.balanceOf(address(vault));
        uint256 balBBefore = assetB.balanceOf(address(vault));

        vm.expectRevert(bytes("TOKEN_FROZEN"));
        vm.prank(alice);
        vault.redeem(5e18, alice);

        // Full revert → vault state unchanged, no partial payout.
        assertEq(vault.balanceOf(alice), sharesBefore);
        assertEq(frzA.balanceOf(address(vault)), balABefore);
        assertEq(assetB.balanceOf(address(vault)), balBBefore);
    }

    function testFrozenAssetBlocksMint() public {
        // Fund BEFORE freezing (freeze also blocks minting since _update handles both).
        frzA.mint(alice, 100e18);
        assetB.mint(alice, 100e18);
        frzA.setFrozen(true);

        vm.startPrank(alice);
        frzA.approve(address(vault), type(uint256).max);
        assetB.approve(address(vault), type(uint256).max);
        vm.expectRevert(bytes("TOKEN_FROZEN"));
        vault.mint(1e18, alice);
        vm.stopPrank();
    }

    function testFrozenAssetBlocksRebalance() public {
        _fundAndMint(10e18);
        assetB.mint(address(router), 1_000e18);
        router.setRate(address(frzA), address(assetB), 10_000);

        frzA.setFrozen(true);

        FidesVault.Swap[] memory swaps = new FidesVault.Swap[](1);
        swaps[0] = FidesVault.Swap(address(frzA), address(assetB), 1e18, 1e18);

        vm.warp(block.timestamp + 1 days + 1);
        vm.expectRevert(bytes("TOKEN_FROZEN"));
        vm.prank(rebalancer);
        vault.rebalance(swaps, keccak256("try"));
    }
}

// ===========================================================================
// Fuzz: no matter what rate the router returns, either the swap succeeds
// AND the vault stays fully backed, or it reverts and state is unchanged.
// ===========================================================================

contract FidesVaultAdversarialRateFuzzTest is FidesVaultTestBase {
    function setUp() public {
        _deployVault(0, 200, 5_000, DEFAULT_CAP);
    }

    function testFuzzAdversarialRateNeverBreaksBacking(uint16 rawRate) public {
        _mintShares(alice, 100e18);
        _seedRouter(assetB, 1_000_000e18);

        // Rate ∈ [1, 20_000] bps: 0.01× up to 2× — includes both drain-attempt and windfall.
        uint256 rate = bound(uint256(rawRate), 1, 20_000);
        router.setRate(address(assetA), address(assetB), rate);

        vm.warp(block.timestamp + COOLDOWN + 1);
        FidesVault.Swap[] memory swaps = _oneSwap(address(assetA), address(assetB), 20e18, 0);

        uint256 balABefore = assetA.balanceOf(address(vault));
        uint256 balBBefore = assetB.balanceOf(address(vault));

        vm.prank(rebalancer);
        (bool ok,) = address(vault).call(abi.encodeCall(FidesVault.rebalance, (swaps, keccak256("fuzz"))));

        assertTrue(vault.isFullyBacked());
        if (!ok) {
            // Guardrail rejected the rate → state must be identical.
            assertEq(assetA.balanceOf(address(vault)), balABefore);
            assertEq(assetB.balanceOf(address(vault)), balBBefore);
        }
    }
}
