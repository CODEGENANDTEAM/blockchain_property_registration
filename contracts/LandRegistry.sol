// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract LandRegistry {
    struct Property {
        string propertyId;
        address owner;
        bool isRegistered;
    }

    mapping(string => Property) public properties;
    event PropertyRegistered(string propertyId, address owner);
    event PropertyTransferred(string propertyId, address from, address to);

    function registerProperty(string memory _propertyId) public {
        require(!properties[_propertyId].isRegistered, "Already registered");
        properties[_propertyId] = Property(_propertyId, msg.sender, true);
        emit PropertyRegistered(_propertyId, msg.sender);
    }

    function transferProperty(string memory _propertyId, address _newOwner) public {
        require(properties[_propertyId].owner == msg.sender, "Not the owner");
        properties[_propertyId].owner = _newOwner;
        emit PropertyTransferred(_propertyId, msg.sender, _newOwner);
    }
}