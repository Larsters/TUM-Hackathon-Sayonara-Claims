// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AirnodeV2Attestation} from "./AirnodeV2Attestation.sol";
import {ProjectedJson} from "./ProjectedJson.sol";

/// @title Settles flight-delay policies from flight status that the AeroDataBox Airnode v2 signed
/// @notice The insurer registers a policy for one flight on one date. After the flight lands, anyone (the traveller,
/// a keeper bot or an agent) submits the signed flight status. The contract checks the signer, the request and the
/// time itself, computes the delay and settles the policy once: `PaidOut` if the delay reaches the threshold,
/// `Expired` otherwise. The payout itself is sent on Cardano by a keeper that watches `PolicySettled`.
/// @dev Each policy stores the hash of its own request: `flightStatusOnDate` for its flight number and date, with a
/// projection to `status`, `scheduledArrival` and `actualArrival`. The hash fixes the flight, the date and the fields,
/// so a response for any other flight or date recovers a different signer and is rejected.
contract FlightDelayCover {
    enum Status {
        None,
        Active,
        PaidOut,
        Expired
    }

    struct Policy {
        bytes32 requestHash;
        uint32 delayThresholdMinutes;
        uint256 payoutAmount;
        string payoutAddress;
        Status status;
    }

    /// @notice Address that the AeroDataBox Airnode v2 signs with, from the x-airnode extension of the document at
    /// https://airnode-aerodatabox.fly.dev/
    address public immutable airnode;

    /// @notice Longest time from the Airnode signing a response to the contract accepting it
    uint256 public immutable maxResponseAge;

    address public immutable insurer;

    uint256 public policyCount;
    mapping(uint256 policyId => Policy) private policies;

    event PolicyCreated(
        uint256 indexed policyId,
        bytes32 requestHash,
        uint32 delayThresholdMinutes,
        uint256 payoutAmount,
        string payoutAddress
    );
    event PolicySettled(
        uint256 indexed policyId, Status status, uint256 delayMinutes, uint256 payoutAmount, string payoutAddress
    );

    error NotInsurer();
    error PolicyNotActive(uint256 policyId);
    error ResponseTooOld(uint256 responseTimestamp);
    error ResponseFromTheFuture(uint256 responseTimestamp);
    error FlightNotLanded(string flightStatus);

    constructor(address airnode_, uint256 maxResponseAge_) {
        airnode = airnode_;
        maxResponseAge = maxResponseAge_;
        insurer = msg.sender;
    }

    /// @notice Registers a policy that pays `payoutAmount` to `payoutAddress` if the flight arrives at least
    /// `delayThresholdMinutes` late
    /// @param requestHash Hash of the flightStatusOnDate request for the insured flight and date
    /// @param payoutAddress Cardano address of the traveller, where the keeper sends the payout
    function createPolicy(
        bytes32 requestHash,
        uint32 delayThresholdMinutes,
        uint256 payoutAmount,
        string calldata payoutAddress
    ) external returns (uint256 policyId) {
        if (msg.sender != insurer) revert NotInsurer();
        policyId = ++policyCount;
        policies[policyId] = Policy(requestHash, delayThresholdMinutes, payoutAmount, payoutAddress, Status.Active);
        emit PolicyCreated(policyId, requestHash, delayThresholdMinutes, payoutAmount, payoutAddress);
    }

    /// @notice Settles a policy with a signed response for its flight
    /// @param timestamp `timestamp` of the response
    /// @param data `data` of the response, as the JSON string that the Airnode signed
    /// @param signature `signature` of the response
    function settle(uint256 policyId, uint256 timestamp, bytes calldata data, bytes calldata signature)
        external
        returns (Status status, uint256 delayMinutes)
    {
        Policy storage policy = policies[policyId];
        // Settling changes the status, so a policy settles once, however often a response is submitted.
        if (policy.status != Status.Active) revert PolicyNotActive(policyId);

        // The signer and the request. The policy's own request hash goes into the digest, so a response for another
        // flight or date recovers a different signer.
        AirnodeV2Attestation.verify(airnode, policy.requestHash, timestamp, data, signature);

        // The time. The signature covers the timestamp, so the timestamp is trustworthy from here on.
        if (timestamp + maxResponseAge < block.timestamp) revert ResponseTooOld(timestamp);
        if (timestamp > block.timestamp) revert ResponseFromTheFuture(timestamp);

        // The data. Only a landed flight has a final arrival time; an estimate must not settle the policy.
        string memory flightStatus = ProjectedJson.readString(data, "status");
        if (keccak256(bytes(flightStatus)) != keccak256("Arrived")) revert FlightNotLanded(flightStatus);
        uint256 scheduledArrival = ProjectedJson.readTimestamp(data, "scheduledArrival");
        uint256 actualArrival = ProjectedJson.readTimestamp(data, "actualArrival");
        delayMinutes = actualArrival > scheduledArrival ? (actualArrival - scheduledArrival) / 1 minutes : 0;

        status = delayMinutes >= policy.delayThresholdMinutes ? Status.PaidOut : Status.Expired;
        policy.status = status;
        emit PolicySettled(
            policyId, status, delayMinutes, status == Status.PaidOut ? policy.payoutAmount : 0, policy.payoutAddress
        );
    }

    function getPolicy(uint256 policyId) external view returns (Policy memory) {
        return policies[policyId];
    }
}
