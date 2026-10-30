// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AirnodeV2Attestation} from "../contracts/AirnodeV2Attestation.sol";
import {FlightDelayCover} from "../contracts/FlightDelayCover.sol";
import {AirnodeV2Test} from "./utils/AirnodeV2Test.sol";

contract FlightDelayCoverTest is AirnodeV2Test {
    // Stand-ins for the hashes of two flightStatusOnDate requests, such as XX123 and XX456 on the same date. Real hashes
    // come from `npm run request-hash`; the contract treats them as opaque.
    bytes32 constant INSURED_REQUEST = keccak256("flightStatusOnDate XX123 2026-10-29");
    bytes32 constant OTHER_REQUEST = keccak256("flightStatusOnDate XX456 2026-10-29");

    // Arrived 3h 12m after the scheduled arrival.
    bytes constant LATE_ARRIVAL =
        '{"actualArrival":"2026-10-29 17:24Z","scheduledArrival":"2026-10-29 14:12Z","status":"Arrived"}';
    bytes constant SLIGHTLY_LATE_ARRIVAL =
        '{"actualArrival":"2026-10-29 14:24Z","scheduledArrival":"2026-10-29 14:12Z","status":"Arrived"}';
    bytes constant STILL_FLYING =
        '{"actualArrival":"2026-10-29 17:24Z","scheduledArrival":"2026-10-29 14:12Z","status":"EnRoute"}';

    string constant PAYOUT_ADDRESS = "addr_test1qptraveller";
    uint256 constant MAX_RESPONSE_AGE = 1 hours;
    uint256 constant RESPONSE_TIMESTAMP = 1_792_900_000;

    address airnode;
    uint256 airnodeKey;
    FlightDelayCover cover;
    uint256 policyId;

    function setUp() public {
        (airnode, airnodeKey) = makeAddrAndKey("aerodatabox-airnode");
        cover = new FlightDelayCover(airnode, MAX_RESPONSE_AGE);
        policyId = cover.createPolicy(INSURED_REQUEST, 180, 250e6, PAYOUT_ADDRESS);
        vm.warp(RESPONSE_TIMESTAMP + 10);
    }

    function test_PaysOutWhenTheDelayReachesTheThreshold() public {
        vm.expectEmit(address(cover));
        emit FlightDelayCover.PolicySettled(policyId, FlightDelayCover.Status.PaidOut, 192, 250e6, PAYOUT_ADDRESS);
        (FlightDelayCover.Status status, uint256 delayMinutes) = settleSigned(INSURED_REQUEST, LATE_ARRIVAL);

        assertEq(uint8(status), uint8(FlightDelayCover.Status.PaidOut));
        assertEq(delayMinutes, 192);
        assertEq(uint8(cover.getPolicy(policyId).status), uint8(FlightDelayCover.Status.PaidOut));
    }

    function test_ExpiresWithoutPayoutWhenTheDelayIsShort() public {
        vm.expectEmit(address(cover));
        emit FlightDelayCover.PolicySettled(policyId, FlightDelayCover.Status.Expired, 12, 0, PAYOUT_ADDRESS);
        settleSigned(INSURED_REQUEST, SLIGHTLY_LATE_ARRIVAL);
    }

    function test_RevertWhen_ThePolicyIsSettledTwice() public {
        settleSigned(INSURED_REQUEST, LATE_ARRIVAL);

        vm.expectRevert(abi.encodeWithSelector(FlightDelayCover.PolicyNotActive.selector, policyId));
        settleSigned(INSURED_REQUEST, LATE_ARRIVAL);
    }

    function test_RevertWhen_TheFlightHasNotLanded() public {
        vm.expectRevert(abi.encodeWithSelector(FlightDelayCover.FlightNotLanded.selector, "EnRoute"));
        settleSigned(INSURED_REQUEST, STILL_FLYING);
    }

    function test_RevertWhen_SomeoneElseCreatesAPolicy() public {
        vm.prank(makeAddr("stranger"));
        vm.expectRevert(FlightDelayCover.NotInsurer.selector);
        cover.createPolicy(INSURED_REQUEST, 0, 1e18, PAYOUT_ADDRESS);
    }

    // The next four tests are the tamper test from the API3 track brief.

    function test_Tamper_RevertWhen_AValueIsEdited() public {
        // Signed for an on-time arrival, then edited to look 3h 12m late
        bytes memory onTime =
            '{"actualArrival":"2026-10-29 14:12Z","scheduledArrival":"2026-10-29 14:12Z","status":"Arrived"}';
        bytes memory signature = signResponse(airnodeKey, INSURED_REQUEST, RESPONSE_TIMESTAMP, onTime);

        vm.expectPartialRevert(AirnodeV2Attestation.NotSignedByAirnode.selector);
        cover.settle(policyId, RESPONSE_TIMESTAMP, LATE_ARRIVAL, signature);
    }

    function test_Tamper_RevertWhen_TheResponseIsTooOld() public {
        vm.warp(RESPONSE_TIMESTAMP + MAX_RESPONSE_AGE + 1);

        vm.expectRevert(abi.encodeWithSelector(FlightDelayCover.ResponseTooOld.selector, RESPONSE_TIMESTAMP));
        settleSigned(INSURED_REQUEST, LATE_ARRIVAL);
    }

    function test_Tamper_RevertWhen_TheResponseAnswersAnotherRequest() public {
        // A genuine response from the right Airnode, but for another flight that was late
        vm.expectPartialRevert(AirnodeV2Attestation.NotSignedByAirnode.selector);
        settleSigned(OTHER_REQUEST, LATE_ARRIVAL);
    }

    function test_Tamper_RevertWhen_AnotherKeySigned() public {
        (address impostor, uint256 impostorKey) = makeAddrAndKey("impostor");
        bytes memory signature = signResponse(impostorKey, INSURED_REQUEST, RESPONSE_TIMESTAMP, LATE_ARRIVAL);

        vm.expectRevert(abi.encodeWithSelector(AirnodeV2Attestation.NotSignedByAirnode.selector, impostor));
        cover.settle(policyId, RESPONSE_TIMESTAMP, LATE_ARRIVAL, signature);
    }

    function settleSigned(bytes32 requestHash, bytes memory data)
        internal
        returns (FlightDelayCover.Status, uint256)
    {
        bytes memory signature = signResponse(airnodeKey, requestHash, RESPONSE_TIMESTAMP, data);
        return cover.settle(policyId, RESPONSE_TIMESTAMP, data, signature);
    }
}
