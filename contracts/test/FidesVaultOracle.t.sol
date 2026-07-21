// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {FidesVault} from "../src/FidesVault.sol";
import {MockToken, MockOracle, MockRouter} from "./FidesVault.t.sol";

/// L2 sequencer uptime feed mock: answer 0 = up, 1 = down; startedAt = when the status last changed.
contract MockSequencer {
    int256 public status;
    uint256 public startedAt;

    constructor(int256 s, uint256 startedAt_) {
        status = s;
        startedAt = startedAt_;
    }

    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        return (0, status, startedAt, block.timestamp, 0);
    }

    function decimals() external pure returns (uint8) {
        return 0;
    }
}

/// Mainnet oracle-safety guards: staleness + L2 sequencer liveness.
contract FidesVaultOracleTest is Test {
    MockToken internal assetA;
    MockOracle internal oracleA;
    MockRouter internal router;

    address internal guardian = address(0xA11CE);
    address internal feeRecipient = address(0xFEE);
    address internal alice = address(0xA1A1);

    function _deploy(uint64 maxAge, address seqFeed) internal returns (FidesVault v) {
        assetA = new MockToken("A", "A", 18);
        oracleA = new MockOracle(1e8, 8); // $1, 8 decimals
        router = new MockRouter();
        address[] memory assets = new address[](1);
        assets[0] = address(assetA);
        uint256[] memory units = new uint256[](1);
        units[0] = 1e18;
        address[] memory oracles = new address[](1);
        oracles[0] = address(oracleA);
        FidesVault.Config memory cfg = FidesVault.Config({
            supplyCeiling: 1_000_000e18,
            supplyCap: 1_000e18,
            mintFeeBps: 0,
            maxSlippageBps: 500,
            maxTurnoverBps: 5000,
            rebalanceCooldown: 1 days,
            maxOracleAge: maxAge,
            sequencerUptimeFeed: seqFeed,
            guardian: guardian,
            rebalancer: guardian,
            feeRecipient: feeRecipient,
            router: address(router)
        });
        v = new FidesVault("V", "V", assets, units, oracles, cfg);
    }

    function _mint1(FidesVault v) internal {
        assetA.mint(alice, 1e18);
        vm.startPrank(alice);
        assetA.approve(address(v), type(uint256).max);
        v.mint(1e18, alice);
        vm.stopPrank();
    }

    function test_constructor_rejectsZeroMaxOracleAge() public {
        assetA = new MockToken("A", "A", 18);
        oracleA = new MockOracle(1e8, 8);
        router = new MockRouter();
        address[] memory assets = new address[](1);
        assets[0] = address(assetA);
        uint256[] memory units = new uint256[](1);
        units[0] = 1e18;
        address[] memory oracles = new address[](1);
        oracles[0] = address(oracleA);
        FidesVault.Config memory cfg = FidesVault.Config({
            supplyCeiling: 1_000_000e18,
            supplyCap: 1_000e18,
            mintFeeBps: 0,
            maxSlippageBps: 500,
            maxTurnoverBps: 5000,
            rebalanceCooldown: 1 days,
            maxOracleAge: 0, // invalid
            sequencerUptimeFeed: address(0),
            guardian: guardian,
            rebalancer: guardian,
            feeRecipient: feeRecipient,
            router: address(router)
        });
        vm.expectRevert(FidesVault.BadConfig.selector);
        new FidesVault("V", "V", assets, units, oracles, cfg);
    }

    function test_stalePrice_revertsNav() public {
        vm.warp(1_000_000);
        FidesVault v = _deploy(1 hours, address(0));
        oracleA.setUpdatedAt(block.timestamp);
        _mint1(v);
        assertGt(v.nav(), 0); // fresh -> ok

        vm.warp(block.timestamp + 1 hours + 1);
        vm.expectRevert(FidesVault.StalePrice.selector);
        v.nav();
    }

    function test_freshAfterWarp_ok() public {
        vm.warp(1_000_000);
        FidesVault v = _deploy(1 hours, address(0));
        _mint1(v);
        vm.warp(block.timestamp + 2 hours);
        oracleA.setUpdatedAt(block.timestamp); // feed refreshed
        assertGt(v.nav(), 0);
    }

    function test_badPrice_revertsNav() public {
        vm.warp(1_000_000);
        FidesVault v = _deploy(type(uint64).max, address(0));
        oracleA.setUpdatedAt(block.timestamp);
        _mint1(v);
        oracleA.setAnswer(0);
        vm.expectRevert(FidesVault.BadPrice.selector);
        v.nav();
    }

    function test_sequencerDown_reverts() public {
        vm.warp(1_000_000);
        MockSequencer seq = new MockSequencer(1, 0); // down
        FidesVault v = _deploy(type(uint64).max, address(seq));
        oracleA.setUpdatedAt(block.timestamp);
        _mint1(v);
        vm.expectRevert(FidesVault.SequencerDown.selector);
        v.nav();
    }

    function test_sequencerJustRestarted_withinGrace_reverts() public {
        vm.warp(1_000_000);
        MockSequencer seq = new MockSequencer(0, block.timestamp); // up, but just came back
        FidesVault v = _deploy(type(uint64).max, address(seq));
        oracleA.setUpdatedAt(block.timestamp);
        _mint1(v);
        vm.expectRevert(FidesVault.SequencerDown.selector);
        v.nav();
    }

    function test_sequencerUp_afterGrace_ok() public {
        vm.warp(1_000_000);
        MockSequencer seq = new MockSequencer(0, 1); // up, restarted long ago
        FidesVault v = _deploy(type(uint64).max, address(seq));
        oracleA.setUpdatedAt(block.timestamp);
        _mint1(v);
        assertGt(v.nav(), 0);
    }

    // redeem must survive a stale oracle / sequencer downtime — it never reads a price (INV3).
    function test_redeem_worksEvenWhenOracleStale() public {
        vm.warp(1_000_000);
        FidesVault v = _deploy(1 hours, address(0));
        oracleA.setUpdatedAt(block.timestamp);
        _mint1(v);
        vm.warp(block.timestamp + 10 hours); // oracle now stale

        vm.prank(alice);
        v.redeem(1e18, alice); // no revert
        assertEq(assetA.balanceOf(alice), 1e18);
    }
}
