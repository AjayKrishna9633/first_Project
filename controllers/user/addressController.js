import Address from '../../models/AddressModal.js';

const AddressPage = async(req, res) => {
    try {
        const userId = req.session.user.id;
        const userAddresses = await Address.findOne({ userId: userId });
        const addresses = userAddresses ? userAddresses.address : [];

        res.render('user/addressPage', {
            addresses: addresses,
            user: req.session.user,
            hideHeaderSearch: true
        });

    } catch(error) {
        console.log(error, "error while getting the address page");
        res.redirect('/profile');
    }
};

const addAddress = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { name, streetAddress, city, state, pinCode, phone, altPhone, addressType } = req.body;

        if (!name || !streetAddress || !city || !state || !pinCode || !phone || !addressType) {
            return res.json({
                success: false,
                message: 'All required fields must be filled'
            });
        }

        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(phone)) {
            return res.json({
                success: false,
                message: 'Please enter a valid 10-digit phone number'
            });
        }

        const pincodeRegex = /^[1-9][0-9]{5}$/;
        if (!pincodeRegex.test(pinCode)) {
            return res.json({
                success: false,
                message: 'Please enter a valid 6-digit pincode'
            });
        }

        if (altPhone && !phoneRegex.test(altPhone)) {
            return res.json({
                success: false,
                message: 'Please enter a valid alternate phone number'
            });
        }

        const newAddressData = {
            name: name.trim(),
            streetAddress: streetAddress.trim(),
            city: city.trim(),
            state: state.trim(),
            pinCode: parseInt(pinCode),
            phone: parseInt(phone),
            altPhone: altPhone ? parseInt(altPhone) : null,
            addressType,
            isDefault: false
        };

        let userAddresses = await Address.findOne({ userId });

        if (userAddresses) {
            userAddresses.address.push(newAddressData);
            await userAddresses.save();
        } else {
            userAddresses = new Address({
                userId,
                address: [newAddressData]
            });
            await userAddresses.save();
        }

        res.json({
            success: true,
            message: 'Address added successfully'
        });

    } catch (error) {
        console.error('Add address error:', error);
        res.json({
            success: false,
            message: error.message || 'Failed to add address'
        });
    }
};

const getEditAddress = async(req, res) => {
    try {
        const userId = req.session.user.id;
        const addressId = req.params.id;

        const userAddresses = await Address.findOne({ userId });
        
        if (!userAddresses) {
            return res.status(404).json({ success: false, message: 'Address not found' });
        }

        const address = userAddresses.address.id(addressId);
        
        if (!address) {
            return res.status(404).json({ success: false, message: 'Address not found' });
        }

        res.json({
            success: true,
            address: address
        });

    } catch(error) {
        console.error('Get edit address error:', error);
        res.status(500).json({ success: false, message: 'Failed to get address' });
    }
};

const updateAddress = async(req, res) => {
    try {
        const userId = req.session.user.id;
        const addressId = req.params.id;
        const { name, streetAddress, city, state, pinCode, phone, altPhone, addressType } = req.body;

        // Validation
        if (!name || !streetAddress || !city || !state || !pinCode || !phone || !addressType) {
            return res.status(400).json({
                success: false,
                message: 'All required fields must be filled'
            });
        }

        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid 10-digit phone number'
            });
        }

        const pincodeRegex = /^[1-9][0-9]{5}$/;
        if (!pincodeRegex.test(pinCode)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid 6-digit pincode'
            });
        }

        if (altPhone && !phoneRegex.test(altPhone)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid alternate phone number'
            });
        }

        const result = await Address.updateOne(
            { userId, 'address._id': addressId },
            {
                $set: {
                    'address.$.name': name.trim(),
                    'address.$.streetAddress': streetAddress.trim(),
                    'address.$.city': city.trim(),
                    'address.$.state': state.trim(),
                    'address.$.pinCode': parseInt(pinCode),
                    'address.$.phone': parseInt(phone),
                    'address.$.altPhone': altPhone ? parseInt(altPhone) : null,
                    'address.$.addressType': addressType
                }
            }
        );

        if (result.modifiedCount > 0) {
            res.status(200).json({
                success: true,
                message: 'Address updated successfully'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Address not found'
            });
        }

    } catch(error) {
        console.error('Update address error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update address'
        });
    }
};

const deleteAddress = async(req, res) => {
    try {
        const userId = req.session.user.id;
        const addressId = req.params.id;

        const result = await Address.updateOne(
            { userId },
            { $pull: { address: { _id: addressId } } }
        );

        if (result.modifiedCount > 0) {
            res.status(200).json({
                success: true,
                message: 'Address deleted successfully'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Address not found'
            });
        }

    } catch(error) {
        console.error('Delete address error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete address'
        });
    }
};

export default { 
    AddressPage,
    addAddress,
    getEditAddress,
    updateAddress,
    deleteAddress
};
