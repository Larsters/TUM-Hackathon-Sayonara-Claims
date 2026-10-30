// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AirnodeV2Attestation} from "../contracts/AirnodeV2Attestation.sol";
import {FlightDelayCover} from "../contracts/FlightDelayCover.sol";
import {AirnodeV2Test} from "./utils/AirnodeV2Test.sol";

/// @notice The tamper test against real responses that the AeroDataBox Airnode v2 signed on 30 Oct 2026:
/// LH 501 Rio de Janeiro → Frankfurt, which arrived 7h 08m late, and LH 901 London → Frankfurt.
contract FlightDelayCoverRealResponseTest is AirnodeV2Test {
    struct SignedResponse {
        bytes32 requestHash;
        uint256 timestamp;
        bytes data;
        bytes signature;
    }

    address constant AERODATABOX_AIRNODE_V2 = 0x83FE2E8F24E66520B1902C3507De4F471248f2Ec;
    uint256 constant MAX_RESPONSE_AGE = 2 hours;

    SignedResponse lh501;
    FlightDelayCover cover;
    uint256 policyId;

    function setUp() public {
        lh501 = readFixture("aerodatabox-lh501-2026-10-29.json");
        cover = new FlightDelayCover(AERODATABOX_AIRNODE_V2, MAX_RESPONSE_AGE);
        // The request hash that `npm run flight -- hash LH501 2026-10-29` prints, so the policy is for this flight
        policyId = cover.createPolicy(lh501.requestHash, 180, 50e6, "addr_test1qptraveller");
        vm.warp(lh501.timestamp + 10);
    }

    function test_PaysOutFromTheRealResponse() public {
        // {"actualArrival":"2026-10-30 13:03Z","scheduledArrival":"2026-10-30 05:55Z","status":"Arrived"}
        (FlightDelayCover.Status status, uint256 delayMinutes) =
            cover.settle(policyId, lh501.timestamp, lh501.data, lh501.signature);

        assertEq(uint8(status), uint8(FlightDelayCover.Status.PaidOut));
        assertEq(delayMinutes, 428);
    }

    function test_Tamper_RevertWhen_TheRealResponseIsEdited() public {
        bytes memory edited =
            '{"actualArrival":"2026-10-30 06:03Z","scheduledArrival":"2026-10-30 05:55Z","status":"Arrived"}';

        vm.expectPartialRevert(AirnodeV2Attestation.NotSignedByAirnode.selector);
        cover.settle(policyId, lh501.timestamp, edited, lh501.signature);
    }

    function test_Tamper_RevertWhen_TheRealResponseIsTooOld() public {
        vm.warp(lh501.timestamp + MAX_RESPONSE_AGE + 1);

        vm.expectRevert(abi.encodeWithSelector(FlightDelayCover.ResponseTooOld.selector, lh501.timestamp));
        cover.settle(policyId, lh501.timestamp, lh501.data, lh501.signature);
    }

    function test_Tamper_RevertWhen_TheRealResponseIsForAnotherFlight() public {
        SignedResponse memory lh901 = readFixture("aerodatabox-lh901-2026-10-30.json");
        vm.warp(lh901.timestamp + 10);

        vm.expectPartialRevert(AirnodeV2Attestation.NotSignedByAirnode.selector);
        cover.settle(policyId, lh901.timestamp, lh901.data, lh901.signature);
    }

    function test_Tamper_RevertWhen_AnotherKeySignedTheRealData() public {
        (address impostor, uint256 impostorKey) = makeAddrAndKey("impostor");
        bytes memory signature = signResponse(impostorKey, lh501.requestHash, lh501.timestamp, lh501.data);

        vm.expectRevert(abi.encodeWithSelector(AirnodeV2Attestation.NotSignedByAirnode.selector, impostor));
        cover.settle(policyId, lh501.timestamp, lh501.data, signature);
    }

    function readFixture(string memory fileName) internal view returns (SignedResponse memory) {
        string memory json = vm.readFile(string.concat(vm.projectRoot(), "/test/fixtures/", fileName));
        return SignedResponse({
            requestHash: vm.parseJsonBytes32(json, ".requestHash"),
            timestamp: vm.parseUint(vm.parseJsonString(json, ".timestamp")),
            data: bytes(vm.parseJsonString(json, ".data")),
            signature: vm.parseJsonBytes(json, ".signature")
        });
    }
}
